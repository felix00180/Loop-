import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useSiteStore } from '../store/site';
import { Button } from './ui/button';
import { Ticket } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { siteName, logoUrl } = useSiteStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-8 w-auto object-contain" />
          ) : (
            <Ticket className="w-6 h-6" />
          )}
          <span>{siteName}</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user.isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost">Painel Admin</Button>
                </Link>
              )}
              <Link to="/meus-pedidos">
                <Button variant="ghost">Meus Pedidos</Button>
              </Link>
              <div className="text-sm text-slate-500 hidden sm:block">
                Olá, {user.nome.split(' ')[0]}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>Sair</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button>Cadastrar</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
