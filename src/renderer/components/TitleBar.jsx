import React, { useEffect, useState } from 'react';

// Botões de janela em SVG (traços finos, estilo moderno)
const IconMin = () => (
  <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.2" /></svg>
);
const IconMax = () => (
  <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1.2" y="1.2" width="7.6" height="7.6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
);
const IconRestore = () => (
  <svg width="10" height="10" viewBox="0 0 10 10">
    <rect x="1.2" y="3" width="5.8" height="5.8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M3.2 3V1.6h5.2V6.8H7" fill="none" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
const IconClose = () => (
  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
);

export default function TitleBar() {
  const [maximizado, setMaximizado] = useState(false);
  const ctrl = window.electronAPI?.window;

  useEffect(() => {
    if (!ctrl) return;
    ctrl.isMaximized().then(setMaximizado).catch(() => {});
    const off = ctrl.onMaximizeChange(setMaximizado);
    return off;
  }, []);

  // Em ambiente sem Electron (ex.: build web), não renderiza a barra
  if (!ctrl) return null;

  return (
    <header
      className="h-9 shrink-0 bg-gray-100 flex items-center justify-between pl-4 pr-0 select-none"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <span className="text-[11px] font-medium text-gray-400 tracking-wide">
        Foto Manager <span className="text-gray-300">— Eita Casa Perfeita</span>
      </span>

      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={() => ctrl.minimize()}
          title="Minimizar"
          className="h-full w-11 flex items-center justify-center text-gray-400 hover:bg-gray-200/70 hover:text-gray-600 transition-colors"
        >
          <IconMin />
        </button>
        <button
          onClick={() => ctrl.toggleMaximize()}
          title={maximizado ? 'Restaurar' : 'Maximizar'}
          className="h-full w-11 flex items-center justify-center text-gray-400 hover:bg-gray-200/70 hover:text-gray-600 transition-colors"
        >
          {maximizado ? <IconRestore /> : <IconMax />}
        </button>
        <button
          onClick={() => ctrl.close()}
          title="Fechar"
          className="h-full w-11 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-colors"
        >
          <IconClose />
        </button>
      </div>
    </header>
  );
}
