import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useSyncCtx } from '../components/Layout';

function StatusBadge({ totalFotos, fotosSincronizadas, fotosPendentes }) {
  if (totalFotos === 0) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Sem fotos</span>;
  if (fotosPendentes > 0 && fotosSincronizadas === 0) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">No Drive</span>;
  if (fotosSincronizadas === totalFotos) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Sincronizado</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">Parcial</span>;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalVariacoes, setTotalVariacoes] = useState(0);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [statusSync, setStatusSync] = useState(null);
  const navigate = useNavigate();
  const { lastSync } = useSyncCtx();

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await api.getProdutos({ busca, pagina, limite: 50 });
      setProdutos(data.produtos);
      setTotal(data.total);
      if (data.total_variacoes) setTotalVariacoes(data.total_variacoes);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }, [busca, pagina]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { if (lastSync) carregar(); }, [lastSync]);
  useEffect(() => { api.getStatusSync().then(setStatusSync).catch(() => {}); }, [lastSync]);

  const totalPaginas = Math.ceil(total / 50);

  return (
    <div className="h-full">
      {/* Cabeçalho da página */}
      <div className="bg-white rounded-2xl px-6 py-4 mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900 text-lg leading-tight">Produtos</h1>
          {statusSync ? (
            <p className="text-xs text-gray-400 mt-0.5">
              {total} produtos · sync {statusSync.ultimo_sync ? new Date(statusSync.ultimo_sync).toLocaleString('pt-BR') : 'nunca'}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">Eita Casa Perfeita</p>
          )}
        </div>
        <input
          type="text"
          value={busca}
          onChange={e => { setBusca(e.target.value); setPagina(1); }}
          placeholder="Buscar por nome ou SKU..."
          className="w-64 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-sm placeholder-gray-400"
        />
      </div>

      {/* Grid de produtos */}
      {carregando ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Carregando...</div>
      ) : produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-gray-300">
              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">
            {total === 0 ? 'Nenhum produto. Use o sync para importar.' : 'Nenhum resultado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {produtos.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="bg-white rounded-2xl hover:shadow-md hover:scale-[1.02] cursor-pointer transition-all overflow-hidden border border-transparent hover:border-brand-200"
            >
              <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                {parseInt(p.total_fotos_drive) > 0 ? (
                  <div className="w-full h-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-brand-300">
                      <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-gray-200">
                    <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z"/>
                    <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd"/>
                  </svg>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-gray-800 truncate leading-tight" title={p.nome}>{p.nome}</p>
                <p className="text-[10px] text-gray-400 mb-1.5">{p.sku}</p>
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
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={pagina === 1}
            onClick={() => setPagina(p => p - 1)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 text-gray-600"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-400 px-2">{pagina} / {totalPaginas}</span>
          <button
            disabled={pagina === totalPaginas}
            onClick={() => setPagina(p => p + 1)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 text-gray-600"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
