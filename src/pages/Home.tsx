import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Rifa {
  id: number;
  titulo: string;
  imagemUrl: string;
  valorPorCota: string;
  dataSorteio: string | null;
}

export default function Home() {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rifas')
      .then(res => res.json())
      .then(data => {
        setRifas(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Carregando rifas...</div>;
  }

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Concorra a prêmios incríveis!</h1>
        <p className="text-slate-500 text-lg">Escolha sua rifa, reserve seus números e boa sorte.</p>
      </div>
      
      {rifas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
          Nenhuma rifa disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {rifas.map(rifa => (
            <div key={rifa.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
              <div className="aspect-video bg-slate-100 overflow-hidden">
                {rifa.imagemUrl ? (
                  <img src={rifa.imagemUrl} alt={rifa.titulo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">Sem imagem</div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg mb-1 line-clamp-1">{rifa.titulo}</h3>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-2xl font-black text-blue-600">R$ {Number(rifa.valorPorCota).toFixed(2).replace('.', ',')}</span>
                  <span className="text-slate-500 text-sm mb-1">/ cota</span>
                </div>
                {rifa.dataSorteio && (
                  <div className="text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded-lg inline-block">
                    Sorteio: <span className="font-medium">{format(new Date(rifa.dataSorteio), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                )}
                <Link to={`/rifa/${rifa.id}`}>
                  <Button className="w-full">Ver Rifa</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-16 mb-12">
        <h2 className="text-2xl font-bold text-center mb-8">Perguntas Frequentes (FAQ)</h2>
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-lg mb-2">Como faço para comprar uma cota?</h3>
            <p className="text-slate-600">
              Escolha a rifa desejada, clique em "Ver Rifa", selecione os números disponíveis que deseja comprar 
              e clique em "Reservar". Você precisará fazer login ou criar uma conta rapidamente usando seu telefone.
            </p>
          </div>
          
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-lg mb-2">Como funciona o pagamento?</h3>
            <p className="text-slate-600">
              Após reservar seus números, você terá um tempo limite para realizar o pagamento (geralmente via PIX). 
              Caso o pagamento não seja confirmado dentro do prazo, as cotas voltarão a ficar disponíveis para outras pessoas.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-lg mb-2">Como confirmar meu pagamento?</h3>
            <p className="text-slate-600">
              Após realizar o PIX, envie o comprovante de pagamento para o administrador da rifa (os dados estarão 
              na página "Minhas Cotas") e aguarde a aprovação. O administrador dará baixa manual nas suas reservas.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-lg mb-2">Como sei se ganhei?</h3>
            <p className="text-slate-600">
              O resultado do sorteio é baseado nos números da Loteria Federal (ou outro método previamente informado).
              Entraremos em contato com o ganhador através do número de telefone cadastrado no momento da reserva.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
