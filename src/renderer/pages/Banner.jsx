import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, driveImg, uploadBannerFiles, baixarBannerArquivo } from '../api';

const SLOTS = [
  { key: 'desktop', label: 'Banner Desktop', dica: 'Imagem larga para telas grandes', cols: 'grid-cols-2 lg:grid-cols-3' },
  { key: 'mobile', label: 'Banner Mobile', dica: 'Versão para celular', cols: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6' },
  { key: 'mini', label: 'Mini Banner', dica: 'Faixa/banner pequeno', cols: 'grid-cols-2 sm:grid-cols-4' },
];

function bytesFmt(n) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zM9.75 9a.75.75 0 01.75.75v9a.75.75 0 01-1.5 0v-9A.75.75 0 019.75 9zM15 9.75a.75.75 0 00-1.5 0v9a.75.75 0 001.5 0v-9z" clipRule="evenodd"/>
  </svg>
);

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd"/>
  </svg>
);

const IconGrip = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 opacity-70">
    <path d="M9 5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM9 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM9 19a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM18 5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM18 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM18 19a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
  </svg>
);

// Card de imagem arrastável
function BannerFoto({ foto, index, onRemover, onBaixar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: foto.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={style}
      {...attributes}
      {...listeners}
      title="Arraste para reordenar"
      className="group relative rounded-xl overflow-hidden border border-gray-100 checkerboard cursor-grab active:cursor-grabbing touch-none">
      {/* Número de ordem (indicador; arrastar funciona em qualquer ponto da imagem) */}
      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-0.5 h-5 pl-0.5 pr-1.5 bg-black/55 group-hover:bg-black/75 text-white text-[11px] font-bold rounded-full transition-colors">
        <IconGrip />
        <span>{index + 1}</span>
      </div>

      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
        <button onPointerDown={e => e.stopPropagation()} onClick={() => onBaixar(foto)} title="Baixar WebP"
          className="w-7 h-7 rounded-lg bg-white/90 text-brand-700 hover:bg-white flex items-center justify-center shadow">
          <IconDownload />
        </button>
        <button onPointerDown={e => e.stopPropagation()} onClick={() => onRemover(foto.id)} title="Remover"
          className="w-7 h-7 rounded-lg bg-white/90 text-red-600 hover:bg-white flex items-center justify-center shadow">
          <IconTrash />
        </button>
      </div>

      <img
        src={driveImg(foto.drive_file_id, 600)}
        alt={foto.nome_arquivo}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full h-auto block select-none pointer-events-none"
        draggable={false}
      />
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
        <span className="text-[10px] text-white/90">{bytesFmt(foto.tamanho_bytes)} · webp</span>
      </div>
    </div>
  );
}

