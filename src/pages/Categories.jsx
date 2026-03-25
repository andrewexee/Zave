import { useEffect, useState } from 'react';
import supabase from '../supabaseClient';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    setCategories(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setName(category.name);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre de la categoría es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');

    if (editing) {
      const { error } = await supabase
        .from('categories')
        .update({ name: name.trim() })
        .eq('id', editing.id);
      if (error) {
        setError('Ya existe una categoría con ese nombre.');
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('categories')
        .insert({ name: name.trim() });
      if (error) {
        setError('Ya existe una categoría con ese nombre.');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowModal(false);
    fetchCategories();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría? Los productos asignados a ella quedarán sin categoría.')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
  };

  return (
    <div className="min-h-screen bg-black px-4 md:px-6 py-6 md:py-8">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-white text-xl md:text-2xl font-bold">Categorías</h2>
          <p className="text-zinc-500 text-sm mt-1">Gestiona las categorías de productos</p>
        </div>
        <button
          onClick={openCreate}
          className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          + Añadir categoría
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-yellow-400 font-mono animate-pulse">Cargando...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-zinc-600 text-4xl">🏷️</span>
          <p className="text-zinc-500">No hay categorías todavía.</p>
          <button
            onClick={openCreate}
            className="mt-2 text-yellow-400 hover:text-yellow-300 text-sm underline"
          >
            Añadir la primera
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm min-w-[300px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">
                  Nombre
                </th>
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900 hidden sm:table-cell">
                  Creada
                </th>
                <th className="text-center text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-zinc-800 transition-colors hover:bg-zinc-900/50 ${
                    i % 2 === 0 ? 'bg-black' : 'bg-zinc-950'
                  }`}
                >
                  <td className="px-3 md:px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                      <span className="text-white font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 md:px-4 py-3 hidden sm:table-cell">
                    <span className="text-zinc-500 text-xs font-mono">
                      {new Date(c.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-3">
                    <div className="flex items-center justify-center gap-1 md:gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs px-2 md:px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-yellow-400 hover:text-black transition-colors font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs px-2 md:px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-orange-500 hover:text-white transition-colors font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-6 md:p-8 w-full sm:max-w-md">

            <h3 className="text-white text-lg font-bold mb-6">
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </h3>

            <div className="flex flex-col gap-4">

              <div className="flex flex-col gap-1">
                <label className="text-zinc-400 text-xs uppercase tracking-widest">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Lácteos"
                  className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder-zinc-600"
                />
              </div>

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