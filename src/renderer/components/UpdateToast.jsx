import React, { useEffect, useState } from 'react';

// Indicador de atualização do app (canto inferior direito).
// Mostra "Baixando atualização…" e, ao terminar, "Reiniciar para aplicar".
export default function UpdateToast() {
  const [status, setStatus] = useState(null); // { state: 'downloading'|'ready'|... , version }

  useEffect(() => {
    // consulta o status atual (caso o update já tenha começado antes do React montar)
    window.electronAPI?.update?.getStatus?.().then(s => { if (s) setStatus(s); }).catch(() => {});
    const off = window.electronAPI?.update?.onStatus?.(s => setStatus(s));
    return () => { if (typeof off === 'function') off(); };
  }, []);

  const state = status?.state;
  if (state !== 'downloading' && state !== 'ready') return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 text-sm animate-[fadeIn_.2s_ease]">
      {state === 'downloading' ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
          <span>Baixando atualização…</span>
        </>
      ) : (
        <>
          <span className="text-green-400">✓</span>
          <span>Atualização pronta{status.version ? ` (${status.version})` : ''}</span>
          <button
            onClick={() => window.electronAPI?.update?.restart?.()}
            className="ml-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
          >
            Reiniciar agora
          </button>
        </>
      )}
    </div>
  );
}
