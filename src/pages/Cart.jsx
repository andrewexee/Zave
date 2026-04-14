import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';
import supabase from '../supabaseClient';
import { Trash2, ShoppingCart, Plus, Pencil, CheckCircle2, Circle, Trash } from 'lucide-react';

export default function Cart() {
  const { user } = useAuth();
  const { items, loading, removeItem, clearCart, updateSupermarket, toggleCheck, clearSupermarket } = useCartStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedSupermarket, setSelectedSupermarket] = useState('');
  const [products, setProducts] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { data: sm } = await supabase.from('supermarkets').select('*').order('name');
      setSupermarkets(sm ?? []);
      const { data: prod } = await supabase.from('products').select('id, name').order('name');
      setProducts(prod ?? []);
    };
    loadData();
  }, []);

  const formatWeight = (grams) => {
    if (!grams) return null;
    const g = parseFloat(grams);
    if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.', ',')} kg`;
    return `${g} g`;
  };

  const { grouped, ranking } = useMemo(() => {
    const groups = items.reduce((acc, item) => {
      const superId = item.supermarket_id;
      const superName = item.supermarkets?.name || 'Tienda';
      if (!acc[superId]) acc[superId] = { name: superName, categories: {}, totalItems: 0 };
      
      const catName = item.products?.categories?.name || 'General';
      const catColor = item.products?.categories?.color || '#71717a';
      
      if (!acc[superId].categories[catName]) {
        acc[superId].categories[catName] = { color: catColor, items: [] };
      }
      acc[superId].categories[catName].items.push(item);
      acc[superId].totalItems += 1;
      return acc;
    }, {});

    const sortedIds = Object.keys(groups).sort((a, b) => groups[b].totalItems - groups[a].totalItems);
    const rankMap = {};
    sortedIds.forEach((id, index) => { rankMap[id] = index + 1; });

    return { grouped: groups, ranking: rankMap };
  }, [items]);

  const openEditModal = (item) => {
    setEditingItem(item);
    setSelectedSupermarket(item.supermarket_id.toString());
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingItem || !selectedSupermarket || !user) return;
    await updateSupermarket(user.id, editingItem.id, parseInt(selectedSupermarket));
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleAddProduct = async () => {
    if (!selectedProduct || !user) return;
    setAdding(true);
    const { data: product } = await supabase.from('products').select('*, product_prices(*)').eq('id', selectedProduct).single();
    if (product) await useCartStore.getState().addItem(user.id, product);
    setAdding(false);
    setShowAddModal(false);
    setSelectedProduct('');
  };

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-yellow-400 font-mono animate-pulse uppercase tracking-widest text-sm">Sincronizando...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-40">
      <div className="max-w-2xl mx-auto space-y-10">
        
        {/* Header - Botones arreglados */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-zinc-900 pb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-yellow-400">Lista Compra</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">
              {items.length} productos • {Object.keys(grouped).length} paradas
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowAddModal(true)} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black px-6 py-4 rounded-2xl font-black uppercase text-xs transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus size={18} strokeWidth={3} className="shrink-0" />
              <span>Añadir</span>
            </button>
            <button 
              onClick={() => clearCart(user.id)} 
              className="flex-1 sm:flex-none border border-zinc-800 text-zinc-400 hover:text-red-400 px-6 py-4 rounded-2xl font-bold uppercase text-[10px] transition-all active:scale-95 whitespace-nowrap"
            >
              Vaciar
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <ShoppingCart size={40} className="text-zinc-800 mb-4" />
            <p className="text-zinc-600 font-bold uppercase text-[10px] tracking-widest">Lista vacía</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([superId, data]) => (
              <section key={superId} className="bg-zinc-900/90 border border-zinc-800/60 rounded-[35px] overflow-hidden shadow-2xl">
                {/* Cabecera Supermercado */}
                <div className="flex items-center justify-between p-6 md:p-8 bg-zinc-800/30 border-b border-zinc-800/50">
                  <div className="flex items-center gap-4">
                    <span className="bg-yellow-400 text-black text-[11px] font-black w-7 h-7 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-400/20">
                      #{ranking[superId]}
                    </span>
                    <h2 className="text-lg font-black uppercase tracking-tight text-white italic">
                      {data.name}
                    </h2>
                  </div>
                  <button 
                    onClick={() => clearSupermarket(user.id, parseInt(superId))} 
                    className="text-zinc-400 hover:text-red-500 transition-colors p-2.5 bg-black/20 rounded-xl border border-zinc-800"
                  >
                    <Trash size={16} />
                  </button>
                </div>

                {/* Lista de Productos Estilo Lista */}
                <div className="p-2 md:p-4 space-y-6">
                  {Object.entries(data.categories).map(([catName, catData]) => (
                    <div key={catName} className="space-y-1">
                      <h3 className="px-4 text-[9px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: catData.color }}>
                        {catName}
                      </h3>
                      <div className="divide-y divide-zinc-800/30">
                        {catData.items.map((item) => {
                          const priceData = item.products?.product_prices?.find(p => p.supermarket_id === item.supermarket_id);
                          const isChecked = item.is_checked;
                          const weightLabel = formatWeight(item.products?.weight_grams);

                          return (
                            <div key={item.id} className={`group flex items-center gap-4 px-4 py-3 transition-all ${isChecked ? 'opacity-30' : 'hover:bg-white/5'}`}>
                              <button onClick={() => toggleCheck(user.id, item.id, isChecked)} className={`shrink-0 transition-colors ${isChecked ? 'text-yellow-400' : 'text-zinc-700 hover:text-zinc-500'}`}>
                                {isChecked ? <CheckCircle2 size={38} /> : <Circle size={38} />}
                              </button>

                              <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-[15px] truncate transition-all ${
                                  isChecked 
                                  ? 'text-zinc-500 line-through decoration-yellow-500 decoration-[3px]' 
                                  : 'text-zinc-100'
                                }`}>
                                  {item.products?.name}
                                </h4>
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">
                                  {weightLabel && <span>{weightLabel}</span>}
                                  {weightLabel && <span className="text-zinc-800">•</span>}
                                  <span className={isChecked ? '' : 'text-yellow-400/60'}>
                                    {priceData ? `${parseFloat(priceData.price).toFixed(2)}€` : '—'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal(item)} className="p-2 text-zinc-500 hover:text-yellow-400">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => removeItem(user.id, item.id)} className="p-2 text-zinc-500 hover:text-red-500">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* MODAL EDITAR - Fondo transparente y desenfoque */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/70 backdrop-blur-md">
          <div className="bg-zinc-950 border-t sm:border border-zinc-800 w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-10 sm:hidden" />
            <div className="text-center mb-8">
              <h3 className="text-xl font-black uppercase text-white tracking-tighter">Cambiar Tienda</h3>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">"{editingItem.products?.name}"</p>
            </div>
            <div className="space-y-6">
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-2xl text-sm font-bold text-white outline-none focus:border-yellow-400 appearance-none" 
                value={selectedSupermarket} 
                onChange={(e) => setSelectedSupermarket(e.target.value)}
              >
                {editingItem.products?.product_prices?.map((p) => {
                  const sName = supermarkets.find(s => s.id === p.supermarket_id)?.name || `Súper ${p.supermarket_id}`;
                  return <option key={p.supermarket_id} value={p.supermarket_id}>{sName} — {parseFloat(p.price).toFixed(2)}€</option>
                })}
              </select>
              <div className="flex flex-col gap-3">
                <button onClick={handleEditSave} className="w-full py-5 rounded-2xl bg-yellow-400 text-black font-black text-xs uppercase active:scale-95 transition-all">Guardar</button>
                <button onClick={() => setShowEditModal(false)} className="w-full py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/70 backdrop-blur-md">
          <div className="bg-zinc-950 border-t sm:border border-zinc-800 w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-10 sm:hidden" />
            <h3 className="text-2xl font-black uppercase text-yellow-400 mb-8 text-center tracking-tighter">Añadir Item</h3>
            <div className="space-y-6">
              <select className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-2xl text-sm font-bold text-white outline-none focus:border-yellow-400 appearance-none" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                <option value="">Selecciona...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex flex-col gap-3">
                <button onClick={handleAddProduct} disabled={adding || !selectedProduct} className="w-full py-5 rounded-2xl bg-yellow-400 text-black font-black text-xs uppercase active:scale-95 transition-all">
                  {adding ? 'Añadiendo...' : 'Añadir'}
                </button>
                <button onClick={() => setShowAddModal(false)} className="w-full py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}