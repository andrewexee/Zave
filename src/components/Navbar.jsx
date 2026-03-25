import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">

        <span className="text-2xl font-black tracking-tighter text-white">
          Z<span className="text-yellow-400">a</span>ve
        </span>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            to="/dashboard"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/dashboard')
                ? 'bg-yellow-400 text-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Productos
          </Link>

          {(profile?.role === 'editor' || profile?.role === 'admin') && (
            <>
              <Link
                to="/categories"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/categories')
                    ? 'bg-yellow-400 text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Categorías
              </Link>

              <Link
                to="/supermarkets"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/supermarkets')
                    ? 'bg-green-400 text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Supermercados
              </Link>
            </>
          )}

          {profile?.role === 'admin' && (
            <Link
              to="/admin"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/admin')
                  ? 'bg-orange-400 text-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Usuarios
            </Link>
          )}
        </div>

        {/* Desktop usuario + logout */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold uppercase">
                {profile?.name?.charAt(0) ?? '?'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-sm font-medium leading-none">
                {profile?.name}
              </span>
              <span className={`text-xs font-mono mt-0.5 ${
                profile?.role === 'admin'
                  ? 'text-orange-400'
                  : profile?.role === 'editor'
                  ? 'text-green-400'
                  : 'text-zinc-500'
              }`}>
                {profile?.role}
              </span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="text-zinc-500 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors border border-zinc-700 hover:border-zinc-600"
          >
            Salir
          </button>
        </div>

        {/* Mobile hamburguesa */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>

      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mt-4 flex flex-col gap-2 border-t border-zinc-800 pt-4">

          <div className="flex items-center gap-3 px-2 pb-3 border-b border-zinc-800">
            <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center">
              <span className="text-white text-sm font-bold uppercase">
                {profile?.name?.charAt(0) ?? '?'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-sm font-medium">{profile?.name}</span>
              <span className={`text-xs font-mono ${
                profile?.role === 'admin'
                  ? 'text-orange-400'
                  : profile?.role === 'editor'
                  ? 'text-green-400'
                  : 'text-zinc-500'
              }`}>
                {profile?.role}
              </span>
            </div>
          </div>

          <Link
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              isActive('/dashboard')
                ? 'bg-yellow-400 text-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Productos
          </Link>

          {(profile?.role === 'editor' || profile?.role === 'admin') && (
            <>
              <Link
                to="/categories"
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/categories')
                    ? 'bg-yellow-400 text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Categorías
              </Link>

              <Link
                to="/supermarkets"
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/supermarkets')
                    ? 'bg-green-400 text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Supermercados
              </Link>
            </>
          )}

          {profile?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive('/admin')
                  ? 'bg-orange-400 text-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Usuarios
            </Link>
          )}

          <button
            onClick={signOut}
            className="mt-1 text-left px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-700"
          >
            Salir
          </button>

        </div>
      )}
    </nav>
  );
}