import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import { Link2, Check, X, Receipt } from 'lucide-react'; 

const AdminReview = () => {
  const [pendingItems, setPendingItems] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, product_prices ( price, supermarket_id )')
        .order('name');
      
      setDbProducts(products || []);

      const { data: suggestions, error: sugError } = await supabase
        .from('price_suggestions')
        .select(`*, supermarkets ( name )`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (sugError) throw sugError;
      if (!suggestions || suggestions.length === 0) {
        setPendingItems([]);
        return;
      }

      // Consulta manual de emails (auth.users -> public.users)
      const userIds = [...new Set(suggestions.map(s => s.user_id))].filter(Boolean);
      let usersMap = {};
      if (userIds.length > 0) {
        const { data: userData } = await supabase.from('users').select('id, email').in('id', userIds);
        if (userData) {
          usersMap = userData.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.email }), {});
        }
      }

      // Auto-lookup de alias
      const rawTexts = suggestions.map(s => s.raw_text);
      const { data: aliases } = await supabase
        .from('product_aliases')
        .select('ticket_text, product_id, supermarket_id')
        .in('ticket_text', rawTexts);

      const itemsProcessed = suggestions.map(item => {
        const matchingAlias = aliases?.find(a => 
          a.ticket_text === item.raw_text && a.supermarket_id === item.supermarket_id
        );
        return {
          ...item,
          user_email: usersMap[item.user_id] || "Usuario desconocido",
          selected_product_id: matchingAlias ? matchingAlias.product_id : (item.product_id || ""),
          isLinked: !!matchingAlias
        };
      });

      setPendingItems(itemsProcessed);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (id, newProductId) => {
    setPendingItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected_product_id: newProductId } : item
    ));
  };

  const handleOnlyLink = async (item) => {
    if (!item.selected_product_id) {
      alert("Selecciona un producto primero.");
      return;
    }

    try {
      const { error } = await supabase.from('product_aliases').upsert({
        ticket_text: item.raw_text,
        product_id: item.selected_product_id,
        supermarket_id: item.supermarket_id,
        is_verified: true
      }, { onConflict: 'ticket_text, supermarket_id' });

      if (error) throw error;
      
      setPendingItems(prev => prev.map(p => 
        p.id === item.id ? { ...p, isLinked: true } : p
      ));
      
    } catch (error) {
      console.error("Error al vincular:", error);
      alert("Error al crear el vínculo.");
    }
  };

  const handleAccept = async (item) => {
    if (!item.selected_product_id) {
      alert("Selecciona un producto oficial.");
      return;
    }

    try {
      await Promise.all([
        supabase.from('product_aliases').upsert({
          ticket_text: item.raw_text,
          product_id: item.selected_product_id,
          supermarket_id: item.supermarket_id,
          is_verified: true
        }, { onConflict: 'ticket_text, supermarket_id' }),

        supabase.from('product_prices').upsert({
          product_id: item.selected_product_id,
          supermarket_id: item.supermarket_id,
          price: item.suggested_price
        }, { onConflict: 'product_id, supermarket_id' }),

        supabase.from('price_suggestions')
          .update({ status: 'approved', product_id: item.selected_product_id })
          .eq('id', item.id)
      ]);

      // Refrescamos visualmente quitando el item aceptado sin recargar toda la BD
      setPendingItems(prev => prev.filter(p => p.id !== item.id));
    } catch (error) {
      console.error("Error al aceptar:", error);
    }
  };

  const handleReject = async (id) => {
    // ELIMINADO EL window.confirm. Ahora es directo.
    try {
      await supabase.from('price_suggestions').update({ status: 'rejected' }).eq('id', id);
      // Filtramos el estado local para que desaparezca al instante
      setPendingItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error al rechazar:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <span className="text-yellow-400 text-lg font-mono tracking-widest animate-pulse">
          Cargando moderación...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
        
        <header>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-yellow-400">Moderación</h1>
          <p className="text-zinc-500 text-sm font-medium mt-1">Gestión de precios sugeridos por escáner de tickets</p>
        </header>

        {/* ESTADO VACÍO (Cuando no hay sugerencias) */}
        {pendingItems.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-12 flex flex-col items-center justify-center text-center mt-12">
            <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800 shadow-inner">
              <Receipt size={40} className="text-yellow-400/50" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-300 tracking-tight mb-2">Todo al día</h2>
            <p className="text-zinc-500 max-w-sm">
              No hay precios pendientes de revisión. Cuando los usuarios escaneen nuevos tickets, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingItems.map((item) => {
              const selectedProdData = dbProducts.find(p => String(p.id) === String(item.selected_product_id));
              const currentPrice = selectedProdData?.product_prices?.find(
                pp => pp.supermarket_id === item.supermarket_id
              )?.price || 0;

              return (
                <div key={item.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl flex flex-col lg:flex-row items-center gap-6 lg:gap-8 transition-all hover:border-zinc-700">
                  
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="px-3 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400 uppercase">
                        {item.supermarkets?.name} • {item.purchase_date}
                      </div>
                      <div className="px-3 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded-lg text-[10px] font-bold text-yellow-400">
                        {item.user_email}
                      </div>
                    </div>

                    <p className="text-lg font-bold text-zinc-100 italic">"{item.raw_text}"</p>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select 
                        className="flex-1 bg-black border border-zinc-800 p-3 rounded-xl text-sm font-bold text-zinc-300 outline-none focus:border-yellow-400 transition-colors"
                        value={item.selected_product_id}
                        onChange={(e) => handleProductChange(item.id, e.target.value)}
                      >
                        <option value="">Seleccionar producto oficial...</option>
                        {dbProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>

                      <button
                        onClick={() => handleOnlyLink(item)}
                        disabled={!item.selected_product_id}
                        className={`px-4 py-3 sm:py-0 rounded-xl border transition-all flex justify-center items-center gap-2 text-xs font-bold uppercase ${
                          item.isLinked 
                          ? 'border-green-500/50 bg-green-500/10 text-green-500' 
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-50'
                        }`}
                        title="Solo crear vínculo (Alias) sin aceptar precio"
                      >
                        <Link2 size={16} />
                        {item.isLinked ? 'Vinculado' : 'Vincular'}
                      </button>
                    </div>
                  </div>

                  {/* Precios */}
                  <div className="flex items-center gap-6 bg-black/50 p-5 rounded-2xl border border-zinc-800/80 w-full lg:w-auto justify-center">
                    <div className="text-center min-w-[80px]">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Sugerido</p>
                      <p className="text-2xl font-black text-yellow-400">{item.suggested_price?.toFixed(2)}€</p>
                    </div>
                    <div className="w-px h-10 bg-zinc-800" />
                    <div className="text-center min-w-[80px]">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Actual BD</p>
                      <p className="text-lg font-bold text-zinc-600">
                        {currentPrice > 0 ? `${parseFloat(currentPrice).toFixed(2)}€` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Acciones Finales de la sugerencia */}
                  <div className="flex gap-2 w-full lg:w-auto">
                    <button 
                      onClick={() => handleAccept(item)} 
                      className="flex-1 lg:w-16 h-14 lg:h-16 bg-yellow-400 text-black rounded-2xl hover:bg-yellow-300 transition-colors flex items-center justify-center shadow-lg shadow-yellow-400/10"
                      title="Aceptar Alias + Precio"
                    >
                      <Check size={26} strokeWidth={3} />
                    </button>
                    <button 
                      onClick={() => handleReject(item.id)} 
                      className="flex-1 lg:w-16 h-14 lg:h-16 bg-zinc-800 text-zinc-400 rounded-2xl border border-zinc-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center"
                      title="Descartar sugerencia"
                    >
                      <X size={26} strokeWidth={2} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReview;