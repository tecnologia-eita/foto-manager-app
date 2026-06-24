import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, driveImg } from '../api';

const IconImagem = ({ cls }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
    <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd"/>
  </svg>
);

function BannerThumb({ banner }) {
  const [erro, setErro] = useState(false);
  const url = driveImg(banner.capa_file_id, 600);
  if (url && !erro) {
    return <img src={url} alt={banner.nome} loading="lazy" onError={() => setErro(true)} className="w-full h-full object-contain" referrerPolicy="no-referrer" />;
  }
  return (
    <div className="w-full h-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center">
      <IconImagem cls="w-8 h-8 text-brand-300" />
    </div>
  );
}

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const navigate = useNavigate();

  const carregar = useCallback(async () => {
    setCarregando(true);
    try { const d = await api.getBanners(); setBanners(d.banners || []); }
    catch (e) { console.error(e); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function criar() {
    const nome = novoNome.trim() || 'Novo banner';
    setCriando(true);
    try {
      const b = await api.criarBanner(nome);
      setNovoNome('');
      navigate(`/banner/${b.id}`);
    } catch (e) { alert(e.message); }
    finally { setCriando(false); }
  }

  return (
    <div className="min-h-full">
      <div className="bg-white rounded-2xl px-6 py-4 mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900 text-lg leading-tight">Banners do site</h1>
          <p className="text-xs text-gray-400 mt-0.5">Imagens leves em WebP — Desktop, Mobile e Mini</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') criar(); }}
            placeholder="Nome do banner..."
            className="w-56 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-sm placeholder-gray-400"
          />
          <button
            onClick={criar}
            disabled={criando}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-xl hover:bg-brand-700 disabled:opacity-40 transition"
          >
            {criando ? 'Criando…' : '+ Novo banner'}
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
              <div className="aspect-[16/6] bg-gray-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                <div className="h-2.5 w-1/4 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <IconImagem cls="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">Nenhum banner ainda. Crie o primeiro acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {banners.map(b => (
            <div
              key={b.id}
              onClick={() => navigate(`/banner/${b.id}`)}
              className="bg-white rounded-2xl hover:shadow-md hover:scale-[1.01] cursor-pointer transition-all overflow-hidden border border-transparent hover:border-brand-200"
            >
              <div className="aspect-[16/6] bg-gray-50 flex items-center justify-center overflow-hidden checkerboard">
                <BannerThumb banner={b} />
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-800 truncate leading-tight" title={b.nome}>{b.nome}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{b.total_imagens || 0} imagem{(b.total_imagens || 0) !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
