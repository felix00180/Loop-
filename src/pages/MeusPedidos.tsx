import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useSiteStore } from '../store/site';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MessageCircle } from 'lucide-react';

export default function MeusPedidos() {
  const { token, user } = useAuthStore();
  const { adminWhatsapp } = useSiteStore();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/meus-pedidos', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setPedidos(data);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  const hasReserved = pedidos.some(p => p.cota.status === 'reservado');
  const handleWhatsApp = () => {
    if (!adminWhatsapp) {
      alert('Número de WhatsApp não configurado pelo administrador.');
      return;
    }
    const text = `Olá, sou ${user?.nome || 'um cliente'}. Gostaria de enviar meu comprovante de pagamento das minhas reservas.`;
    const url = `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-center">Meus Pedidos</h1>
      
      {hasReserved && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-amber-800">Você tem cotas aguardando pagamento!</h3>
            <p className="text-amber-700 text-sm">Agilize sua aprovação enviando o comprovante via WhatsApp.</p>
          </div>
          <Button onClick={handleWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white flex-shrink-0">
            <MessageCircle className="w-5 h-5 mr-2" />
            Enviar Comprovante
          </Button>
        </div>
      )}

      {pedidos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500 mb-4">Você ainda não tem nenhum número reservado.</p>
          <Link to="/">
            <Button>Explorar Rifas</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <th className="p-4 font-medium">Rifa</th>
                  <th className="p-4 font-medium">Número</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.map((pedido, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium">
                      <Link to={`/rifa/${pedido.rifa.id}`} className="hover:text-blue-600">
                        {pedido.rifa.titulo}
                      </Link>
                    </td>
                    <td className="p-4 font-bold text-blue-600">
                      {String(pedido.cota.numero).padStart(5, '0')}
                    </td>
                    <td className="p-4">
                      {pedido.cota.status === 'reservado' && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">RESERVADO</span>
                      )}
                      {pedido.cota.status === 'pago' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">PAGO</span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-slate-600">
                      R$ {Number(pedido.cota.precoPago || pedido.rifa.valorPorCota).toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
