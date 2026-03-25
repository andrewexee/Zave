import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import supabase from '../supabaseClient';

export default function Dashboard() {
  const { profile } = useAuth();
  const [products, setProducts] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal estados
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

  const canEdit = profile?.role === 'editor' || profile?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    const [{ data: prods }, { data: supers }, { data: cats }, { data: prics }] = await Promise.all([
      supabase.from('products').select('*, categories(name)').order('name'),
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

  // Productos filtrados por búsqueda y categoría
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

      {/* Cabecera: título | filtro categoría | botón añadir */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">

        {/* Título */}
        <div className="shrink-0">
          <h2 className="text-white text-xl md:text-2xl font-bold">Productos</h2>
          <p className="text-zinc-500 text-sm mt-1">Comparativa de precios por supermercado</p>
        </div>

        {/* Filtro categoría — centrado */}
        <div className="flex-1 flex justify-center px-0 sm:px-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-56 bg-zinc-900 text-zinc-300 rounded-lg px-4 py-2.5 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Botón añadir */}
        {canEdit && (
          <button
            onClick={openCreate}
            className="shrink-0 w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            + Añadir producto
          </button>
        )}

      </div>

      {/* Barra de búsqueda */}
      <div className="mb-4 md:mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto por nombre o descripción..."
          className="w-full bg-zinc-900 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder-zinc-600"
        />
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
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">
                  Producto
                </th>
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900 hidden sm:table-cell">
                  Categoría
                </th>
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900 hidden md:table-cell">
                  Peso
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
                return (
                  <tr
                    key={product.id}
                    className={`border-b border-zinc-800 transition-colors hover:bg-zinc-900/50 ${
                      i % 2 === 0 ? 'bg-black' : 'bg-zinc-950'
                    }`}
                  >
                    <td className="px-3 md:px-4 py-3">
                      <span className="text-white font-medium">{product.name}</span>
                      {product.description && (
                        <p className="text-zinc-500 text-xs mt-0.5">{product.description}</p>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-3 hidden sm:table-cell">
                      {product.categories ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-md bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                          {product.categories.name}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-3 hidden md:table-cell">
                      {product.weight_grams ? (
                        <span className="text-zinc-300 font-mono text-xs">
                          {formatWeight(product.weight_grams)}
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
                            className="text-xs px-2 md:px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-yellow-400 hover:text-black transition-colors font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-xs px-2 md:px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-orange-500 hover:text-white transition-colors font-medium"
                          >
                            Eliminar
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-6 md:p-8 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">

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

              <div className="flex gap-3">

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
      )}

    </div>
  );
}