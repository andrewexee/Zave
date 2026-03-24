import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Supermarkets from './pages/Supermarkets';
import Admin from './pages/Admin';
import Navbar from './components/Navbar';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <span className="text-yellow-400 text-lg font-mono tracking-widest animate-pulse">
        Cargando...
      </span>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['user', 'editor', 'admin']}>
          <Navbar /><Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/supermarkets" element={
        <ProtectedRoute allowedRoles={['editor', 'admin']}>
          <Navbar /><Supermarkets />
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Navbar /><Admin />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}