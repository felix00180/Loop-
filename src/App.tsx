import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { useSiteStore } from './store/site';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RifaDetails from './pages/RifaDetails';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import MeusPedidos from './pages/MeusPedidos';

export default function App() {
  const { user } = useAuthStore();
  const { fetchSettings } = useSiteStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/rifa/:id" element={<RifaDetails />} />
            <Route 
              path="/checkout/:id" 
              element={user ? <Checkout /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/meus-pedidos" 
              element={user ? <MeusPedidos /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin" 
              element={user?.isAdmin ? <AdminDashboard /> : <Navigate to="/" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
