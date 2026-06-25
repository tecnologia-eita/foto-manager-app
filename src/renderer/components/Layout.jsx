import React, { useState, createContext, useContext, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { api } from '../api';

const SyncCtx = createContext({ syncando: false, lastSync: 0 });
export const useSyncCtx = () => useContext(SyncCtx);

export default function Layout() {
  const [syncando, setSyncando] = useState(false);
  const [progresso, setProgresso] = useState(null);
  const [lastSync, setLastSync] = useState(0);
  const pollRef = useRef(null);
  const vimRodando = useRef(false);

  // Limpa o polling se o componente desmontar no meio de um sync
  useEffect(() => () => clearInterval(pollRef.current), []);

  async function handleSync() {
    setSyncando(true);
    setProgresso({ fase: 'Iniciando…', total: 0, processados: 0 });
    vimRodando.current = false;
    try {
      await api.triggerSync();
      const inicio = await api.getStatusSync().then(s => s.ultimo_sync).catch(() => null);
      let tentativas = 0;
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        tentativas++;
        try {
          const status = await api.getStatusSync();
          if (status.progresso) {
            setProgresso(status.progresso);
            if (status.progresso.rodando) vimRodando.current = true;
          }
          // Conclui quando o progresso para de rodar (depois de ter rodado) ou o ultimo_sync muda
          const progConcluiu = vimRodando.current && status.progresso && !status.progresso.rodando;
          const syncConcluiu = status.ultimo_sync && status.ultimo_sync !== inicio;
          if (progConcluiu || syncConcluiu || tentativas >= 120) {
            clearInterval(pollRef.current);
            setSyncando(false);
            setProgresso(null);
            setLastSync(Date.now());
          }
        } catch {
          if (tentativas >= 120) { clearInterval(pollRef.current); setSyncando(false); setProgresso(null); }
        }
      }, 1500);
    } catch (err) {
      alert('Erro ao iniciar sync: ' + err.message);
      setSyncando(false);
      setProgresso(null);
    }
  }

  const pct = progresso?.total > 0 ? Math.min(100, Math.round((progresso.processados / progresso.total) * 100)) : 0;

  return (
    <SyncCtx.Provider value={{ syncando, lastSync }}>
      <div className="flex h-full bg-gray-100 overflow-hidden">
        <Sidebar onSync={handleSync} syncando={syncando} />
        <main className="flex-1 overflow-y-auto px-3 pb-6 pt-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Barra de progresso do sync */}
      {syncando && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 px-5 py-3 w-[22rem]">
          <div className="flex items-center justify-between mb-2 gap-3">
            <span className="text-xs font-semibold text-gray-700 truncate">{progresso?.fase || 'Sincronizando…'}</span>
            {progresso?.total > 0 && (
              <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">{progresso.processados}/{progresso.total} · {pct}%</span>
            )}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            {progresso?.total > 0 ? (
              <div className="h-full bg-brand-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            ) : (
              <div className="h-full bg-brand-500 rounded-full w-1/3 animate-pulse" />
            )}
          </div>
        </div>
      )}
    </SyncCtx.Provider>
  );
}
