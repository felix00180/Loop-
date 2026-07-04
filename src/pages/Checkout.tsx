import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/button';
import { Copy, CheckCircle2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

function generatePixPayload(pixKey: string, amount: number, name: string = 'Sorte Rapida', city: string = 'Sao Paulo') {
  function crc16(str: string): string {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
      crc ^= str.charCodeAt(c) << 8;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
        else crc = crc << 1;
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }

  function formatTLV(id: string, value: string) {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
  }

  const payloadFormat = formatTLV('00', '01');
  const merchantAccountInfo = formatTLV('26', formatTLV('00', 'br.gov.bcb.pix') + formatTLV('01', pixKey));
  const merchantCategoryCode = formatTLV('52', '0000');
  const transactionCurrency = formatTLV('53', '986');
  const transactionAmount = formatTLV('54', amount.toFixed(2));
  const countryCode = formatTLV('58', 'BR');
  const merchantName = formatTLV('59', name.substring(0, 25) || 'Admin');
  const merchantCity = formatTLV('60', city.substring(0, 15) || 'Cidade');
  const additionalData = formatTLV('62', formatTLV('05', '***'));

  let payload = `${payloadFormat}${merchantAccountInfo}${merchantCategoryCode}${transactionCurrency}${transactionAmount}${countryCode}${merchantName}${merchantCity}${additionalData}6304`;
  payload += crc16(payload);
  return payload;
}

export default function Checkout() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const quantidade = location.state?.quantidade || 1;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const reservar = async () => {
      try {
        const res = await fetch(`/api/rifas/${id}/reservar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ quantidade })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Erro ao reservar');
        
        setResultado(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    reservar();
  }, [id, quantidade, token]);

  const pixKey = resultado?.rifa?.pixKey || 'exemplo@pix.com';
  const amount = Number(resultado?.valorTotal) || 0;
  const pixCode = generatePixPayload(pixKey, amount);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (loading) return <div className="text-center py-12">Processando sua reserva...</div>;
  if (error) return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
      <h2 className="text-xl font-bold mb-2">Ops, algo deu errado</h2>
      <p className="text-slate-600 mb-6">{error}</p>
      <Button onClick={() => navigate(`/rifa/${id}`)} className="w-full">Voltar para a Rifa</Button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto mt-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
      <div className="text-center mb-6">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Cotas Reservadas!</h1>
        <p className="text-slate-500">Faça o pagamento para confirmar sua participação.</p>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
        <div className="flex justify-between mb-2">
          <span className="text-slate-500">Quantidade:</span>
          <span className="font-medium">{resultado?.cotas.length} cotas</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-slate-500">Seus Números:</span>
          <span className="font-medium text-blue-600 text-right break-words max-w-[200px]">
            {resultado?.cotas.map((c: any) => String(c.numero).padStart(5, '0')).join(', ')}
          </span>
        </div>
        <div className="flex justify-between pt-4 border-t border-slate-200 mt-2">
          <span className="font-bold text-slate-700">Total a Pagar:</span>
          <span className="font-black text-xl text-green-600">R$ {amount.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="bg-white w-48 h-48 mx-auto rounded-xl flex items-center justify-center mb-4 overflow-hidden border border-slate-200">
          <QRCodeCanvas value={pixCode} size={160} />
        </div>
        
        <p className="text-center text-sm font-medium mb-2">PIX Copia e Cola</p>
        <div className="flex bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
          <input 
            type="text" 
            value={pixCode} 
            readOnly 
            className="flex-1 bg-transparent px-3 text-xs text-slate-500 outline-none"
          />
          <button 
            onClick={handleCopy}
            className="bg-blue-600 text-white p-3 hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        {copiado && <p className="text-green-600 text-xs text-center mt-2 font-medium">Código copiado!</p>}
      </div>

      <div className="space-y-3 text-center">
        <p className="text-xs text-slate-500 mb-4">Após o pagamento, o status será atualizado automaticamente em instantes.</p>
        <Link to="/meus-pedidos">
          <Button variant="outline" className="w-full">Ver Meus Pedidos</Button>
        </Link>
      </div>
    </div>
  );
}
