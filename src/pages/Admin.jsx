import { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openEdit = (user) => {
    setEditing(user);
    setName(user.name);
    setRole(user.role);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');
    await supabase.from('users').update({ name: name.trim(), role }).eq('id', editing.id);
    setSaving(false);
    setShowModal(false);
    fetchUsers();
  };

  const handleDelete = async (userId) => {
    if (userId === currentProfile?.id) {
      alert('No puedes eliminar tu propio perfil.');
      return;
    }
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
    await supabase.from('users').delete().eq('id', userId);
    fetchUsers();
  };

  const roleColor = (r) => {
    if (r === 'admin') return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    if (r === 'editor') return 'text-green-400 bg-green-400/10 border-green-400/20';
    return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
  };

  return (
    <div className="min-h-screen bg-black px-4 md:px-6 py-6 md:py-8">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-white text-xl md:text-2xl font-bold">Usuarios</h2>
          <p className="text-zinc-500 text-sm mt-1">Gestiona los perfiles registrados en la app</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 self-start sm:self-auto">
          <span className="text-zinc-500 text-xs font-mono">
            {users.length} usuario{users.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-orange-400 font-mono animate-pulse">Cargando...</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">Usuario</th>
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900 hidden sm:table-cell">Correo</th>
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">Rol</th>
                <th className="text-left text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900 hidden md:table-cell">Registrado</th>
                <th className="text-center text-zinc-400 font-medium px-3 md:px-4 py-3 bg-zinc-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  className={`border-b border-zinc-800 transition-colors hover:bg-zinc-900/50 ${
                    i % 2 === 0 ? 'bg-black' : 'bg-zinc-950'
                  }`}
                >
                  <td className="px-3 md:px-4 py-3">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shrink-0">
                        <span className="text-white text-xs font-bold uppercase">
                          {u.name?.charAt(0) ?? '?'}
                        </span>
                      </div>
                      <span className="text-white font-medium text-xs md:text-sm">
                        {u.name}
                        {u.id === currentProfile?.id && (
                          <span className="ml-1 text-xs text-zinc-600">(tú)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 md:px-4 py-3 hidden sm:table-cell">
                    <span className="text-zinc-400 font-mono text-xs">{u.email}</span>
                  </td>
                  <td className="px-3 md:px-4 py-3">
                    <span className={`text-xs font-mono px-2 py-1 rounded-md border ${roleColor(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-3 hidden md:table-cell">
                    <span className="text-zinc-500 text-xs font-mono">
                      {new Date(u.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-3">
                    <div className="flex items-center justify-center gap-1 md:gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs px-2 md:px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-orange-400 hover:text-black transition-colors font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === currentProfile?.id}
                        className="text-xs px-2 md:px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-red-500 hover:text-white transition-colors font-medium disabled:opacity-30 disabled:cursor-not-allowed"
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

            <h3 className="text-white text-lg font-bold mb-6">Editar usuario</h3>

            <div className="flex flex-col gap-4">

              <div className="flex flex-col gap-1">
                <label className="text-zinc-400 text-xs uppercase tracking-widest">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-orange-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-zinc-400 text-xs uppercase tracking-widest">Rol</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-orange-400 transition-colors"
                >
                  <option value="user">user</option>
                  <option value="editor">editor</option>
                  <option value="admin">admin</option>
                </select>
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
                  className="flex-1 py-3 rounded-lg bg-orange-400 hover:bg-orange-300 text-black font-bold text-sm transition-colors disabled:opacity-50"
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