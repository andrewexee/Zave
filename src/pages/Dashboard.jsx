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

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

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

  useEffect(() => {
    fetchData();
  }, []);

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
    if (grams >= 1000) {
      const kg = grams / 1000;
      return `${kg.toFixed(grams % 1000 === 0 ? 0 : 1)} kg`;
    }
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
    
    const existingPrices = {};
    prices
      .filter((p) => p.product_id === product.id)
      .forEach((p) => {
        existingPrices[p.supermarket_id] = p.price;
      });
    setProductPrices(existingPrices);
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

    try {
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
        const { data, error: insError } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();
        if (insError) throw insError;
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
          await supabase.from('product_prices').upsert({
            product_id: productId,
            supermarket_id: parseInt(supermarketId),
            price: numericPrice,
          });
        }
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Error al guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    try {
      await supabase.from('products').delete().eq('id', productId);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black px-4 md:px-6 py-6 md:py-8">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
        <div className="sm:flex-1 sm:basis-0">
          <h2 className="text-white text-xl md:text-2xl font-bold">Productos</h2>
          <p className="text-zinc-500 text-sm mt-1">Comparativa de precios por supermercado</p>
        </div>

        <div className="flex justify-center shrink-0">
          <div className="relative w-full sm:w-48"> 
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-zinc-900 text-zinc-300 rounded-lg pl-9 pr-8 py-2.5 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors appearance-none"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="sm:flex-1 sm:basis-0 flex justify-start sm:justify-end">
          {canEdit && (
            <button
              onClick={openCreate}
              className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              + Añadir producto
            </button>
          )}
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-4 md:mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
          <span className="text-yellow-400 font-mono animate-pulse text-sm uppercase tracking-widest">Cargando datos...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-zinc-800 rounded-2xl">
          <span className="text-zinc-600 text-4xl">🛒</span>
          <p className="text-zinc-500 text-sm">No hay productos disponibles.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-400 font-medium px-4 py-3 bg-zinc-900/50">Producto</th>
                <th className="text-left text-zinc-400 font-medium px-4 py-3 bg-zinc-900/50">Peso</th>
                <th className="text-left text-zinc-400 font-medium px-4 py-3 bg-zinc-900/50 hidden md:table-cell">Categoría</th>
                {supermarkets.map((s) => (
                  <th key={s.id} className="text-center text-zinc-400 font-medium px-4 py-3 bg-zinc-900/50">{s.name}</th>
                ))}
                {canEdit && <th className="text-center text-zinc-400 font-medium px-4 py-3 bg-zinc-900/50">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, i) => {
                const cheapest = getCheapest(product.id);
                return (
                  <tr key={product.id} className={`border-b border-zinc-800 transition-colors hover:bg-zinc-900/30 ${i % 2 === 0 ? 'bg-black' : 'bg-zinc-950'}`}>
                    <td className="px-4 py-3">
                      <span className="text-white font-medium block">{product.name}</span>
                      {product.description && <p className="text-zinc-500 text-xs mt-0.5">{product.description}</p>}
                      {/* Categoría visible SOLO en móvil (debajo del nombre) */}
                      {product.categories && (
                        <div className="mt-1.5 md:hidden">
                           <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                            {product.categories.name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {product.weight_grams ? (
                        <span className="text-zinc-300 font-mono text-xs">{formatWeight(product.weight_grams)}</span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {product.categories ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-md bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 whitespace-nowrap">
                          {product.categories.name}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>
                    {supermarkets.map((s) => {
                      const isCheapest = cheapest?.supermarket_id === s.id;
                      const priceEntry = prices.find((p) => p.product_id === product.id && p.supermarket_id === s.id);
                      return (
                        <td key={s.id} className="px-4 py-3 text-center whitespace-nowrap">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(product)} className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-lg font-bold">{editingProduct ? 'Editar producto' : 'Nuevo producto'}</h3>
                <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Nombre</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Descripción</label>
                  <input
                    type="text"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Peso</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={productWeight}
                        onChange={(e) => setProductWeight(e.target.value)}
                        className="bg-zinc-800 text-white rounded-lg px-3 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 flex-1"
                      />
                      <select
                        value={productWeightUnit}
                        onChange={(e) => setProductWeightUnit(e.target.value)}
                        className="bg-zinc-800 text-white rounded-lg px-3 py-3 text-sm outline-none border border-zinc-700"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Categoría</label>
                    <select
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value)}
                      className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {supermarkets.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Precios</label>
                    {supermarkets.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 bg-zinc-800/50 p-2 rounded-lg border border-zinc-800">
                        <span className="text-zinc-300 text-sm flex-1 truncate px-2">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={productPrices[s.id] ?? ''}
                            onChange={(e) => setProductPrices((prev) => ({ ...prev, [s.id]: e.target.value }))}
                            className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none border border-zinc-700 w-28"
                          />
                          <span className="text-zinc-500 text-sm">€</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <p className="text-orange-400 text-xs bg-orange-400/10 border border-orange-400/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
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