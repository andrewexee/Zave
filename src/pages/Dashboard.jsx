import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';
import supabase from '../supabaseClient';
import { Pencil, Trash2, Plus, ShoppingCart } from 'lucide-react';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { items: cartItems, addItem } = useCartStore();

  const [products, setProducts] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal editar / crear producto
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productWeight, setProductWeight] = useState('');
  const [productWeightUnit, setProductWeightUnit] = useState('g');
  const [productCategory, setProductCategory] = useState('');
  const [productPrices, setProductPrices] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Modal detalle producto (carrito)
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);

  const canEdit = profile?.role === 'editor' || profile?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    const [{ data: prods }, { data: supers }, { data: cats }, { data: prics }] = await Promise.all([
      supabase.from('products').select('*, categories(id, name, color)').order('name'),
      supabase.from('supermarkets').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('product_prices').select('*'),
    ]);
    setProducts(prods ?? []);
    setSupermarkets(supers ?? []);
    setCategories(cats ?? []);
    setPrices(prics ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      search.trim() === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      selectedCategory === '' ||
      String(p.category_id) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCheapest = (productId) => {
    const list = prices.filter((p) => p.product_id === productId);
    if (list.length === 0) return null;
    return list.reduce((min, p) => (p.price < min.price ? p : min));
  };

  const formatWeight = (grams) => {
    if (!grams) return null;
    if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`;
    return `${grams} g`;
  };

  const isInCart = (productId) => cartItems.some((i) => i.product_id === productId);

  const handleAddToCart = async (product) => {
    setAddingToCart(true);
    const productWithPrices = {
      ...product,
      product_prices: prices.filter((p) => p.product_id === product.id),
    };
    await addItem(user.id, productWithPrices);
    setAddingToCart(false);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setProductName('');
    setProductDescription('');
    setProductWeight('');
    setProductWeightUnit('g');
    setProductCategory('');
    setProductPrices({});
    setError('');
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductDescription(product.description ?? '');
    setProductWeight(product.weight_grams ?? '');
    setProductWeightUnit('g');
    setProductCategory(product.category_id ?? '');
    const existing = {};
    prices
      .filter((p) => p.product_id === product.id)
      .forEach((p) => { existing[p.supermarket_id] = p.price; });
    setProductPrices(existing);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }

    let weightInGrams = null;
    if (productWeight !== '' && productWeight !== null) {
      const rawWeight = parseFloat(productWeight);
      if (!isNaN(rawWeight) && rawWeight > 0) {
        weightInGrams = productWeightUnit === 'kg'
          ? Math.round(rawWeight * 1000)
          : Math.round(rawWeight);
      }
    }

    setSaving(true);
    setError('');

    const payload = {
      name: productName.trim(),
      description: productDescription.trim() || null,
      weight_grams: weightInGrams,
      category_id: productCategory !== '' ? parseInt(productCategory) : null,
    };

    let productId = editingProduct?.id;

    if (editingProduct) {
      await supabase.from('products').update(payload).eq('id', productId);
    } else {
      const { data } = await supabase.from('products').insert(payload).select().single();
      productId = data.id;
    }

    for (const [supermarketId, price] of Object.entries(productPrices)) {
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || price === '') {
        await supabase
          .from('product_prices')
          .delete()
          .eq('product_id', productId)
          .eq('supermarket_id', supermarketId);
      } else {
        await supabase
          .from('product_prices')
          .upsert({ product_id: productId, supermarket_id: parseInt(supermarketId), price: numericPrice });
      }
    }

    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (productId) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await supabase.from('products').delete().eq('id', productId);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-black px-4 md:px-6 py-6 md:py-8">

      {/* REFERENCIA ESTÁTICA PARA TAILWIND — igual que en Categories.jsx */}
      <div className="hidden bg-yellow-400 bg-orange-400 bg-green-400 bg-blue-500 bg-purple-500 text-yellow-400 text-orange-400 text-green-400 text-blue-500 text-purple-500 border-yellow-400/20 border-orange-400/20 border-green-400/20 border-blue-500/20 border-purple-500/20 bg-yellow-400/10 bg-orange-400/10 bg-green-400/10 bg-blue-500/10 bg-purple-500/10"></div>

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
        <div className="shrink-0">
          <h2 className="text-white text-xl md:text-2xl font-bold">Productos</h2>
          <p className="text-zinc-500 text-sm mt-1">Comparativa de precios por supermercado</p>
        </div>

        {/* Selector categoría con icono */}
        <div className="flex-1 flex justify-center px-0 sm:px-4">
          <div className="relative w-full sm:w-56">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-zinc-900 text-zinc-300 rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors appearance-none"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={openCreate}
            className="shrink-0 w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            + Añadir producto
          </button>
        )}
      </div>

      {/* Barra de búsqueda con icono lupa */}
      <div className="mb-4 md:mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto por nombre o descripción..."
            className="w-full bg-zinc-900 text-white rounded-lg pl-11 pr-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder-zinc-600"
          />
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-yellow-400 font-mono animate-pulse">Cargando...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-zinc-600 text-4xl">🛒</span>
          {products.length === 0 ? (
            <>
              <p className="text-zinc-500">No hay productos todavía.</p>
              {canEdit && (
                <button onClick={openCreate} className="mt-2 text-yellow-400 hover:text-yellow-300 text-sm underline">
                  Añadir el primero
                </button>
              )}
            </>
          ) : (
            <p className="text-zinc-500">No se encontraron productos con ese filtro.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm min-w-[300px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">
                  Producto
                </th>
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">
                  Peso
                </th>
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900 hidden md:table-cell">
                  Categoría
                </th>
                {supermarkets.map((s) => (
                  <th key={s.id} className="text-center text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900 whitespace-nowrap">
                    {s.name}
                  </th>
                ))}
                {canEdit && (
                  <th className="text-center text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, i) => {
                const cheapest = getCheapest(product.id);
                const inCart = isInCart(product.id);
                return (
                  <tr
                    key={product.id}
                    className={`border-b border-zinc-800 transition-colors hover:bg-zinc-900/50 ${
                      i % 2 === 0 ? 'bg-black' : 'bg-zinc-950'
                    }`}
                  >
                    {/* Celda producto: nombre clicable + descripción + categoría en móvil */}
                    <td className="px-3 md:px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Nombre clicable para abrir modal de detalle */}
                        <button
                          onClick={() => { setSelectedProduct(product); setShowProductModal(true); }}
                          className={`font-medium hover:text-yellow-400 transition-colors text-left ${
                            inCart ? 'text-yellow-400' : 'text-white'
                          }`}
                        >
                          {product.name}
                        </button>
                        {inCart && (
                          <ShoppingCart size={13} className="text-yellow-400 shrink-0" />
                        )}
                      </div>
                      {product.description && (
                        <p className="text-zinc-500 text-xs mt-0.5">{product.description}</p>
                      )}
                      {/* Categoría solo en móvil dentro de esta celda */}
                      {product.categories && (
                        <div className="mt-1.5 md:hidden">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-md bg-${product.categories.color}/10 text-${product.categories.color} border border-${product.categories.color}/20`}>
                            {product.categories.name}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Peso: columna propia siempre visible */}
                    <td className="px-3 md:px-4 py-3">
                      {product.weight_grams ? (
                        <span className="text-zinc-300 font-mono text-xs">
                          {formatWeight(product.weight_grams)}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>

                    {/* Categoría como columna solo en desktop */}
                    <td className="px-3 md:px-4 py-3 hidden md:table-cell">
                      {product.categories ? (
                        <span className={`text-xs font-medium px-2 py-1 rounded-md bg-${product.categories.color}/10 text-${product.categories.color} border border-${product.categories.color}/20`}>
                          {product.categories.name}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>

                    {supermarkets.map((s) => {
                      const isCheapest = cheapest?.supermarket_id === s.id;
                      const priceEntry = prices.find(
                        (p) => p.product_id === product.id && p.supermarket_id === s.id
                      );
                      return (
                        <td key={s.id} className="px-3 md:px-4 py-3 text-center">
                          {priceEntry ? (
                            <span className={`font-mono font-semibold ${isCheapest ? 'text-green-400' : 'text-zinc-300'}`}>
                              {parseFloat(priceEntry.price).toFixed(2)} €
                            </span>
                          ) : (
                            <span className="text-zinc-700">—</span>
                          )}
                        </td>
                      );
                    })}

                    {canEdit && (
                      <td className="px-3 md:px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 md:gap-2">
                          <button
                            onClick={() => openEdit(product)}
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-yellow-400 hover:text-black transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle producto (para añadir al carrito) */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">

              {/* Cabecera modal */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white text-lg font-bold">{selectedProduct.name}</h3>
                  {selectedProduct.description && (
                    <p className="text-zinc-500 text-sm mt-1">{selectedProduct.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="text-zinc-600 hover:text-white transition-colors ml-4 shrink-0 text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Badges categoría y peso */}
              <div className="flex flex-wrap gap-2 mb-5">
                {selectedProduct.categories && (
                  <span className={`text-xs font-medium px-2 py-1 rounded-md bg-${selectedProduct.categories.color}/10 text-${selectedProduct.categories.color} border border-${selectedProduct.categories.color}/20`}>
                    {selectedProduct.categories.name}
                  </span>
                )}
                {selectedProduct.weight_grams && (
                  <span className="text-zinc-400 font-mono text-xs px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700">
                    {formatWeight(selectedProduct.weight_grams)}
                  </span>
                )}
              </div>

              {/* Precios por supermercado */}
              {supermarkets.length > 0 && (
                <div className="flex flex-col gap-2 mb-6">
                  <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Precios</p>
                  {supermarkets.map((s) => {
                    const priceEntry = prices.find(
                      (p) => p.product_id === selectedProduct.id && p.supermarket_id === s.id
                    );
                    const cheapest = getCheapest(selectedProduct.id);
                    const isCheapest = cheapest?.supermarket_id === s.id;
                    return (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700">
                        <span className="text-zinc-300 text-sm">{s.name}</span>
                        {priceEntry ? (
                          <span className={`font-mono font-semibold text-sm ${isCheapest ? 'text-green-400' : 'text-zinc-300'}`}>
                            {parseFloat(priceEntry.price).toFixed(2)} €
                            {isCheapest && <span className="ml-1 text-xs opacity-70">✓</span>}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-sm">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Botón añadir al carrito */}
              <button
                onClick={() => handleAddToCart(selectedProduct)}
                disabled={isInCart(selectedProduct.id) || addingToCart}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInCart(selectedProduct.id) ? (
                  <>
                    <ShoppingCart size={16} />
                    Ya está en la lista
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    {addingToCart ? 'Añadiendo...' : 'Añadir a la lista'}
                  </>
                )}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Modal crear / editar producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="p-6 md:p-8">

              <h3 className="text-white text-lg font-bold mb-6">
                {editingProduct ? 'Editar producto' : 'Nuevo producto'}
              </h3>

              <div className="flex flex-col gap-4">

                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 text-xs uppercase tracking-widest">
                    Nombre del producto
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ej: Leche entera"
                    className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder-zinc-600"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 text-xs uppercase tracking-widest">
                    Descripción <span className="text-zinc-600 normal-case">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Ej: Marca blanca"
                    className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder-zinc-600"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">

                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-zinc-400 text-xs uppercase tracking-widest">
                      Peso <span className="text-zinc-600 normal-case">(opcional)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={productWeight}
                        onChange={(e) => setProductWeight(e.target.value)}
                        placeholder="Ej: 500"
                        className="bg-zinc-800 text-white rounded-lg px-3 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder-zinc-600 flex-1 min-w-0"
                      />
                      <select
                        value={productWeightUnit}
                        onChange={(e) => setProductWeightUnit(e.target.value)}
                        className="bg-zinc-800 text-white rounded-lg px-3 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-zinc-400 text-xs uppercase tracking-widest">
                      Categoría <span className="text-zinc-600 normal-case">(opcional)</span>
                    </label>
                    <select
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value)}
                      className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {supermarkets.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <label className="text-zinc-400 text-xs uppercase tracking-widest">
                      Precios por supermercado
                    </label>
                    {supermarkets.map((s) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="text-zinc-300 text-sm flex-1 truncate">{s.name}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={productPrices[s.id] ?? ''}
                          onChange={(e) =>
                            setProductPrices((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                          placeholder="0.00"
                          className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder-zinc-600 w-28"
                        />
                        <span className="text-zinc-500 text-sm">€</span>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <p className="text-orange-400 text-xs bg-orange-400/10 border border-orange-400/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
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