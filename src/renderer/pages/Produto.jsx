import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, uploadFotos, uploadFotosFiles, driveImg, fileIdFromUrl, apiUrl, getToken } from '../api';

import FotoGrid from '../components/FotoGrid';

// Spinner de loading
export const Spinner = ({ cls = 'w-4 h-4' }) => (
  <svg className={`animate-spin ${cls}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
  </svg>
);

// Ícone de download
export const IconDownload = ({ cls = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
    <path d="M12 16a1 1 0 01-.7-.3l-4-4a1 1 0 011.4-1.4L11 12.6V4a1 1 0 112 0v8.6l2.3-2.3a1 1 0 011.4 1.4l-4 4a1 1 0 01-.7.3z"/>
    <path d="M5 20a1 1 0 010-2h14a1 1 0 010 2H5z"/>
  </svg>
);

// Dispara o download nativo da URL pelo Electron (filename opcional preserva o nome)
export function baixarFoto(url, filename) {
  if (url) window.electronAPI?.downloadUrl?.(url, filename);
}
// Extrai um nome de arquivo de uma URL (basename antes da query); vazio se não der
function nomeDaUrl(url) {
  try {
    const path = String(url).split('?')[0];
    const base = decodeURIComponent(path.substring(path.lastIndexOf('/') + 1));
    return /\.(jpe?g|png|webp)$/i.test(base) ? base : '';
  } catch { return ''; }
}

// Normaliza uma URL de foto do comparativo (Tiny/Wbuy): se for do Google Drive
// (uc?export=view / /d/), usa o CDN lh3 (confiável); senão mantém a URL original
// (ex.: CDN da Wbuy, S3 do Tiny). Evita thumbnails em branco do drive.google.com/uc.
function urlComparativo(u) {
  const url = typeof u === 'string' ? u : (u?.foto || u?.url || '');
  const fid = fileIdFromUrl(url);
  if (fid) return { src: driveImg(fid, 400), dl: driveImg(fid, 1600) };
  return { src: url, dl: url };
}

// Vídeo do produto: arquivo guardado no Drive. Baixa do YouTube (Wbuy) na máquina do
// usuário via Electron (IP residencial não é bloqueado), ou upload de arquivo.
function VideoBox({ produtoId }) {
  const [video, setVideo] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [trabalhando, setTrabalhando] = useState(false);
  const [status, setStatus] = useState('');
  const temElectron = !!window.electronAPI?.video;

  async function carregar() {
    setCarregando(true);
    try { const v = await api.getVideo(produtoId); setVideo(v.video || null); } catch {}
    setCarregando(false);
    api.getWbuyVideo(produtoId).then(r => setYoutubeUrl(r.youtube_url || null)).catch(() => {});
  }
  useEffect(() => { carregar(); }, [produtoId]);
  useEffect(() => window.electronAPI?.video?.onStatus?.(setStatus), []);

  async function importarWbuy() {
    if (!youtubeUrl) return;
    setTrabalhando(true);
    try {
      const r = await window.electronAPI.video.importarYoutube({ produtoId, youtubeUrl, apiUrl, token: getToken() });
      if (r?.video) setVideo(r.video);
    } catch (e) { alert('Erro ao importar do YouTube: ' + e.message); }
    finally { setTrabalhando(false); setStatus(''); }
  }
  async function adicionar() {
    setTrabalhando(true);
    try {
      const r = await window.electronAPI.video.selecionarEUpload({ produtoId, apiUrl, token: getToken() });
      if (r?.video) setVideo(r.video);
    } catch (e) { alert('Erro ao enviar vídeo: ' + e.message); }
    finally { setTrabalhando(false); setStatus(''); }
  }
  async function remover() {
    if (!confirm('Remover o vídeo do produto?')) return;
    try { await api.deletarVideo(produtoId); setVideo(null); } catch (e) { alert(e.message); }
  }
  const mb = b => b ? (b / 1024 / 1024).toFixed(1) + ' MB' : '';

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Vídeo do produto</h3>
      {trabalhando ? (
        <div className="text-xs text-gray-500 px-1 py-3 flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin inline-block shrink-0" />
          <span className="truncate">{status || 'Processando…'}</span>
        </div>
      ) : carregando ? (
        <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
      ) : video ? (
        <div className="bg-gray-50 rounded-xl p-2.5">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-brand-500 shrink-0"><path d="M4.5 5.25A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H4.5zM19.5 8.25l2.69-1.61a.75.75 0 011.06.68v9.36a.75.75 0 01-1.06.68L19.5 15.75v-7.5z"/></svg>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-700 truncate" title={video.video_nome}>{video.video_nome}</p>
              <p className="text-[10px] text-gray-400">{video.video_origem === 'youtube' ? 'do YouTube' : 'arquivo'}{video.video_tamanho_bytes ? ' · ' + mb(Number(video.video_tamanho_bytes)) : ''}</p>
            </div>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button onClick={() => window.electronAPI?.openExternal?.(video.video_url)} className="flex-1 text-[11px] py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600">Abrir</button>
            {temElectron && <button onClick={adicionar} className="flex-1 text-[11px] py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600">Trocar</button>}
            <button onClick={remover} className="text-[11px] px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-red-50 text-red-500">Remover</button>
          </div>
        </div>
      ) : !temElectron ? (
        <p className="text-[11px] text-gray-400 px-1">Disponível no app instalado.</p>
      ) : (
        <div className="space-y-1.5">
          <button onClick={adicionar} className="w-full text-xs py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium">+ Adicionar vídeo</button>
          {youtubeUrl && (
            <button onClick={importarWbuy} className="w-full text-xs py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">↓ Importar do Wbuy (YouTube)</button>
          )}
        </div>
      )}
    </div>
  );
}

function ComparativoColuna({ titulo, fotos = [], cor }) {
  return (
    <div className={`flex-1 rounded-2xl p-3 ${cor}`}>
      <h3 className="text-sm font-semibold mb-2 text-gray-700">{titulo}</h3>
      {fotos.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">Sem fotos</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((f, i) => {
            const src = typeof f === 'string' ? f : (f.src || f.url || f.driveUrl);
            const dl = typeof f === 'string' ? f : (f.dl || src);
            const nome = (typeof f === 'object' && f.nome) || nomeDaUrl(dl) || undefined;
            return (
              <div key={i} className="relative group aspect-square bg-white rounded-xl overflow-hidden shadow-sm">
                <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                <button
                  onClick={() => baixarFoto(dl, nome)}
                  title="Baixar foto"
                  className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 bg-black/55 hover:bg-black/80 text-white w-6 h-6 rounded-lg flex items-center justify-center transition-opacity"
                >
                  <IconDownload />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SortableVariacao({ v, selected, onSelect, onDelete, onEditSku }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: v.id });
  const [sku, setSku] = useState(v.sku_variacao || '');
  useEffect(() => { setSku(v.sku_variacao || ''); }, [v.sku_variacao]);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const ehPrincipal = v.nome === 'Principal';
  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className={`rounded-xl overflow-hidden transition-colors ${selected ? 'bg-brand-600 shadow-sm shadow-brand-600/30' : 'hover:bg-gray-100'}`}>
        <div className="flex items-center">
          <div
            {...attributes}
            {...listeners}
            className={`cursor-grab active:cursor-grabbing pl-1.5 pr-0.5 py-2 select-none ${selected ? 'text-white/40' : 'text-gray-300 hover:text-gray-400'}`}
          >
            ⠿
          </div>
          <button onClick={() => onSelect(v.id)} className="flex-1 text-left py-2 min-w-0">
            <span className={`text-sm block leading-tight truncate ${selected ? 'text-white font-medium' : 'text-gray-700'}`}>{v.nome}</span>
            {!selected && !ehPrincipal && (
              <span className={`text-[10px] font-mono block leading-tight truncate ${v.sku_variacao ? 'text-gray-400' : 'text-amber-500'}`}>
                {v.sku_variacao || 'sem SKU'}
              </span>
            )}
          </button>
          <button
            onClick={() => onDelete(v.id)}
            className={`opacity-0 group-hover:opacity-100 px-1.5 text-sm shrink-0 ${selected ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}
          >×</button>
        </div>

        {/* SKU editável (casa a variação no Tiny e na Wbuy) — some na "Principal" */}
        {selected && !ehPrincipal && (
          <div className="px-2 pb-2">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2 py-1">
              <span className="text-[9px] uppercase tracking-wider text-white/60 font-bold shrink-0">SKU</span>
              <input
                value={sku}
                onChange={e => setSku(e.target.value.toUpperCase())}
                onBlur={() => { if ((v.sku_variacao || '') !== sku.trim()) onEditSku(v.id, sku.trim() || null); }}
                onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                placeholder="cód. da variação"
                className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-white placeholder-white/40 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Produto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [produto, setProduto] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [variacoes, setVariacoes] = useState([]);
  const [variacaoSelecionada, setVariacaoSelecionada] = useState(null);
  const [comparativo, setComparativo] = useState(null);
  const [carregandoComparativo, setCarregandoComparativo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [uploadando, setUploadando] = useState(false);
  const [publicando, setPublicando] = useState('');
  const [tinyPublicado, setTinyPublicado] = useState(false);
  const [wbuyPublicado, setWbuyPublicado] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('fotos');
  const [novaVariacao, setNovaVariacao] = useState('');
  const [novaVariacaoSku, setNovaVariacaoSku] = useState('');
  const [adicionandoVariacao, setAdicionandoVariacao] = useState(false);
  const [copiarMenu, setCopiarMenu] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [copiarPicker, setCopiarPicker] = useState(null);   // { origemId, nome } — seletor de fotos
  const [copiarSel, setCopiarSel] = useState(() => new Set());
  const [arrastando, setArrastando] = useState(false);
  const dragCount = useRef(0);
  const [importMenu, setImportMenu] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const carregar = useCallback(async () => {
    try {
      const data = await api.getProduto(id);
      setProduto(data);
      const cores = (data.variacoes || []).filter(v => v.nome !== 'Principal');
      setVariacoes(cores);
      setFotos(data.fotos || []);
      // mantém a seleção só se ela existir NESTE produto; senão cai na 1ª variação
      // (corrige fotos sumindo ao navegar de um produto pro outro)
      setVariacaoSelecionada(prev => cores.some(v => v.id === prev) ? prev : (cores[0]?.id ?? null));
    } catch (err) {
      setMensagem('Erro ao carregar produto: ' + err.message);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (abaAtiva === 'comparativo') {
      setCarregandoComparativo(true);
      api.getComparativo(id, variacaoSelecionada)
        .then(data => { setComparativo(data); setCarregandoComparativo(false); })
        .catch(err => { console.error(err); setCarregandoComparativo(false); });
    }
  }, [abaAtiva, id, variacaoSelecionada]);

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = variacoes.findIndex(v => v.id === active.id);
    const newIndex = variacoes.findIndex(v => v.id === over.id);
    const novaOrdem = arrayMove(variacoes, oldIndex, newIndex);
    setVariacoes(novaOrdem);
    await api.reordenarVariacoes(id, novaOrdem.map((v, i) => ({ id: v.id, ordem: i + 1 }))).catch(console.error);
  }

  async function handleUpload() {
    try {
      const filePaths = await window.electronAPI.openFiles();
      if (!filePaths?.length) return;
      setUploadando(true);
      setMensagem('');
      const result = await uploadFotos(id, variacaoSelecionada, filePaths);
      const avisos = (result.uploaded || []).filter(u => u.avisos?.length)
        .map(u => `${u.arquivo || u.nome_arquivo}: ${u.avisos.join(', ')}`);
      let msg = result.erros?.length
        ? `${result.uploaded.length} OK. Erros: ${result.erros.map(e => e.arquivo).join(', ')}`
        : `${result.uploaded.length} foto(s) adicionada(s)!`;
      if (avisos.length) msg += ` ⚠️ ${avisos.join(' · ')}`;
      setMensagem(msg);
      carregar();
    } catch (err) {
      setMensagem('Erro no upload: ' + err.message);
    } finally {
      setUploadando(false);
    }
  }

  // Drag-and-drop: usa contador (enter/leave disparam ao passar pelos filhos) p/ não piscar
  // Só reage a arrasto de ARQUIVOS reais (vindos do explorador). Arrastar uma foto
  // do grid para reordenar não tem 'Files' no dataTransfer — assim não vira upload.
  const ehArrastoDeArquivos = e => Array.from(e.dataTransfer?.types || []).includes('Files');

  function handleDragEnter(e) { if (!ehArrastoDeArquivos(e)) return; e.preventDefault(); dragCount.current++; if (dragCount.current === 1) setArrastando(true); }
  function handleDragLeave(e) { if (!arrastando) return; e.preventDefault(); dragCount.current = Math.max(0, dragCount.current - 1); if (dragCount.current === 0) setArrastando(false); }

  // Upload por arrastar-e-soltar: lê os File objects direto (sem o file:read do Electron)
  async function handleDrop(e) {
    if (!ehArrastoDeArquivos(e)) return;
    e.preventDefault();
    dragCount.current = 0;
    setArrastando(false);
    const files = Array.from(e.dataTransfer.files || []).filter(f => !f.type || f.type.startsWith('image/'));
    if (!files.length) return;
    try {
      setUploadando(true); setMensagem('');
      const result = await uploadFotosFiles(id, variacaoSelecionada, files);
      const avisos = (result.uploaded || []).filter(u => u.avisos?.length).map(u => `${u.arquivo || u.nome_arquivo}: ${u.avisos.join(', ')}`);
      setMensagem(`${result.uploaded.length} foto(s) adicionada(s)!${avisos.length ? ` ⚠️ ${avisos.join(' · ')}` : ''}`);
      carregar();
    } catch (err) {
      setMensagem('Erro no upload: ' + err.message);
    } finally { setUploadando(false); }
  }

  // Importa fotos do Tiny ou da Wbuy para o Drive
  async function importarFotos(origem) {
    setImportMenu(false);
    setImportando(true); setMensagem('');
    try {
      const r = origem === 'tiny' ? await api.importarFotosTiny(id) : await api.importarFotosWbuy(id);
      const nome = origem === 'tiny' ? 'Tiny' : 'Wbuy';
      setMensagem(`${r.importados} foto(s) importadas do ${nome} para o Drive!${r.pulados ? ` (${r.pulados} já existiam)` : ''}${r.erros?.length ? ` · ${r.erros.length} erro(s)` : ''}`);
      carregar();
    } catch (err) {
      setMensagem('Erro ao importar: ' + err.message);
    } finally { setImportando(false); }
  }

  // Abre o seletor de fotos da variação de origem (já com todas marcadas)
  function abrirPickerCopiar(v) {
    setCopiarMenu(false);
    const fotosOrigem = fotos.filter(f => f.variacao_id === v.id);
    setCopiarSel(new Set(fotosOrigem.map(f => f.id)));
    setCopiarPicker({ origemId: v.id, nome: v.nome });
  }
  function toggleCopiarFoto(fotoId) {
    setCopiarSel(prev => { const s = new Set(prev); s.has(fotoId) ? s.delete(fotoId) : s.add(fotoId); return s; });
  }

  // Copia as fotos ESCOLHIDAS da variação de origem para a selecionada
  async function confirmarCopiar() {
    if (!variacaoSelecionada || !copiarPicker || copiarSel.size === 0) return;
    const origemId = copiarPicker.origemId;
    setCopiarPicker(null);
    setCopiando(true); setMensagem('');
    try {
      const r = await api.copiarVariacao(id, origemId, variacaoSelecionada, [...copiarSel]);
      setMensagem(`${r.copiadas} foto(s) copiada(s) para esta variação.`);
      carregar();
    } catch (err) {
      setMensagem('Erro ao copiar: ' + err.message);
    } finally { setCopiando(false); }
  }

  function handleReorder(oldIndex, newIndex) {
    const daVariacao = fotos.filter(f => f.variacao_id === variacaoSelecionada);
    if (oldIndex === newIndex || !daVariacao[oldIndex]) return;
    const reordenadas = arrayMove(daVariacao, oldIndex, newIndex).map((f, i) => ({ ...f, ordem: i + 1 }));
    // Atualização otimista: mostra a nova ordem na hora (sem esperar a API nem recarregar)
    let k = 0;
    setFotos(prev => prev.map(f => f.variacao_id === variacaoSelecionada ? reordenadas[k++] : f));
    // Persiste em segundo plano; se falhar, recarrega pra voltar ao estado real
    api.atualizarOrdem(reordenadas.map(f => ({ id: f.id, ordem: f.ordem })))
      .catch(err => { console.error(err); carregar(); });
  }

  async function handleDelete(fotoId) {
    if (!confirm('Remover esta foto do Drive e do sistema?')) return;
    await api.deletarFoto(fotoId);
    carregar();
  }

  async function handleAdicionarVariacao(e) {
    e.preventDefault();
    if (!novaVariacao.trim()) return;
    try {
      await api.criarVariacao(id, novaVariacao.trim(), novaVariacaoSku.trim() || null);
      setNovaVariacao('');
      setNovaVariacaoSku('');
      setAdicionandoVariacao(false);
      carregar();
    } catch (err) {
      setMensagem('Erro ao criar variação: ' + err.message);
    }
  }

  async function handleEditarVariacaoSku(variacaoId, sku_variacao) {
    try {
      await api.editarVariacao(id, variacaoId, { sku_variacao });
      setVariacoes(prev => prev.map(v => v.id === variacaoId ? { ...v, sku_variacao } : v));
    } catch (err) {
      setMensagem('Erro ao salvar SKU da variação: ' + err.message);
    }
  }

  async function handleDeletarVariacao(variacaoId) {
    if (!confirm('Remover esta variação?')) return;
    try {
      await api.deletarVariacao(id, variacaoId);
      if (variacaoSelecionada === variacaoId) setVariacaoSelecionada(variacoes.find(v => v.id !== variacaoId)?.id || null);
      carregar();
    } catch (err) {
      setMensagem(err.message);
    }
  }

  async function publicar(destino) {
    setPublicando(destino);
    setMensagem('');
    try {
      let result;
      if (destino === 'tiny') result = await api.publicarTiny(id, variacaoSelecionada ? { variacao_id: variacaoSelecionada } : {});
      else if (destino === 'wbuy') result = await api.publicarWbuy(id, variacaoSelecionada ? { variacao_id: variacaoSelecionada } : {});
      else result = await api.publicarAmbos(id);

      const aviso = ' — pode levar até ~1 min pra as imagens aparecerem no painel (Tiny/Wbuy processam em segundo plano).';
      if (destino === 'ambos') {
        const tiny = result.resultados.tiny?.ok ? '✓ Tiny' : '✗ Tiny';
        const wbuy = result.resultados.wbuy?.ok ? '✓ Wbuy' : '✗ Wbuy';
        setMensagem(`Publicação concluída: ${tiny}, ${wbuy}${aviso}`);
      } else {
        setMensagem(`Publicado na ${destino === 'tiny' ? 'Tiny' : 'Wbuy'} com sucesso! ${result.fotosPublicadas} foto(s).${aviso}`);
      }
      carregar();
    } catch (err) {
      setMensagem('Erro ao publicar: ' + err.message);
    } finally {
      setPublicando('');
    }
  }

  if (carregando) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Carregando...</div>;
  }

  if (!produto) {
    return <div className="flex items-center justify-center h-64 text-red-500 text-sm">Produto não encontrado</div>;
  }

  const fotosVariacao = fotos.filter(f => f.variacao_id === variacaoSelecionada);

  return (
    <div>
      {/* Header da página */}
      <div className="bg-white rounded-2xl px-6 py-4 mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(produto.lancamento ? '/lancamentos' : '/')}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd"/>
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">{produto.nome}</h1>
            <p className="text-xs text-gray-400">SKU: {produto.sku}</p>
          </div>
        </div>

        {produto.lancamento ? (
          /* Modo lançamento */
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                setPublicando('tiny');
                setMensagem('');
                try {
                  const result = await api.publicarLancamentoTiny(id);
                  const totalVar = (result.variacoes || []).reduce((s, v) => s + v.fotos, 0);
                  const total = (result.principal || 0) + totalVar;
                  let msg = `Tiny: ${total} foto(s)`;
                  if (result.variacoes?.length) msg += ` · ${result.variacoes.length} variação(ões) por SKU`;
                  if (result.naoCasadas?.length) {
                    msg += `. ✗ ${result.naoCasadas.length} NÃO publicada(s): ` +
                      result.naoCasadas.map(n => `"${n.nome}" (${n.motivo})`).join('; ');
                  }
                  setMensagem(msg);
                  if (!result.naoCasadas?.length) setTinyPublicado(true);
                } catch (err) {
                  setMensagem('Erro Tiny: ' + err.message);
                } finally {
                  setPublicando('');
                }
              }}
              disabled={!!publicando}
              className={`px-3 py-1.5 text-sm rounded-xl disabled:opacity-50 font-semibold transition-colors flex items-center justify-center gap-1.5 ${tinyPublicado ? 'bg-green-100 text-green-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'}`}
            >
              {publicando === 'tiny' ? (<><Spinner /> Publicando...</>) : tinyPublicado ? '✓ Tiny' : 'Publicar no Tiny'}
            </button>

            <button
              onClick={async () => {
                setPublicando('wbuy');
                setMensagem('');
                try {
                  const result = await api.publicarLancamentoWbuy(id);
                  let msg = `Wbuy: ${result.fotosPublicadas} foto(s) · ${result.comCor} com cor`;
                  if (result.naoCasadas?.length) {
                    msg += `. ✗ não casou por SKU: ` +
                      result.naoCasadas.map(n => `"${n.nome}" (${n.fotos})`).join('; ');
                  }
                  setMensagem(msg);
                  if (!result.naoCasadas?.length) setWbuyPublicado(true);
                } catch (err) {
                  setMensagem('Erro Wbuy: ' + err.message);
                } finally {
                  setPublicando('');
                }
              }}
              disabled={!!publicando}
              className={`px-3 py-1.5 text-sm rounded-xl disabled:opacity-50 font-semibold transition-colors flex items-center justify-center gap-1.5 ${wbuyPublicado ? 'bg-green-100 text-green-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'}`}
            >
              {publicando === 'wbuy' ? (<><Spinner /> Publicando...</>) : wbuyPublicado ? '✓ Wbuy' : 'Publicar na Wbuy'}
            </button>

            <button
              onClick={async () => {
                if (!confirm('Confirma conclusão? O lançamento será removido desta aba.')) return;
                setConcluindo(true);
                try {
                  await api.concluirLancamento(id);
                  navigate('/lancamentos');
                } catch (err) {
                  setMensagem('Erro ao concluir: ' + err.message);
                  setConcluindo(false);
                }
              }}
              disabled={concluindo || !!publicando}
              className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              {concluindo ? (<><Spinner /> Concluindo...</>) : '✓ Concluir'}
            </button>
          </div>
        ) : (
          /* Modo produto normal */
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => publicar('tiny')} disabled={!!publicando}
              className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {publicando === 'tiny' ? (<><Spinner /> Publicando...</>) : 'Publicar no Tiny'}
            </button>
            <button onClick={() => publicar('wbuy')} disabled={!!publicando}
              className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {publicando === 'wbuy' ? (<><Spinner /> Publicando...</>) : 'Publicar na Wbuy'}
            </button>
            <button onClick={() => publicar('ambos')} disabled={!!publicando}
              className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-xl disabled:opacity-50 font-semibold flex items-center justify-center gap-1.5">
              {publicando === 'ambos' ? (<><Spinner /> Publicando...</>) : 'Publicar nos Dois'}
            </button>
          </div>
        )}
      </div>

      {mensagem && (
        <div className={`mb-3 text-sm px-4 py-2.5 rounded-2xl ${mensagem.includes('Erro') || mensagem.includes('✗') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
          {mensagem}
        </div>
      )}

      <div className="flex gap-3">
        {/* Sidebar: variações */}
        <div className="w-44 shrink-0 bg-white rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Variações</h2>
            <button
              onClick={() => setAdicionandoVariacao(v => !v)}
              className="text-brand-600 hover:text-brand-700 text-lg leading-none font-bold w-5 h-5 flex items-center justify-center rounded"
            >+</button>
          </div>

          {adicionandoVariacao && (
            <form onSubmit={handleAdicionarVariacao} className="mb-2 flex flex-col gap-1.5 px-1">
              <input
                autoFocus
                value={novaVariacao}
                onChange={e => setNovaVariacao(e.target.value)}
                placeholder="Nome (ex: Rosa)"
                className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-400"
              />
              <input
                value={novaVariacaoSku}
                onChange={e => setNovaVariacaoSku(e.target.value.toUpperCase())}
                placeholder="SKU (p/ Tiny e Wbuy)"
                className="w-full text-xs font-mono px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-400"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setAdicionandoVariacao(false); setNovaVariacao(''); setNovaVariacaoSku(''); }}
                  className="text-xs px-2 py-1.5 text-gray-500 rounded-lg border border-gray-200 hover:bg-gray-50"
                >Cancelar</button>
                <button type="submit" className="flex-1 text-xs py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">Adicionar</button>
              </div>
            </form>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={variacoes.map(v => v.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-0.5">
                {variacoes.map(v => (
                  <SortableVariacao
                    key={v.id}
                    v={v}
                    selected={variacaoSelecionada === v.id}
                    onSelect={setVariacaoSelecionada}
                    onDelete={handleDeletarVariacao}
                    onEditSku={handleEditarVariacaoSku}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {variacoes.length === 0 && (
            <p className="text-xs text-gray-400 py-3 px-1">Nenhuma variação. Clique em + para adicionar.</p>
          )}

          <VideoBox produtoId={id} />
        </div>

        {/* Main */}
        <div className="flex-1 bg-white rounded-2xl p-4 min-w-0">
          {/* Abas */}
          <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-xl w-fit">
            <button
              onClick={() => setAbaAtiva('fotos')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                abaAtiva === 'fotos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Fotos (Drive)
            </button>
            <button
              onClick={() => setAbaAtiva('comparativo')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                abaAtiva === 'comparativo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tiny × Wbuy
            </button>
          </div>

          {abaAtiva === 'fotos' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="relative group flex items-center gap-1.5 text-sm text-gray-400 cursor-help">
                  <span>{fotosVariacao.length} foto(s)</span>
                  <span className="text-gray-300">·</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-brand-500">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  <span className="text-gray-500 group-hover:text-gray-700 transition-colors">Siga o padrão de ordenação</span>
                  {/* Tooltip */}
                  <div className="absolute left-0 top-full mt-2 z-40 hidden group-hover:block w-[19rem] bg-gray-900 text-white text-xs rounded-xl p-3.5 shadow-2xl">
                    <p className="font-semibold mb-2 text-gray-100">Ordem padrão das fotos</p>
                    <ol className="space-y-1.5 text-gray-200">
                      <li><span className="text-brand-300 font-semibold">1.</span> Ambientada (fundo ambientado)</li>
                      <li><span className="text-brand-300 font-semibold">2.</span> Fundo branco</li>
                      <li><span className="text-brand-300 font-semibold">3.</span> Outra ambientada</li>
                      <li><span className="text-brand-300 font-semibold">4.</span> Método “Eita Montei”</li>
                      <li><span className="text-brand-300 font-semibold">5.</span> O resto das ambientadas</li>
                      <li><span className="text-brand-300 font-semibold">6.</span> O resto das de fundo branco</li>
                      <li><span className="text-brand-300 font-semibold">7.</span> Foto de medidas (por último)</li>
                    </ol>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Copiar fotos de outra variação */}
                  {variacaoSelecionada && variacoes.filter(v => v.id !== variacaoSelecionada).length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setCopiarMenu(m => !m)}
                        disabled={copiando}
                        className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm rounded-xl border border-gray-200 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {copiando ? (<><Spinner /> Copiando...</>) : 'Copiar de…'}
                      </button>
                      {copiarMenu && (
                        <div className="absolute right-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44 max-h-60 overflow-y-auto">
                          {variacoes.filter(v => v.id !== variacaoSelecionada).map(v => {
                            const n = fotos.filter(f => f.variacao_id === v.id).length;
                            return (
                              <button key={v.id} onClick={() => abrirPickerCopiar(v)} disabled={n === 0}
                                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-between gap-2">
                                <span className="truncate">{v.nome}</span>
                                <span className="text-xs text-gray-400 shrink-0">{n}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Importar fotos (Tiny ou Wbuy → Drive) */}
                  <div className="relative">
                    <button
                      onClick={() => setImportMenu(m => !m)}
                      disabled={importando || !!publicando}
                      className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm rounded-xl border border-gray-200 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {importando ? (<><Spinner /> Importando...</>) : <>↓ Importar fotos</>}
                    </button>
                    {importMenu && (
                      <div className="absolute right-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44">
                        <button onClick={() => importarFotos('wbuy')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between">
                          Da Wbuy {produto.fotos_wbuy?.length ? <span className="text-xs text-gray-400">{produto.fotos_wbuy.length}</span> : null}
                        </button>
                        <button onClick={() => importarFotos('tiny')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between">
                          Do Tiny {produto.fotos_tiny?.length ? <span className="text-xs text-gray-400">{produto.fotos_tiny.length}</span> : null}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={uploadando}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl disabled:opacity-50 font-medium transition-colors flex items-center gap-2"
                  >
                    {uploadando ? (<><Spinner /> Enviando...</>) : '+ Adicionar fotos'}
                  </button>
                </div>
              </div>
              {/* Zona de drag-and-drop: overlay absoluto (pointer-events-none) evita flicker */}
              <div
                className="relative rounded-2xl"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <FotoGrid fotos={fotosVariacao} onReorder={handleReorder} onDelete={handleDelete} />
                {arrastando && (
                  <div className="absolute inset-0 z-30 rounded-2xl bg-brand-50/90 ring-2 ring-dashed ring-brand-400 flex items-center justify-center pointer-events-none">
                    <p className="text-sm font-medium text-brand-600">Solte as imagens aqui para enviar</p>
                  </div>
                )}
              </div>
            </>
          )}

          {abaAtiva === 'comparativo' && (
            carregandoComparativo ? (
              <div className="flex gap-3">
                {[['Drive', 'bg-brand-50'], ['Tiny', 'bg-gray-50'], ['Wbuy', 'bg-gray-50']].map(([col, bg]) => (
                  <div key={col} className={`flex-1 rounded-xl ${bg} p-3`}>
                    <div className="text-xs font-semibold text-gray-400 mb-2">{col}</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-square rounded-lg bg-gray-200 animate-pulse" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : comparativo && (
              <div className="flex gap-3">
                <ComparativoColuna
                  titulo={`Drive (${comparativo.drive?.length || 0})`}
                  fotos={comparativo.drive?.map(f => {
                    const fid = f.drive_file_id || fileIdFromUrl(f.drive_url);
                    return {
                      src: driveImg(fid, 400) || f.thumbnail_url || f.drive_url,
                      dl: driveImg(fid, 1600) || f.drive_url || f.thumbnail_url,
                      nome: f.nome_arquivo,
                    };
                  })}
                  cor="bg-brand-50"
                />
                <ComparativoColuna
                  titulo={`Tiny (${comparativo.tiny?.length || 0})`}
                  fotos={comparativo.tiny?.map(u => urlComparativo(u))}
                  cor="bg-gray-50"
                />
                <ComparativoColuna
                  titulo={`Wbuy (${comparativo.wbuy?.length || 0})`}
                  fotos={comparativo.wbuy?.map(u => urlComparativo(u))}
                  cor="bg-gray-50"
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* Seletor de fotos para copiar de outra variação */}
      {copiarPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setCopiarPicker(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Copiar fotos de "{copiarPicker.nome}"</h3>
                <p className="text-xs text-gray-400 mt-0.5">Escolha quais fotos copiar para esta variação</p>
              </div>
              <button onClick={() => setCopiarPicker(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3">
              {fotos.filter(f => f.variacao_id === copiarPicker.origemId).map(f => {
                const sel = copiarSel.has(f.id);
                return (
                  <button key={f.id} onClick={() => toggleCopiarFoto(f.id)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${sel ? 'border-brand-500' : 'border-gray-100 hover:border-gray-300'}`}>
                    <img src={driveImg(f.drive_file_id || fileIdFromUrl(f.drive_url), 300) || f.thumbnail_url || f.drive_url}
                      className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                    {!sel && <div className="absolute inset-0 bg-white/40" />}
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center ${sel ? 'bg-brand-600 text-white' : 'bg-white/80 border border-gray-300 text-transparent'}`}>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 011.04-.207z" clipRule="evenodd"/></svg>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const todas = fotos.filter(f => f.variacao_id === copiarPicker.origemId).map(f => f.id);
                  setCopiarSel(prev => prev.size === todas.length ? new Set() : new Set(todas));
                }}
                className="text-xs text-gray-500 hover:text-gray-700">
                {copiarSel.size === fotos.filter(f => f.variacao_id === copiarPicker.origemId).length ? 'Limpar seleção' : 'Selecionar todas'}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setCopiarPicker(null)} className="px-3 py-2 text-sm text-gray-500 rounded-xl border border-gray-200 hover:bg-gray-50">Cancelar</button>
                <button onClick={confirmarCopiar} disabled={copiarSel.size === 0}
                  className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium disabled:opacity-50">
                  Copiar {copiarSel.size}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