// Galeria de um slot (desktop/mobile/mini) — upload, download, reordenar
function SlotGaleria({ banner, slot, fotos, onChanged, onReorder }) {
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [baixandoTodas, setBaixandoTodas] = useState(false);
  const dragCount = useRef(0);
  const inputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function enviar(files) {
    const arr = Array.from(files).filter(f => f.type?.startsWith('image/'));
    if (!arr.length) return;
    setEnviando(true);
    try {
      const r = await uploadBannerFiles(banner.id, slot.key, arr);
      if (r.erros?.length) alert('Algumas imagens falharam: ' + r.erros.map(e => e.erro).join(', '));
      await onChanged();
    } catch (e) { alert(e.message); }
    finally { setEnviando(false); }
  }

  async function remover(arquivoId) {
    if (!confirm('Remover esta imagem?')) return;
    try { await api.deletarBannerArquivo(arquivoId); await onChanged(); }
    catch (e) { alert(e.message); }
  }

  async function baixar(f) {
    try { await baixarBannerArquivo(f.id, f.nome_arquivo); }
    catch (e) { alert('Erro ao baixar: ' + e.message); }
  }

  async function baixarTodas() {
    setBaixandoTodas(true);
    try {
      for (const f of fotos) {
        await baixarBannerArquivo(f.id, f.nome_arquivo);
        await new Promise(r => setTimeout(r, 350));
      }
    } catch (e) { alert('Erro ao baixar: ' + e.message); }
    finally { setBaixandoTodas(false); }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fotos.findIndex(f => f.id === active.id);
    const newIndex = fotos.findIndex(f => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(slot.key, oldIndex, newIndex);
  }

  return (
    <div
      onDragEnter={e => { e.preventDefault(); dragCount.current++; setArrastando(true); }}
      onDragOver={e => e.preventDefault()}
      onDragLeave={e => { e.preventDefault(); dragCount.current--; if (dragCount.current <= 0) setArrastando(false); }}
      onDrop={e => { e.preventDefault(); dragCount.current = 0; setArrastando(false); enviar(e.dataTransfer.files); }}
      className="relative bg-white rounded-2xl border border-gray-100 p-4"
    >
      {arrastando && (
        <div className="absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-brand-500 bg-brand-50/80 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-semibold text-brand-700">Solte as imagens aqui</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800">{slot.label}</h3>
          <p className="text-[11px] text-gray-400">{slot.dica}</p>
        </div>
        <div className="flex items-center gap-2">
          {fotos.length > 0 && (
            <button onClick={baixarTodas} disabled={baixandoTodas}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 disabled:opacity-40 transition">
              {baixandoTodas ? 'Baixando…' : `↓ Baixar todas (${fotos.length})`}
            </button>
          )}
          <button onClick={() => inputRef.current?.click()} disabled={enviando}
            className="px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700 disabled:opacity-40 transition">
            {enviando ? 'Enviando…' : '+ Adicionar'}
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={e => { enviar(e.target.files); e.target.value = ''; }} />
      </div>

      {fotos.length === 0 ? (
        <div className="checkerboard rounded-xl h-28 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200">
          Arraste imagens ou clique em Adicionar
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fotos.map(f => f.id)} strategy={rectSortingStrategy}>
            <div className={`grid gap-3 ${slot.cols}`}>
              {fotos.map((f, i) => (
                <BannerFoto key={f.id} foto={f} index={i} onRemover={remover} onBaixar={baixar} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export default function Banner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [banner, setBanner] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState('');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);
  const salvoRef = useRef({ nome: '', obs: '' });

  const carregar = useCallback(async () => {
    try {
      const d = await api.getBanner(id);
      setBanner(d);
      setFotos(d.fotos || []);
      setNome(d.nome || '');
      setObs(d.observacoes || '');
      salvoRef.current = { nome: d.nome || '', obs: d.observacoes || '' };
    } catch (e) { console.error(e); }
    finally { setCarregando(false); }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Autosave (debounce) de nome/observações
  useEffect(() => {
    if (carregando) return;
    if (nome === salvoRef.current.nome && obs === salvoRef.current.obs) return;
    const t = setTimeout(async () => {
      setSalvando(true);
      try {
        await api.atualizarBanner(id, { nome: nome.trim() || 'Banner', observacoes: obs });
        salvoRef.current = { nome, obs };
      } catch (e) { console.error(e); }
      finally { setSalvando(false); }
    }, 700);
    return () => clearTimeout(t);
  }, [nome, obs, carregando, id]);

  // Reordena dentro de um slot (otimista + persiste)
  function handleReorder(slotKey, oldIndex, newIndex) {
    const doSlot = fotos.filter(f => f.tipo === slotKey);
    if (!doSlot[oldIndex]) return;
    const reordenadas = arrayMove(doSlot, oldIndex, newIndex).map((f, i) => ({ ...f, ordem: i + 1 }));
    let k = 0;
    setFotos(prev => prev.map(f => f.tipo === slotKey ? reordenadas[k++] : f));
    api.reordenarBanner(reordenadas.map(f => ({ id: f.id, ordem: f.ordem })))
      .catch(err => { console.error(err); carregar(); });
  }

  async function excluir() {
    if (!confirm('Excluir este banner e todas as imagens?')) return;
    try { await api.deletarBanner(id); navigate('/banners'); }
    catch (e) { alert(e.message); }
  }

  if (carregando) {
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-2xl h-20 animate-pulse" />
        <div className="bg-white rounded-2xl h-40 animate-pulse" />
        <div className="bg-white rounded-2xl h-40 animate-pulse" />
      </div>
    );
  }
  if (!banner) return <div className="text-sm text-gray-500">Banner não encontrado.</div>;

  return (
    <div className="min-h-full space-y-3 pb-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/banners')} className="text-gray-400 hover:text-gray-700 transition" title="Voltar">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd"/></svg>
        </button>
        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="flex-1 text-lg font-bold text-gray-900 bg-transparent focus:outline-none focus:bg-gray-50 rounded-lg px-2 py-1 -mx-2"
          placeholder="Nome do banner"
        />
        <span className="text-xs text-gray-400 w-20 text-right">{salvando ? 'Salvando…' : 'Salvo'}</span>
        <button onClick={excluir} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition">Excluir</button>
      </div>

      {/* Slots */}
      {SLOTS.map(slot => (
        <SlotGaleria
          key={slot.key}
          banner={banner}
          slot={slot}
          fotos={fotos.filter(f => f.tipo === slot.key)}
          onChanged={carregar}
          onReorder={handleReorder}
        />
      ))}

      {/* Observações */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-2">Observações</h3>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          rows={4}
          placeholder="Anotações sobre este banner (datas, campanha, links, etc.)"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-sm placeholder-gray-400 resize-y"
        />
      </div>
    </div>
  );
}
