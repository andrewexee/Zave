import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

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
      // 1. Cargamos todos los productos oficiales (para el selector)
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .order('name');
      
      setDbProducts(products || []);

      // 2. Cargamos las sugerencias pendientes y sus relaciones
      const { data: suggestions } = await supabase
        .from('price_suggestions')
        .select(`
          *,
          supermarkets ( name ),
          products ( name, product_prices ( price, supermarket_id ) )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!suggestions || suggestions.length === 0) {
        setPendingItems([]);
        setLoading(false);
        return;
      }

      // 3. AUTO-LOOKUP: Buscamos si ya existen alias para estos textos
      const rawTexts = suggestions.map(s => s.raw_text);
      const { data: aliases } = await supabase
        .from('product_aliases')
        .select('ticket_text, product_id, supermarket_id')
        .in('ticket_text', rawTexts);

      // 4. Cruzamos los datos: Si hay un alias que coincide, pre-seleccionamos el producto
      const itemsWithAutoSelect = suggestions.map(item => {
        const matchingAlias = aliases?.find(a => 
          a.ticket_text === item.raw_text && a.supermarket_id === item.supermarket_id
        );
        
        return {
          ...item,
          // Si encontró un alias, usa ese product_id, si no, lo deja vacío para que el admin elija
          selected_product_id: matchingAlias ? matchingAlias.product_id : (item.product_id || "")
        };
      });

      setPendingItems(itemsWithAutoSelect);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (id, newProductId) => {
    setPendingItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected_product_id: newProductId } : item
    ));
  };

  const handleAccept = async (item) => {
    if (!item.selected_product_id) {
      alert("Debes seleccionar un producto oficial antes de aceptar.");
      return;
    }

    try {
      // Ejecutamos las 3 operaciones en paralelo para mayor rapidez
      await Promise.all([
        // 1. Crear o actualizar el Alias
        supabase.from('product_aliases').upsert({
          ticket_text: item.raw_text,
          product_id: item.selected_product_id,
          supermarket_id: item.supermarket_id,
          is_verified: true
        }, { onConflict: 'ticket_text, supermarket_id' }), // Asegúrate de que las constraints coincidan con tu BD

        // 2. Actualizar el precio oficial del producto en ese supermercado
        supabase.from('product_prices').upsert({
          product_id: item.selected_product_id,
          supermarket_id: item.supermarket_id,
          price: item.suggested_price
        }, { onConflict: 'product_id, supermarket_id' }),

        // 3. Marcar la sugerencia como aprobada
        supabase.from('price_suggestions')
          .update({ status: 'approved', product_id: item.selected_product_id })
          .eq('id', item.id)
      ]);

      // Refrescamos la lista para quitar el elemento aceptado
      fetchData();
    } catch (error) {
      console.error("Error al aceptar sugerencia:", error);
      alert("Hubo un error al guardar los cambios.");
    }
  };

  const handleReject = async (id) => {
    const confirmReject = window.confirm("¿Seguro que quieres descartar este precio?");
    if (!confirmReject) return;

    try {
      await supabase
        .from('price_suggestions')
        .update({ status: 'rejected' })
        .eq('id', id);
      
      // Filtramos localmente para que sea instantáneo sin recargar todo de nuevo
      setPendingItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error al rechazar:", error);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex justify-center items-center">Cargando revisión...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        <header>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-blue-400">Revisión de Precios</h1>
          <p className="text-zinc-500 text-sm font-medium">Asocia los productos detectados con la base de datos oficial</p>
        </header>

        {pendingItems.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-3xl text-center">
            <h2 className="text-xl font-bold text-zinc-400">Todo al día</h2>
            <p className="text-zinc-600">No hay tickets pendientes de revisión.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cola de moderación</h2>
              <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-500/30">
                {pendingItems.length} PENDIENTES
              </span>
            </div>
            
            <div className="grid gap-4">
              {pendingItems.map((item) => {
                // Buscamos el precio actual en la base de datos si es que ya existe
                const currentPrice = item.products?.product_prices?.find(
                  p => p.supermarket_id === item.supermarket_id
                )?.price || 0;

                // Verificamos si el componente hizo Auto-Select
                const isAutoSelected = !!item.selected_product_id;

                return (
                  <div key={item.id} className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl flex flex-col lg:flex-row items-center gap-8 transition-all hover:bg-zinc-900/80">
                    
                    <div className="flex-1 w-full space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400 uppercase">
                          {item.supermarkets?.name || "Desconocido"} • {item.purchase_date || "S/FECHA"}
                        </div>
                        <p className="text-lg font-bold text-zinc-100 italic">"{item.raw_text}"</p>
                      </div>
                      
                      <div className="w-full">
                        <select 
                          className={`w-full bg-black border p-3 rounded-xl text-sm font-bold outline-none transition-colors ${
                            isAutoSelected ? 'border-blue-500/50 text-blue-200' : 'border-zinc-800 text-zinc-300 focus:border-zinc-500'
                          }`}
                          value={item.selected_product_id}
                          onChange={(e) => handleProductChange(item.id, e.target.value)}
                        >
                          <option value="">Vincular con Producto Oficial...</option>
                          {dbProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        {isAutoSelected && (
                          <p className="text-[9px] text-blue-400 mt-2 font-bold uppercase tracking-widest pl-2">
                            ✓ Autoseleccionado por coincidencia previa
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 bg-black/40 p-5 rounded-2xl border border-zinc-800">
                      <div className="text-center min-w-[80px]">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1 tracking-tighter">Precio Sugerido</p>
                        <p className="text-2xl font-black text-white">{item.suggested_price?.toFixed(2)}€</p>
                      </div>
                      <div className="w-px h-10 bg-zinc-800" />
                      <div className="text-center min-w-[80px]">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1 tracking-tighter">Actual BD</p>
                        <p className="text-lg font-bold text-zinc-600">{currentPrice > 0 ? currentPrice.toFixed(2) + "€" : "—"}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full lg:w-auto">
                      <button 
                        onClick={() => handleAccept(item)} 
                        className="flex-1 lg:w-16 h-16 bg-blue-500 text-white rounded-2xl hover:bg-blue-400 transition-all flex items-center justify-center shadow-xl shadow-blue-500/20"
                        title="Aceptar y guardar en BD"
                      >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </button>
                      <button 
                        onClick={() => handleReject(item.id)}
                        className="flex-1 lg:w-16 h-16 bg-zinc-800 text-red-400 rounded-2xl hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center justify-center border border-zinc-700 hover:border-red-500/50"
                        title="Rechazar y descartar"
                      >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReview;