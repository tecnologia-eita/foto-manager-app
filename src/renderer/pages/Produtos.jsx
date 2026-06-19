import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../components/AuthContext';

const STATUS_COR = {
  ok: 'bg-green-100 text-green-700',
  parcial: 'bg-yellow-100 text-yellow-700',
  pendente: 'bg-gray-100 text-gray-500',
};

function StatusBadge({ totalFotos, fotosSincronizadas, fotosPendentes }) {
  if (totalFotos === 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Sem fotos</span>;
  if (fotosPendentes > 0 && fotosSincronizadas === 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Drive — não publicado</span>;
  if (fotosSincronizadas === totalFotos) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Sincronizado</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Parcial</span>;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [total, setTotal] = useState(0);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [syncando, setSyncando] = useState(false);
  const [statusSync, setStatusSync] = useState(null);
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await api.getProdutos({ busca, pagina, limite: 50 });
      setProdutos(data.produtos);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }, [busca, pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    api.getStatusSync().then(setStatusSync).catch(() => {});
  }, []);

  async function handleSync() {
    setSyncando(true);
    try {
      await api.triggerSync();
      setTimeout(() => {
        api.getStatusSync().then(setStatusSync).catch(() => {});
        carregar();
        setSyncando(false);
      }, 3000);
    } catch (err) {
      alert('Erro ao iniciar sync: ' + err.message);
      setSyncando(false);
    }
  }

  const totalPaginas = Math.ceil(total / 50);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📸</span>
          <div>
            <h1 className="font-bold text-gray-800">Foto Manager</h1>
            <p className="text-xs text-gray-400">Eita Casa Perfeita</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {statusSync && (
            <span className="text-xs text-gray-400">
              Último sync: {statusSync.ultimo_sync ? new Date(statusSync.ultimo_sync).toLocaleString('pt-BR') : 'nunca'}
              {' · '}{statusSync.total} produtos
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncando}
            className="text-sm px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {syncando ? '⟳ Sincronizando...' : '⟳ Sync produtos'}
          </button>
          <div className="text-sm text-gray-600">{usuario?.nome}</div>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">Sair</button>
        </div>
      </div>

      <div className="p-6">
        {/* Busca */}
        <div className="mb-4">
          <input
            type="text"
            value={busca}
            onChange={e => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar por nome ou SKU..."
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
          />
        </div>

        {/* Grid de produtos */}
        {carregando ? (
          <div className="text-center py-20 text-gray-400">Carregando...</div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            {total === 0 ? 'Nenhum produto. Faça o sync para importar.' : 'Nenhum resultado para esta busca.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {produtos.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/produto/${p.id}`)}
                className="bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer transition-all overflow-hidden"
              >
                {/* Thumbnail — primeira foto do drive ou placeholder */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  {parseInt(p.total_fotos_drive) > 0 ? (
                    <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                      <span className="text-3xl">🖼️</span>
                    </div>
                  ) : (
                    <span className="text-gray-300 text-3xl">📦</span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-800 truncate" title={p.nome}>{p.nome}</p>
                  <p className="text-xs text-gray-400 mb-1">{p.sku}</p>
                  <StatusBadge
                    totalFotos={parseInt(p.total_fotos_drive)}
                    fotosSincronizadas={parseInt(p.fotos_sincronizadas)}
                    fotosPendentes={parseInt(p.fotos_pendentes)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              disabled={pagina === 1}
              onClick={() => setPagina(p => p - 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-500">{pagina} / {totalPaginas}</span>
            <button
              disabled={pagina === totalPaginas}
              onClick={() => setPagina(p => p + 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
