import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import PdfScanner from '../components/PdfScanner';

const TicketScanner = () => {
  const [pendingItems, setPendingItems] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]);
  const [selectedSuper, setSelectedSuper] = useState("");
  const [user, setUser] = useState(null);

  const [userMap, setUserMap] = useState({});

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      const { data: p } = await supabase.from('products').select('id, name').order('name');
      const { data: s } = await supabase.from('supermarkets').select('id, name');
      setDbProducts(p || []);
      setSupermarkets(s || []);
      if (s?.length) setSelectedSuper(s[0].id);
      const { data: usersData } = await supabase
        .from('users') // Asegúrate que este es el nombre de tu tabla pública
        .select('id, name, email');
      
      // Creamos un objeto donde la clave es el ID y el valor es el email
      const map = {};
      usersData?.forEach(u => map[u.id] = u.email);
      setUserMap(map);

      fetchSuggestions();
    };
    init();
  }, []);

  const fetchSuggestions = async () => {
    try {
      // Primero: Traemos los usuarios de tu tabla pública
      const { data: usersData } = await supabase
        .from('users') // Tu tabla pública
        .select('id, email, name');

      const map = {};
      if (usersData) {
        usersData.forEach(u => {
          map[u.id] = u.email || u.name;
        });
      }
      setUserMap(map);

      // Segundo: Traemos las sugerencias
      const { data, error } = await supabase
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

      if (error) throw error;
      setPendingItems(data || []);

    } catch (err) {
      console.error("Error en carga:", err);
      setPendingItems([]); // Evita que se quede colgado
    }
  };

  const handleDataExtracted = async (items) => {
    if (!selectedSuper) return alert("Selecciona un súper");
    const { error } = await supabase.from('price_suggestions').insert(
      items.map(item => ({
        ...item,
        supermarket_id: selectedSuper,
        user_id: user?.id,
        status: 'pending'
      }))
    );
    if (!error) fetchSuggestions();
  };

  const handleAccept = async (item) => {
    if (!item.product_id) return alert("Asocia un producto primero");
    
    await supabase.from('product_aliases').upsert({
      ticket_text: item.raw_text,
      product_id: item.product_id,
      supermarket_id: item.supermarket_id,
      is_verified: true
    });

    await supabase.from('product_prices').upsert({
      product_id: item.product_id,
      supermarket_id: item.supermarket_id,
      price: item.suggested_price
    });

    await supabase.from('price_suggestions').update({ status: 'approved' }).eq('id', item.id);
    fetchSuggestions();
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-20">
      <div className="max-w-5xl mx-auto space-y-10">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-yellow-500">Scanner PDF</h1>
            <p className="text-zinc-500 font-medium">Validación de precios y sugerencias</p>
          </div>
          
          <div className="w-full md:w-64 space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Establecimiento</label>
            <select 
              value={selectedSuper} 
              onChange={(e) => setSelectedSuper(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-yellow-500/20 transition-all"
            >
              {supermarkets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </header>

        <PdfScanner onDataExtracted={handleDataExtracted} />

        <div className="space-y-4">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Sugerencias Pendientes ({pendingItems.length})</h2>
          
          {pendingItems.map((item) => {
            const currentPrice = item.products?.product_prices?.find(p => p.supermarket_id === item.supermarket_id)?.price || 0;

            return (
              <div key={item.id} className="bg-zinc-900/40 border border-zinc-800/50 p-5 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 group hover:bg-zinc-900 transition-all">
                
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                    <p className="text-lg font-bold tracking-tight">"{item.raw_text}"</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-600 uppercase">Asignar Producto</label>
                      <select 
                        className="w-full bg-black border border-zinc-800 p-2.5 rounded-xl text-xs font-bold text-zinc-300 outline-none focus:border-yellow-500"
                        value={item.product_id || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPendingItems(prev => prev.map(i => i.id === item.id ? {...i, product_id: val} : i));
                        }}
                      >
                        <option value="">Buscar en DB...</option>
                        {dbProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-600 uppercase">Sugerido por</label>
                      <div className="bg-zinc-800/30 p-2.5 rounded-xl text-[10px] font-mono text-zinc-400 truncate">
                        {/* Usamos el mapa con el user_id de la sugerencia */}
                        {userMap[item.user_id] || "Usuario del Sistema"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 px-8 py-4 bg-black/40 rounded-3xl border border-zinc-800/50">
                  <div className="text-center">
                    <p className="text-[9px] text-yellow-500 font-black uppercase mb-1">Precio Unit.</p>
                    <p className="text-2xl font-black text-white">{item.suggested_price?.toFixed(2)}€</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div className="text-center">
                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Actual App</p>
                    <p className="text-lg font-bold text-zinc-600">{currentPrice > 0 ? currentPrice.toFixed(2) + "€" : "N/A"}</p>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 w-full md:w-auto">
                  <button onClick={() => handleAccept(item)} className="flex-1 p-4 bg-white text-black rounded-2xl hover:bg-yellow-500 transition-all shadow-lg shadow-white/5 active:scale-95">
                    <span className="font-bold">✓</span>
                  </button>
                  <button onClick={() => {/* logic delete */}} className="flex-1 p-4 bg-zinc-800 text-zinc-500 rounded-2xl hover:bg-red-950 hover:text-red-500 transition-all active:scale-95">
                    <span className="font-bold">✕</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TicketScanner;