import { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { Pencil, Trash2 } from 'lucide-react';

export default function Supermarkets() {
  const [supermarkets, setSupermarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchSupermarkets = async () => {
    setLoading(true);
    const { data } = await supabase.from('supermarkets').select('*').order('name');
    setSupermarkets(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSupermarkets(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setLocation('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setName(s.name);
    setLocation(s.location ?? '');
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre del supermercado es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');

    if (editing) {
      await supabase
        .from('supermarkets')
        .update({ name: name.trim(), location: location.trim() || null })
        .eq('id', editing.id);
    } else {
      await supabase
        .from('supermarkets')
        .insert({ name: name.trim(), location: location.trim() || null });
    }

    setSaving(false);
    setShowModal(false);
    fetchSupermarkets();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este supermercado? Se eliminarán también todos sus precios asociados.')) return;
    await supabase.from('supermarkets').delete().eq('id', id);
    fetchSupermarkets();
  };

  return (
    <div className="min-h-screen bg-black px-4 md:px-6 py-6 md:py-8">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-white text-xl md:text-2xl font-bold">Supermercados</h2>
          <p className="text-zinc-500 text-sm mt-1">Gestiona los supermercados disponibles</p>
        </div>
        <button
          onClick={openCreate}
          className="w-full sm:w-auto bg-green-400 hover:bg-green-300 text-black font-bold px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          + Añadir supermercado
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-green-400 font-mono animate-pulse">Cargando...</span>
        </div>
      ) : supermarkets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-zinc-600 text-4xl">🏪</span>
          <p className="text-zinc-500">No hay supermercados todavía.</p>
          <button onClick={openCreate} className="mt-2 text-green-400 hover:text-green-300 text-sm underline">
            Añadir el primero
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">Nombre</th>
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900 hidden sm:table-cell">Ubicación</th>
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900 hidden md:table-cell">Creado</th>
                <th className="text-center text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {supermarkets.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-zinc-800 transition-colors hover:bg-zinc-900/50 ${
                    i % 2 === 0 ? 'bg-black' : 'bg-zinc-950'
                  }`}
                >
                  <td className="px-3 md:px-4 py-3">
                    <span className="text-white font-medium">{s.name}</span>
                  </td>
                  <td className="px-3 md:px-4 py-3 hidden sm:table-cell">
                    {s.location
                      ? <span className="text-zinc-300">{s.location}</span>
                      : <span className="text-zinc-700">—</span>
                    }
                  </td>
                  <td className="px-3 md:px-4 py-3 hidden md:table-cell">
                    <span className="text-zinc-500 text-xs font-mono">
                      {new Date(s.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-3">
                    <div className="flex items-center justify-center gap-1 md:gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-xs px-2 md:px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-green-400 hover:text-black transition-colors font-medium"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-xs px-2 md:px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-orange-500 hover:text-white transition-colors font-medium"
                      >
                        <Trash2 size={16} />
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
              {editing ? 'Editar supermercado' : 'Nuevo supermercado'}
            </h3>

            <div className="flex flex-col gap-4">

              <div className="flex flex-col gap-1">
                <label className="text-zinc-400 text-xs uppercase tracking-widest">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Mercadona"
                  className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-green-400 transition-colors placeholder-zinc-600"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-zinc-400 text-xs uppercase tracking-widest">
                  Ubicación <span className="text-zinc-600 normal-case">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Calle Mayor 10, Madrid"
                  className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-green-400 transition-colors placeholder-zinc-600"
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
                  className="flex-1 py-3 rounded-lg bg-green-400 hover:bg-green-300 text-black font-bold text-sm transition-colors disabled:opacity-50"
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