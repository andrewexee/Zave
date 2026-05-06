import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import supabase from '../supabaseClient';
import { motion } from 'framer-motion'; 
import { 
  ShoppingCart, Ticket, CircleDollarSign, Inbox, Tag, 
  Store, Package, ShoppingBag 
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Correo o contraseña incorrectos.');
    } else {
      navigate('/dashboard');
    }

    setLoading(false);
  };

  const iconList = [
    ShoppingCart, Ticket, CircleDollarSign, Inbox, Tag, 
    Store, Package, ShoppingBag
  ];

  // CONFIGURACIÓN DE BUCLE MATEMÁTICO PERFECTO
  const ICON_SIZE = 32;
  const GAP = 64; 
  const UNIT = ICON_SIZE + GAP; // 96px

  // Para que el bucle sea invisible con 8 iconos:
  // Movemos exactamente 8 unidades (8 * 96 = 768px)
  const LOOP_DISTANCE = UNIT * 8; 

  // Usamos 40 columnas (múltiplo de 8) para que cada fila encaje perfectamente
  const COLS = 40; 
  const ROWS = 40; 
  const WIDTH = COLS * UNIT; 
  const HEIGHT = ROWS * UNIT;

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center px-4 py-8 overflow-hidden">
      
      {/* CAPA DE FONDO: EL "SUEÑO" DEL BUCLE INFINITO */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          initial={{ x: 0, y: 0 }}
          animate={{ 
            // Movimiento diagonal exacto basado en la lista de 8
            x: [0, -LOOP_DISTANCE], 
            y: [0, LOOP_DISTANCE] 
          }}
          transition={{
            repeat: Infinity,
            duration: 30, 
            ease: "linear"
          }}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${UNIT}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${UNIT}px)`,
            width: `${WIDTH}px`,
            height: `${HEIGHT}px`,
            position: 'absolute',
            left: '50%',
            top: '50%',
            // Ajuste fino para centrar el grid antes de la rotación
            marginLeft: `-${WIDTH / 2}px`,
            marginTop: `-${HEIGHT / 2}px`,
          }}
          className="opacity-60 rotate-[-15deg]"
        >
          {[...Array(COLS * ROWS)].map((_, i) => {
            const row = Math.floor(i / COLS);
            
            // EL SECRETO DEL DESORDEN:
            // Desplazamos el inicio de cada fila para que no se vean columnas repetidas
            // Pero usamos un patrón que se repite cada 2 filas para no romper el bucle de 8
            const rowOffsets = [0, 2, 4, 6]; 
            const iconIndex = (i + rowOffsets[row % 4]) % iconList.length;
            
            const Icon = iconList[iconIndex];

            return (
              <div key={i} className="flex items-center justify-center w-full h-full">
                <Icon size={ICON_SIZE} className="text-zinc-500" strokeWidth={1.5} />
              </div>
            );
          })}
        </motion.div>
        
        {/* Máscara radial de Zave */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_65%)]" />
      </div>

      {/* BLOQUE DE LOGIN */}
      <div className="w-full max-w-md relative z-10">
        <div className="mb-10 text-center">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white">
            Z<span className="text-yellow-400">a</span>ve
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-2 tracking-widest uppercase">
            En inglés ahorrar se dice "save"... ¿O no lo Zave?
          </p>
        </div>

        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl">
          <h2 className="text-white text-lg md:text-xl font-semibold mb-6">Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-zinc-400 text-xs uppercase tracking-widest">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@correo.com"
                className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-zinc-400 text-xs uppercase tracking-widest">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder-zinc-600"
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
              className="mt-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-lg text-sm tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-zinc-600 text-sm text-center mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}