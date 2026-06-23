import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, uploadFotos, driveImg, fileIdFromUrl } from '../api';

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

  const sensors = useSensors(useSensor(PointerSensor));

  const carregar = useCallback(async () => {
    try {
      const data = await api.getProduto(id);
      setProduto(data);
      const cores = (data.variacoes || []).filter(v => v.nome !== 'Principal');
      setVariacoes(cores);
      setFotos(data.fotos || []);
      setVariacaoSelecionada(prev => (prev === null && cores.length > 0) ? cores[0].id : prev);
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
      setMensagem(result.erros?.length
        ? `${result.uploaded.length} OK. Erros: ${result.erros.map(e => e.arquivo).join(', ')}`
        : `${result.uploaded.length} foto(s) adicionada(s)!`
      );
      carregar();
    } catch (err) {
      setMensagem('Erro no upload: ' + err.message);
    } finally {
      setUploadando(false);
    }
  }

  async function handleReorder(oldIndex, newIndex) {
    const novaOrdem = arrayMove(fotos.filter(f => f.variacao_id === variacaoSelecionada), oldIndex, newIndex);
    await api.atualizarOrdem(novaOrdem.map((f, i) => ({ id: f.id, ordem: i + 1 }))).catch(console.error);
    carregar();
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

      if (destino === 'ambos') {
        const tiny = result.resultados.tiny?.ok ? '✓ Tiny' : '✗ Tiny';
        const wbuy = result.resultados.wbuy?.ok ? '✓ Wbuy' : '✗ Wbuy';
        setMensagem(`Publicação concluída: ${tiny}, ${wbuy}`);
      } else {
        setMensagem(`Publicado na ${destino === 'tiny' ? 'Tiny' : 'Wbuy'} com sucesso! ${result.fotosPublicadas} foto(s).`);
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
            {(produto.fotos_wbuy?.length > 0) && (
              <button
                onClick={async () => {
                  if (!confirm(`Importar ${produto.fotos_wbuy.length} foto(s) da Wbuy para o Drive?`)) return;
                  setImportando(true);
                  setMensagem('');
                  try {
                    const r = await api.importarFotosWbuy(id);
                    setMensagem(`${r.importados} foto(s) importadas da Wbuy para o Drive!${r.erros?.length ? ` (${r.erros.length} erro(s))` : ''}`);
                    carregar();
                  } catch (err) {
                    setMensagem('Erro ao importar: ' + err.message);
                  } finally {
                    setImportando(false);
                  }
                }}
                disabled={importando || !!publicando}
                className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {importando ? (<><Spinner /> Importando...</>) : `↓ Wbuy → Drive (${produto.fotos_wbuy.length})`}
              </button>
            )}
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
                <p className="text-sm text-gray-400">{fotosVariacao.length} foto(s) · arraste para reordenar</p>
                <button
                  onClick={handleUpload}
                  disabled={uploadando}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl disabled:opacity-50 font-medium transition-colors flex items-center gap-2"
                >
                  {uploadando ? (<><Spinner /> Enviando...</>) : '+ Adicionar fotos'}
                </button>
              </div>
              <FotoGrid fotos={fotosVariacao} onReorder={handleReorder} onDelete={handleDelete} />
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
                  fotos={comparativo.tiny}
                  cor="bg-gray-50"
                />
                <ComparativoColuna
                  titulo={`Wbuy (${comparativo.wbuy?.length || 0})`}
                  fotos={comparativo.wbuy}
                  cor="bg-gray-50"
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
