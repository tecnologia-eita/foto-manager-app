import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import logo from '../assets/icone-branco.svg';

function NavIcon({ icon, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
        active
          ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
      }`}
    >
      {icon}
    </button>
  );
}

// Ícone: colunas (produtos)
const IconSquares = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
    <path d="M15 3.75H9v16.5h6V3.75zM16.5 20.25h3.375c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H16.5v16.5zM4.125 3.75H7.5v16.5H4.125a1.125 1.125 0 01-1.125-1.125V4.875c0-.621.504-1.125 1.125-1.125z"/>
  </svg>
);

// Ícone: foguete (lançamentos)
const IconRocket = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
    <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-4.131A15.838 15.838 0 016.382 15H2.25a.75.75 0 01-.75-.75 6.75 6.75 0 017.815-6.666zM15 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd"/>
    <path d="M5.26 17.242a.75.75 0 10-.897-1.203 5.243 5.243 0 00-2.05 5.022.75.75 0 00.625.627 5.243 5.243 0 005.022-2.051.75.75 0 10-1.202-.897 3.744 3.744 0 01-3.008 1.51c0-1.23.592-2.323 1.51-3.008z"/>
  </svg>
);

// Ícone: sync
const IconSync = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
    <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd"/>
  </svg>
);

// Ícone: sair
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
    <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd"/>
  </svg>
);

export default function Sidebar({ onSync, syncando }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, usuario } = useAuth();

  const isProdutos = location.pathname === '/';
  const isLancamentos = location.pathname === '/lancamentos';

  return (
    <aside className="w-[76px] mt-1 mb-3 ml-3 bg-gray-950 rounded-4xl flex flex-col items-center py-5 shrink-0 select-none">
      {/* Logo */}
      <div className="w-11 h-11 bg-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-600/40">
        <img src={logo} alt="Logo" className="w-6 h-6" style={{ filter: 'brightness(0) invert(1)' }} />
      </div>

      {/* Nav principal */}
      <nav className="flex flex-col items-center gap-2">
        <NavIcon
          icon={<IconSquares />}
          active={isProdutos}
          onClick={() => navigate('/')}
          title="Produtos"
        />
        <NavIcon
          icon={<IconRocket />}
          active={isLancamentos}
          onClick={() => navigate('/lancamentos')}
          title="Lançamentos"
        />
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Ações bottom */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onSync}
          disabled={syncando}
          title={syncando ? 'Sincronizando...' : 'Sincronizar produtos'}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            syncando
              ? 'text-brand-400 animate-spin'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
          }`}
        >
          <IconSync />
        </button>

        <button
          onClick={logout}
          title={`Sair (${usuario?.nome || ''})`}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
        >
          <IconLogout />
        </button>
      </div>
    </aside>
  );
}
