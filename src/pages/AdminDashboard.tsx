import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useSiteStore } from '../store/site';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function AdminDashboard() {
  const { token } = useAuthStore();
  const { siteName: storeSiteName, logoUrl: storeLogoUrl, adminWhatsapp: storeAdminWhatsapp, fetchSettings } = useSiteStore();
  const [activeTab, setActiveTab] = useState<'rifas' | 'usuarios' | 'config'>('rifas');
  
  // States
  const [rifas, setRifas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cotasRifaId, setCotasRifaId] = useState<number | null>(null);
  const [cotas, setCotas] = useState<any[]>([]);
  
  // Form Nova Rifa
  const [editingRifaId, setEditingRifaId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [valorPorCota, setValorPorCota] = useState('');
  const [totalCotas, setTotalCotas] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);

  const [buscaNumero, setBuscaNumero] = useState('');

  // Site Settings
  const [formSiteName, setFormSiteName] = useState(storeSiteName);
  const [formLogoUrl, setFormLogoUrl] = useState(storeLogoUrl || '');
  const [formAdminWhatsapp, setFormAdminWhatsapp] = useState(storeAdminWhatsapp || '');

  useEffect(() => {
    setFormSiteName(storeSiteName);
    setFormLogoUrl(storeLogoUrl || '');
    setFormAdminWhatsapp(storeAdminWhatsapp || '');
  }, [storeSiteName, storeLogoUrl, storeAdminWhatsapp]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'rifas') {
      const res = await fetch('/api/rifas');
      setRifas(await res.json());
    } else {
      const res = await fetch('/api/admin/usuarios', { headers: { 'Authorization': `Bearer ${token}` } });
      setUsuarios(await res.json());
    }
  };

  const handleSaveRifa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingForm(true);
    try {
      if (editingRifaId) {
        await fetch(`/api/admin/rifas/${editingRifaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            titulo, descricao, imagemUrl, 
            valorPorCota: Number(valorPorCota),
            pixKey
          })
        });
      } else {
        await fetch('/api/admin/rifas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            titulo, descricao, imagemUrl, 
            valorPorCota: Number(valorPorCota), 
            totalCotas: Number(totalCotas),
            pixKey
          })
        });
      }
      cancelEdit();
      fetchData();
    } catch (e) {
      console.error("Erro ao salvar rifa", e);
    } finally {
      setLoadingForm(false);
    }
  };

  const handleEditRifa = (rifa: any) => {
    setEditingRifaId(rifa.id);
    setTitulo(rifa.titulo);
    setDescricao(rifa.descricao || '');
    setImagemUrl(rifa.imagemUrl || '');
    setValorPorCota(rifa.valorPorCota);
    setPixKey(rifa.pixKey || '');
    setTotalCotas(rifa.totalCotas?.toString() || '');
  };

  const cancelEdit = () => {
    setEditingRifaId(null);
    setTitulo(''); setDescricao(''); setImagemUrl(''); setValorPorCota(''); setTotalCotas(''); setPixKey('');
  };

  const loadCotas = async (rifaId: number) => {
    setCotasRifaId(rifaId);
    const res = await fetch(`/api/admin/rifas/${rifaId}/cotas`, { headers: { 'Authorization': `Bearer ${token}` } });
    setCotas(await res.json());
  };

  const aprovarPagamento = async (cotaId: number) => {
    await fetch(`/api/admin/cotas/${cotaId}/aprovar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Atualizar lista
    if (cotasRifaId) loadCotas(cotasRifaId);
  };

  const cancelarReserva = async (cotaId: number) => {
    await fetch(`/api/admin/cotas/${cotaId}/cancelar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Atualizar lista
    if (cotasRifaId) loadCotas(cotasRifaId);
  };

  const aprovarTodasUsuario = async (userId: number) => {
    await fetch(`/api/admin/rifas/${cotasRifaId}/usuarios/${userId}/aprovar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (cotasRifaId) loadCotas(cotasRifaId);
  };

  const cancelarTodasUsuario = async (userId: number) => {
    await fetch(`/api/admin/rifas/${cotasRifaId}/usuarios/${userId}/cancelar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (cotasRifaId) loadCotas(cotasRifaId);
  };

  const cotasReservadasAgrupadas = Object.values(
    cotas
      .filter(item => item.cota.status === 'reservado' && item.user)
      .reduce((acc, item) => {
        const uId = item.user.id;
        if (!acc[uId]) {
          acc[uId] = { user: item.user, cotas: [] };
        }
        acc[uId].cotas.push(item.cota);
        return acc;
      }, {} as Record<number, any>)
  );

  const cotasFiltradas = buscaNumero
    ? cotas.filter(c => String(c.cota.numero).padStart(5, '0').includes(buscaNumero) || String(c.cota.numero) === buscaNumero)
    : [];

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ siteName: formSiteName, logoUrl: formLogoUrl, adminWhatsapp: formAdminWhatsapp })
      });
      fetchSettings();
      alert('Configurações salvas!');
    } catch (error) {
      console.error('Erro ao salvar configurações', error);
      alert('Erro ao salvar configurações');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Painel Administrativo</h1>
      
      <div className="flex gap-4 mb-6">
        <Button variant={activeTab === 'rifas' ? 'default' : 'outline'} onClick={() => { setActiveTab('rifas'); setCotasRifaId(null); }}>
          Gerenciar Rifas
        </Button>
        <Button variant={activeTab === 'usuarios' ? 'default' : 'outline'} onClick={() => { setActiveTab('usuarios'); setCotasRifaId(null); }}>
          Usuários
        </Button>
        <Button variant={activeTab === 'config' ? 'default' : 'outline'} onClick={() => { setActiveTab('config'); setCotasRifaId(null); }}>
          Configurações do Site
        </Button>
      </div>

      {activeTab === 'rifas' && !cotasRifaId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold mb-4">Rifas Cadastradas</h2>
            {rifas.map(rifa => (
              <div key={rifa.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{rifa.titulo}</h3>
                  <p className="text-sm text-slate-500">R$ {rifa.valorPorCota} | {rifa.totalCotas} cotas</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleEditRifa(rifa)}>Editar</Button>
                  <Button variant="outline" onClick={() => loadCotas(rifa.id)}>Ver Cotas</Button>
                </div>
              </div>
            ))}
            {rifas.length === 0 && <p className="text-slate-500">Nenhuma rifa cadastrada.</p>}
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h2 className="text-xl font-bold mb-4">{editingRifaId ? 'Editar Rifa' : 'Nova Rifa'}</h2>
            <form onSubmit={handleSaveRifa} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Título</label>
                <Input value={titulo} onChange={e=>setTitulo(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Descrição</label>
                <Input value={descricao} onChange={e=>setDescricao(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Imagem da Rifa</label>
                <Input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setImagemUrl(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                {imagemUrl && <img src={imagemUrl} alt="Preview" className="mt-2 h-20 object-cover rounded" />}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Valor por Cota (Ex: 10.50)</label>
                <Input type="number" step="0.01" value={valorPorCota} onChange={e=>setValorPorCota(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Sua Chave PIX</label>
                <Input value={pixKey} onChange={e=>setPixKey(e.target.value)} placeholder="Email, CPF, Telefone ou Chave Aleatória" />
              </div>
              {!editingRifaId && (
                <div>
                  <label className="block text-xs font-medium mb-1">Total de Cotas (Ex: 1000)</label>
                  <Input type="number" value={totalCotas} onChange={e=>setTotalCotas(e.target.value)} required />
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loadingForm}>
                  {loadingForm ? 'Salvando...' : (editingRifaId ? 'Salvar Alterações' : 'Criar Rifa')}
                </Button>
                {editingRifaId && (
                  <Button type="button" variant="outline" onClick={cancelEdit}>Cancelar</Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'rifas' && cotasRifaId && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Gerenciar Cotas da Rifa #{cotasRifaId}</h2>
            <Button variant="outline" onClick={() => setCotasRifaId(null)}>Voltar</Button>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">Aprovações Pendentes</h3>
            {cotasReservadasAgrupadas.length === 0 ? (
              <p className="text-slate-500">Não há reservas pendentes no momento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Qtd. Cotas</th>
                      <th className="p-3">Números</th>
                      <th className="p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cotasReservadasAgrupadas.map((grupo: any, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <div className="font-medium">{grupo.user.nome}</div>
                          <div className="text-xs text-slate-500">{grupo.user.telefone}</div>
                        </td>
                        <td className="p-3 font-bold">{grupo.cotas.length}</td>
                        <td className="p-3 font-mono text-xs text-slate-500 max-w-[200px] break-words">
                          {grupo.cotas.map((c: any) => String(c.numero).padStart(5, '0')).join(', ')}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => aprovarTodasUsuario(grupo.user.id)}>Aprovar Tudo</Button>
                            <Button size="sm" variant="destructive" onClick={() => cancelarTodasUsuario(grupo.user.id)}>Cancelar Tudo</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Buscar Número</h3>
            <div className="mb-4">
              <Input 
                placeholder="Digite o número da cota (Ex: 00001)..." 
                value={buscaNumero}
                onChange={e => setBuscaNumero(e.target.value)}
              />
            </div>
            
            {buscaNumero && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3">Número</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Usuário</th>
                      <th className="p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cotasFiltradas.length > 0 ? cotasFiltradas.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-mono">{String(item.cota.numero).padStart(5, '0')}</td>
                        <td className="p-3">
                          {item.cota.status === 'disponivel' && <span className="text-slate-400">Disponível</span>}
                          {item.cota.status === 'reservado' && <span className="text-amber-600 font-bold">Reservado</span>}
                          {item.cota.status === 'pago' && <span className="text-green-600 font-bold">Pago</span>}
                        </td>
                        <td className="p-3">
                          {item.user ? (
                            <>
                              <div className="font-medium">{item.user.nome}</div>
                              <div className="text-xs text-slate-500">{item.user.telefone}</div>
                            </>
                          ) : '-'}
                        </td>
                        <td className="p-3">
                          {item.cota.status === 'reservado' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => aprovarPagamento(item.cota.id)}>Confirmar Pgto</Button>
                              <Button size="sm" variant="destructive" onClick={() => cancelarReserva(item.cota.id)}>Cancelar</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-500">Nenhuma cota encontrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Usuários Cadastrados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3">ID</th>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td className="p-3">{u.id}</td>
                    <td className="p-3 font-medium">{u.nome}</td>
                    <td className="p-3">{u.telefone}</td>
                    <td className="p-3">{u.isAdmin ? 'Sim' : 'Não'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 max-w-2xl">
          <h2 className="text-xl font-bold mb-4">Configurações do Site</h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Site</label>
              <Input 
                value={formSiteName} 
                onChange={e => setFormSiteName(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Logo (Imagem)</label>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setFormLogoUrl(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} 
              />
              <p className="text-xs text-slate-500 mt-1">Selecione uma imagem para o topo do site (opcional). Se não houver, aparecerá o ícone padrão.</p>
              {formLogoUrl && (
                <div className="mt-4 p-4 border rounded-xl bg-slate-50 inline-block">
                  <p className="text-xs text-slate-500 mb-2">Preview da Logo:</p>
                  <img src={formLogoUrl} alt="Logo Preview" className="h-12 object-contain" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp do Administrador</label>
              <Input 
                value={formAdminWhatsapp} 
                onChange={e => setFormAdminWhatsapp(e.target.value)} 
                placeholder="Ex: 5511999999999 (apenas números)" 
              />
              <p className="text-xs text-slate-500 mt-1">Será usado para receber os comprovantes via WhatsApp.</p>
            </div>
            <Button type="submit" className="w-full">Salvar Configurações</Button>
          </form>
        </div>
      )}

    </div>
  );
}
