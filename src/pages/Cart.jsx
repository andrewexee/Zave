import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';
import supabase from '../supabaseClient';
import { Trash2, ShoppingCart, Plus, Pencil } from 'lucide-react';

export default function Cart() {
  const { user } = useAuth();
  const { items, loading, removeItem, clearCart, updateSupermarket } = useCartStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedSupermarket, setSelectedSupermarket] = useState('');
  const [products, setProducts] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [adding, setAdding] = useState(false);

  const { addItem } = useCartStore();

  // Agrupar items por supermercado y dentro por categoría
  const grouped = items.reduce((acc, item) => {
    const superName = item.supermarkets?.name ?? 'Sin supermercado';
    const superId = item.supermarket_id ?? 'none';
    const key = `${superId}__${superName}`;
    if (!acc[key]) acc[key] = { name: superName, id: superId, byCategory: {} };
    const catName = item.products?.categories?.name ?? 'Sin categoría';
    if (!acc[key].byCategory[catName]) acc[key].byCategory[catName] = [];
    acc[key].byCategory[catName].push(item);
    return acc;
  }, {});

  // Prioridad: supermercados ordenados por cantidad de productos
  const priority = Object.values(grouped)
    .map((g) => ({
      name: g.name,
      count: Object.values(g.byCategory).flat().length,
    }))
    .sort((a, b) => b.count - a.count);

  const openAddModal = async () => {
    const [{ data: prods }, { data: supers }] = await Promise.all([
      supabase.from('products').select('*, product_prices(supermarket_id, price)').order('name'),
      supabase.from('supermarkets').select('*').order('name'),
    ]);
    // Filtrar productos que ya están en el carrito
    const inCartIds = items.map((i) => i.product_id);
    setProducts((prods ?? []).filter((p) => !inCartIds.includes(p.id)));
    setSupermarkets(supers ?? []);
    setSelectedProduct('');
    setShowAddModal(true);
  };

  const handleAdd = async () => {
    if (!selectedProduct) return;
    setAdding(true);
    const product = products.find((p) => p.id === parseInt(selectedProduct));
    if (product) await addItem(user.id, product);
    setAdding(false);
    setShowAddModal(false);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setSelectedSupermarket(String(item.supermarket_id ?? ''));
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!selectedSupermarket || !editingItem) return;
    await updateSupermarket(user.id, editingItem.id, parseInt(selectedSupermarket));
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleRemove = async (cartItemId) => {
    await removeItem(user.id, cartItemId);
  };

  const handleClear = async () => {
    if (!confirm('¿Vaciar toda la lista de la compra?')) return;
    await clearCart(user.id);
  };

  const formatWeight = (grams) => {
    if (!grams) return null;
    if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`;
    return `${grams} g`;
  };

  // Precios del producto editando para el select
  const editingPrices = editingItem?.products?.product_prices ?? [];

  return (
    <div className="min-h-screen bg-black px-4 md:px-6 py-6 md:py-8">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-white text-xl md:text-2xl font-bold">Lista de la compra</h2>
          <p className="text-zinc-500 text-sm mt-1">
            {items.length} producto{items.length !== 1 ? 's' : ''} en tu lista
          </p>
        </div>
        <div className="flex gap-3">
          {items.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm font-medium transition-colors"
            >
              <Trash2 size={15} />
              Vaciar lista
            </button>
          )}
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 w-full sm:w-auto justify-center bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            Añadir producto
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-yellow-400 font-mono animate-pulse">Cargando...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <ShoppingCart size={48} className="text-zinc-700" />
          <p className="text-zinc-500">Tu lista de la compra está vacía.</p>
          <button
            onClick={openAddModal}
            className="mt-2 text-yellow-400 hover:text-yellow-300 text-sm underline"
          >
            Añadir el primero
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Lista agrupada por supermercado y categoría */}
          {Object.values(grouped).map((group) => (
            <div key={group.id} className="rounded-xl border border-zinc-800 overflow-hidden">

              {/* Cabecera supermercado */}
              <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800">
                <span className="text-green-400 font-bold text-sm uppercase tracking-widest">
                  🏪 {group.name}
                </span>
              </div>

              {/* Categorías dentro del supermercado */}
              {Object.entries(group.byCategory).map(([catName, catItems]) => (
                <div key={catName}>
                  {/* Cabecera categoría */}
                  <div className="bg-zinc-950 px-4 py-2 border-b border-zinc-800">
                    <span className="text-zinc-500 text-xs uppercase tracking-widest font-medium">
                      🏷️ {catName}
                    </span>
                  </div>

                  {/* Productos */}
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 last:border-0 bg-black hover:bg-zinc-900/40 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="text-white font-medium text-sm truncate">
                          {item.products?.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {item.products?.description && (
                            <span className="text-zinc-500 text-xs">{item.products.description}</span>
                          )}
                          {item.products?.weight_grams && (
                            <span className="text-zinc-500 font-mono text-xs">
                              {formatWeight(item.products.weight_grams)}
                            </span>
                          )}
                          {/* Precio en el supermercado asignado */}
                          {(() => {
                            const price = item.products?.product_prices?.find(
                              (p) => p.supermarket_id === item.supermarket_id
                            );
                            return price ? (
                              <span className="text-green-400 font-mono text-xs font-semibold">
                                {parseFloat(price.price).toFixed(2)} €
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-xs px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-yellow-400 hover:text-black transition-colors font-medium"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-xs px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* Panel de prioridad */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800">
              <span className="text-yellow-400 font-bold text-sm uppercase tracking-widest">
                📊 Resumen
              </span>
            </div>
            <div className="bg-black px-4 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm">Total productos</span>
                <span className="text-white font-bold font-mono">{items.length}</span>
              </div>
              <div className="border-t border-zinc-800 pt-3">
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">
                  Supermercados prioritarios
                </p>
                {priority.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold ${
                        i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : 'text-zinc-500'
                      }`}>
                        #{i + 1}
                      </span>
                      <span className="text-zinc-300 text-sm">{s.name}</span>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono">
                      {s.count} producto{s.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Modal añadir producto desde carrito */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-white text-lg font-bold mb-6">Añadir a la lista</h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 text-xs uppercase tracking-widest">
                    Producto
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors"
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <p className="text-zinc-600 text-xs">
                  Se asignará automáticamente al supermercado con el precio más bajo.
                </p>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!selectedProduct || adding}
                    className="flex-1 py-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {adding ? 'Añadiendo...' : 'Añadir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar supermercado */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-white text-lg font-bold mb-1">Cambiar supermercado</h3>
              <p className="text-zinc-500 text-sm mb-6">{editingItem.products?.name}</p>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 text-xs uppercase tracking-widest">
                    Supermercado
                  </label>
                  <select
                    value={selectedSupermarket}
                    onChange={(e) => setSelectedSupermarket(e.target.value)}
                    className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors"
                  >
                    <option value="">Selecciona un supermercado</option>
                    {editingPrices.map((p) => {
                      const superName = items.find(
                        (i) => i.supermarket_id === p.supermarket_id
                      )?.supermarkets?.name ?? `Supermercado ${p.supermarket_id}`;
                      return (
                        <option key={p.supermarket_id} value={p.supermarket_id}>
                          {superName} — {parseFloat(p.price).toFixed(2)} €
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEditSave}
                    disabled={!selectedSupermarket}
                    className="flex-1 py-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}