import React, { useState, createContext, useContext, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { api } from '../api';

const SyncCtx = createContext({ syncando: false, lastSync: 0 });
export const useSyncCtx = () => useContext(SyncCtx);

export default function Layout() {
  const [syncando, setSyncando] = useState(false);
  const [lastSync, setLastSync] = useState(0);
  const pollRef = useRef(null);

  // Limpa o polling se o componente desmontar no meio de um sync
  useEffect(() => () => clearInterval(pollRef.current), []);

  async function handleSync() {
    setSyncando(true);
    try {
      await api.triggerSync();
      // Marca o ponto de partida e faz polling do status real até concluir
      // (em vez de assumir 3s fixos, que causava refetch antes do sync terminar)
      const inicio = await api.getStatusSync().then(s => s.ultimo_sync).catch(() => null);
      let tentativas = 0;
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        tentativas++;
        try {
          const status = await api.getStatusSync();
          const concluiu = status.ultimo_sync && status.ultimo_sync !== inicio;
          if (concluiu || tentativas >= 60) { // teto de ~2min
            clearInterval(pollRef.current);
            setSyncando(false);
            setLastSync(Date.now());
          }
        } catch {
          if (tentativas >= 60) { clearInterval(pollRef.current); setSyncando(false); }
        }
      }, 2000);
    } catch (err) {
      alert('Erro ao iniciar sync: ' + err.message);
      setSyncando(false);
    }
  }

  return (
    <SyncCtx.Provider value={{ syncando, lastSync }}>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar onSync={handleSync} syncando={syncando} />
        <main className="flex-1 overflow-y-auto p-3 min-w-0">
          <Outlet />
        </main>
      </div>
    </SyncCtx.Provider>
  );
}
