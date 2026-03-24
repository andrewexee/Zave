import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import supabase from '../supabaseClient';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });

    if (error) {
      setError('No se pudo crear la cuenta. Puede que el correo ya esté en uso.');
    } else {
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        <div className="mb-10 text-center">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white">
            Z<span className="text-green-400">a</span>ve
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-2 tracking-widest uppercase">
            The best app for save money
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
          <h2 className="text-white text-lg md:text-xl font-semibold mb-6">Crear cuenta</h2>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1">
              <label className="text-zinc-400 text-xs uppercase tracking-widest">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Tu nombre"
                className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-green-400 transition-colors placeholder-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-zinc-400 text-xs uppercase tracking-widest">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@correo.com"
                className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-green-400 transition-colors placeholder-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-zinc-400 text-xs uppercase tracking-widest">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
                className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-green-400 transition-colors placeholder-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-zinc-400 text-xs uppercase tracking-widest">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repite la contraseña"
                className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-green-400 transition-colors placeholder-zinc-600"
              />
            </div>

            {error && (
              <p className="text-orange-400 text-xs bg-orange-400/10 border border-orange-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-green-400 hover:bg-green-300 text-black font-bold py-3 rounded-lg text-sm tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

          </form>
        </div>

        <p className="text-zinc-600 text-sm text-center mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-green-400 hover:text-green-300 transition-colors font-medium">
            Inicia sesión
          </Link>
        </p>

      </div>
    </div>
  );
}