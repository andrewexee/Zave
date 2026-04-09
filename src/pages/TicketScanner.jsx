import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import GeminiScanner from '../components/GeminiScanner';

const TicketScanner = () => {
  // Ahora manejamos los items escaneados localmente antes de enviarlos
  const [scannedItems, setScannedItems] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]);
  const [user, setUser] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Solo necesitamos los supermercados para el mapeo inicial
      const { data: s } = await supabase.from('supermarkets').select('id, name');
      setSupermarkets(s || []);
    };
    init();
  }, []);

  const handleDataExtracted = (data) => {
    const { items, supermarket, date } = data;
    const batchId = Math.random().toString(36).substr(2, 9);

    // Mapeo automático de Supermercado
    const matchedSuper = supermarkets.find(s => 
      s.name.toUpperCase().includes(supermarket.toUpperCase()) || 
      supermarket.toUpperCase().includes(s.name.toUpperCase())
    );

    if (!matchedSuper) {
      alert(`No se reconoció el supermercado: ${supermarket}. Debe existir en la BD.`);
      return;
    }

    // Guardamos en el estado local para que el usuario revise
    const newItems = items.map(item => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9), // ID local para el borrado
      supermarket_id: matchedSuper.id,
      supermarket_name: matchedSuper.name,
      purchase_date: date,
      batch_id: batchId
    }));

    setScannedItems(newItems);
    setShowSuccess(false);
  };

  const removeItem = (id) => {
    setScannedItems(prev => prev.filter(item => item.id !== id));
  };

  const submitSuggestions = async () => {
    if (scannedItems.length === 0) return;
    setLoading(true);

    const { error } = await supabase.from('price_suggestions').insert(
      scannedItems.map(item => ({
        raw_text: item.raw_text,
        suggested_price: item.suggested_price,
        supermarket_id: item.supermarket_id,
        purchase_date: item.purchase_date,
        user_id: user?.id,
        batch_id: item.batch_id,
        status: 'pending'
      }))
    );

    setLoading(false);

    if (!error) {
      setScannedItems([]);
      setShowSuccess(true);
      // Ocultar mensaje de éxito tras 5 segundos
      setTimeout(() => setShowSuccess(false), 5000);
    } else {
      alert("Error al enviar las sugerencias");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <header>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-zinc-200">Escanear Ticket</h1>
          <p className="text-zinc-500 text-sm font-medium">Los productos serán enviados a revisión por un moderador</p>
        </header>

        <GeminiScanner onDataExtracted={handleDataExtracted} />

        {/* Mensaje de éxito */}
        {showSuccess && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-2xl text-center font-bold animate-pulse">
            ¡Sugerencias enviadas con éxito! Un editor las revisará pronto.
          </div>
        )}

        {/* Resumen de productos escaneados */}
        {scannedItems.length > 0 && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Productos detectados</h2>
              <span className="bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-bold text-zinc-400">
                {scannedItems.length} items
              </span>
            </div>

            <div className="grid gap-3">
              {scannedItems.map((item) => (
                <div key={item.id} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-zinc-100 font-bold">{item.raw_text}</span>
                    <span className="text-[10px] text-zinc-500 uppercase font-black">{item.supermarket_name} • {item.purchase_date}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-black text-white">{item.suggested_price.toFixed(2)}€</span>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                      title="Eliminar producto"
                    >
                      <span className="text-xl">×</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={submitSuggestions}
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${
                loading 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/5'
              }`}
            >
              {loading ? 'Enviando...' : 'Sugerir Precios'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

export default TicketScanner;