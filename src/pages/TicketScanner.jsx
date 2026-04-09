import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import GeminiScanner from '../components/GeminiScanner';

const TicketScanner = () => {
  const [pendingItems, setPendingItems] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Carga de maestros
      const [{ data: p }, { data: s }, { data: u }] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),
        supabase.from('supermarkets').select('id, name'),
        supabase.from('users').select('id, email')
      ]);

      setDbProducts(p || []);
      setSupermarkets(s || []);
      
      const map = {};
      u?.forEach(usr => map[usr.id] = usr.email);
      setUserMap(map);

      fetchSuggestions();
    };
    init();
  }, []);

  const fetchSuggestions = async () => {
    const { data } = await supabase
      .from('price_suggestions')
      .select(`
        *,
        products (
          name,
          product_prices ( price, supermarket_id )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingItems(data || []);
  };

  const handleDataExtracted = async (data) => {
    const { items, supermarket, date } = data;
    const batchId = Math.random().toString(36).substr(2, 9);

    // Mapeo automático de Supermercado por nombre
    const matchedSuper = supermarkets.find(s => 
      s.name.toUpperCase().includes(supermarket.toUpperCase()) || 
      supermarket.toUpperCase().includes(s.name.toUpperCase())
    );

    if (!matchedSuper) {
      alert(`No se reconoció el supermercado: ${supermarket}. Por favor, asegúrate de que existe en la base de datos.`);
      return;
    }

    const { error } = await supabase.from('price_suggestions').insert(
      items.map(item => ({
        raw_text: item.raw_text,
        suggested_price: item.suggested_price,
        supermarket_id: matchedSuper.id,
        purchase_date: date,
        user_id: user?.id,
        batch_id: batchId,
        status: 'pending'
      }))
    );

    if (!error) fetchSuggestions();
  };

  const handleAccept = async (item) => {
    if (!item.product_id) return alert("Asocia un producto");
    
    await Promise.all([
      supabase.from('product_aliases').upsert({
        ticket_text: item.raw_text,
        product_id: item.product_id,
        supermarket_id: item.supermarket_id,
        is_verified: true
      }),
      supabase.from('product_prices').upsert({
        product_id: item.product_id,
        supermarket_id: item.supermarket_id,
        price: item.suggested_price
      }),
      supabase.from('price_suggestions').update({ status: 'approved' }).eq('id', item.id)
    ]);
    fetchSuggestions();
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        <header>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-zinc-200">Gestión de Tickets</h1>
          <p className="text-zinc-500 text-sm font-medium">Validación de precios extraídos mediante IA</p>
        </header>

        <GeminiScanner onDataExtracted={handleDataExtracted} />

        <section className="space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Sugerencias Pendientes</h2>
            <span className="bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-bold text-zinc-400">{pendingItems.length}</span>
          </div>
          
          <div className="grid gap-4">
            {pendingItems.map((item) => {
              const currentPrice = item.products?.product_prices?.find(p => p.supermarket_id === item.supermarket_id)?.price || 0;

              return (
                <div key={item.id} className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl flex flex-col lg:flex-row items-center gap-8 transition-all hover:bg-zinc-900/60">
                  
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400">
                        {item.purchase_date || "S/FECHA"}
                      </div>
                      <p className="text-lg font-bold text-zinc-100 italic">"{item.raw_text}"</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select 
                        className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-xs font-bold outline-none focus:border-zinc-500"
                        value={item.product_id || ""}
                        onChange={(e) => setPendingItems(prev => prev.map(i => i.id === item.id ? {...i, product_id: e.target.value} : i))}
                      >
                        <option value="">Vincular con Producto...</option>
                        {dbProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <div className="bg-zinc-800/20 p-3 rounded-xl text-[10px] font-mono text-zinc-500 flex items-center">
                        <span className="mr-2 uppercase font-black text-zinc-600">Usuario:</span> {userMap[item.user_id] || "SISTEMA"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 bg-black/40 p-5 rounded-2xl border border-zinc-800">
                    <div className="text-center min-w-[80px]">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1 tracking-tighter">Precio Ticket</p>
                      <p className="text-2xl font-black text-white">{item.suggested_price?.toFixed(2)}€</p>
                    </div>
                    <div className="w-px h-10 bg-zinc-800" />
                    <div className="text-center min-w-[80px]">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1 tracking-tighter">Actual DB</p>
                      <p className="text-lg font-bold text-zinc-600">{currentPrice > 0 ? currentPrice.toFixed(2) + "€" : "—"}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full lg:w-auto">
                    <button onClick={() => handleAccept(item)} className="flex-1 lg:w-14 h-14 bg-zinc-100 text-black rounded-2xl hover:bg-white transition-all flex items-center justify-center shadow-xl shadow-white/5">
                      <span className="text-xl font-bold">+</span>
                    </button>
                    <button className="flex-1 lg:w-14 h-14 bg-zinc-800 text-zinc-400 rounded-2xl hover:bg-zinc-700 transition-all flex items-center justify-center">
                      <span className="text-xl font-bold">×</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default TicketScanner;