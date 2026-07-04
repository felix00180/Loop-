import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RifaDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [rifa, setRifa] = useState<any>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/rifas/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setRifa(data);
        setLoading(false);
      });
  }, [id]);

  const handleComprar = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/checkout/${id}`, { state: { quantidade } });
  };

  if (loading) return <div className="text-center py-12">Carregando...</div>;
  if (error || !rifa) return <div className="text-center py-12 text-red-500">{error || 'Rifa não encontrada'}</div>;

  const percent = Math.round((rifa.vendidas / rifa.totalCotas) * 100) || 0;
  const disponiveis = rifa.totalCotas - rifa.vendidas;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden">
        {rifa.imagemUrl ? (
          <img src={rifa.imagemUrl} alt={rifa.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">Sem imagem</div>
        )}
      </div>
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold mb-2">{rifa.titulo}</h1>
        {rifa.descricao && <p className="text-slate-600 mb-6">{rifa.descricao}</p>}
        
        <div className="bg-blue-50 text-blue-900 p-4 rounded-xl mb-6">
          <div className="text-sm font-medium mb-1">Por apenas</div>
          <div className="text-4xl font-black">R$ {Number(rifa.valorPorCota).toFixed(2).replace('.', ',')}</div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Progresso de Vendas</span>
            <span>{percent}% vendido</span>
          </div>
          <Progress value={percent} className="h-3 bg-slate-200" />
          <div className="text-xs text-slate-500 mt-2 text-right">
            {disponiveis} cotas disponíveis de {rifa.totalCotas}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">Quantidade de cotas (aleatórias)</label>
          <div className="flex gap-4">
            <Input 
              type="number" 
              min={1} 
              max={Math.min(100, disponiveis)} 
              value={quantidade} 
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="w-24 text-center font-bold text-lg"
            />
            <Button onClick={handleComprar} className="flex-1 text-lg h-auto py-3" disabled={disponiveis === 0}>
              {disponiveis === 0 ? 'Esgotado' : 'Comprar Cotas'}
            </Button>
          </div>
          <div className="mt-3 text-center text-slate-500 font-medium">
            Total: R$ {(quantidade * Number(rifa.valorPorCota)).toFixed(2).replace('.', ',')}
          </div>
        </div>
      </div>
    </div>
  );
}
