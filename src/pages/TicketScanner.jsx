import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import GeminiScanner from '../components/GeminiScanner';

const TicketScanner = () => {
  const [scannedItems, setScannedItems] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]);
  const [user, setUser] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Lógica de Paginación ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      const { data: s } = await supabase.from('supermarkets').select('id, name');
      setSupermarkets(s || []);
    };
    init();
  }, []);

  const handleDataExtracted = (data) => {
    const { items, supermarket, date } = data;
    const batchId = Math.random().toString(36).substr(2, 9);

    const matchedSuper = supermarkets.find(s => 
      s.name.toUpperCase().includes(supermarket.toUpperCase()) || 
      supermarket.toUpperCase().includes(s.name.toUpperCase())
    );

    if (!matchedSuper) {
      alert(`No se reconoció el supermercado: ${supermarket}. Debe existir en la BD.`);
      return;
    }

    const newItems = items.map(item => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      supermarket_id: matchedSuper.id,
      supermarket_name: matchedSuper.name,
      purchase_date: date,
      batch_id: batchId
    }));

    setScannedItems(newItems);
    setCurrentPage(1); // Resetear a la primera página tras nuevo escaneo
    setShowSuccess(false);
  };

  const removeItem = (id) => {
    const updatedItems = scannedItems.filter(item => item.id !== id);
    setScannedItems(updatedItems);
    
    // Si borramos el último item de una página, retrocedemos una
    const totalPages = Math.ceil(updatedItems.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
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
      setTimeout(() => setShowSuccess(false), 5000);
    } else {
      alert("Error al enviar las sugerencias");
    }
  };

  // Cálculos para la paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = scannedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(scannedItems.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <header>
          <h1 className="text-4xl font-black tracking-tighter text-zinc-200">Escanear Ticket</h1>
          <p className="text-zinc-500 text-sm font-medium">Los productos serán enviados a revisión por un moderador</p>
        </header>

        <GeminiScanner onDataExtracted={handleDataExtracted} />

        {showSuccess && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-2xl text-center font-bold">
            ¡Sugerencias enviadas con éxito! Un editor las revisará pronto.
          </div>
        )}

        {scannedItems.length > 0 && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Productos detectados ({scannedItems.length})
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 mr-2">
                  PÁGINA {currentPage} DE {totalPages}
                </span>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-30"
                >
                  ←
                </button>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {currentItems.map((item) => (
                <div key={item.id} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-zinc-100 font-bold">{item.raw_text}</span>
                    <span className="text-[10px] text-zinc-500 uppercase font-black">{item.supermarket_name} • {item.purchase_date}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-black text-white">{item.suggested_price.toFixed(2)}€</span>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 space-y-4">
              <button 
                onClick={submitSuggestions}
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${
                  loading 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {loading ? 'Enviando...' : `Sugerir ${scannedItems.length} Precios`}
              </button>
              
              <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">
                Nota: Se enviarán todos los productos de la lista, no solo los de la página actual.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default TicketScanner;