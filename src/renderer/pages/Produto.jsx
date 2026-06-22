import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, uploadFotos } from '../api';

import FotoGrid from '../components/FotoGrid';

function ComparativoColuna({ titulo, fotos = [], cor }) {
  return (
    <div className={`flex-1 rounded-2xl p-3 ${cor}`}>
      <h3 className="text-sm font-semibold mb-2 text-gray-700">{titulo}</h3>
      {fotos.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">Sem fotos</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((url, i) => (
            <div key={i} className="aspect-square bg-white rounded-xl overflow-hidden shadow-sm">
              <img src={typeof url === 'string' ? url : url.url || url.driveUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SortableVariacao({ v, selected, onSelect, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: v.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center group">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing px-1 text-gray-300 hover:text-gray-400 select-none"
      >
        ⠿
      </div>
      <button
        onClick={() => onSelect(v.id)}
        className={`flex-1 text-left text-sm px-2 py-2 rounded-xl transition-colors ${
          selected ? 'bg-brand-600 text-white' : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        {v.nome}
      </button>
      <button
        onClick={() => onDelete(v.id)}
        className="opacity-0 group-hover:opacity-100 ml-1 text-gray-400 hover:text-red-500 text-xs px-1"
      >×</button>
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
  const [concluindo, setConcluindo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('fotos');
  const [novaVariacao, setNovaVariacao] = useState('');
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
      await api.criarVariacao(id, novaVariacao.trim());
      setNovaVariacao('');
      setAdicionandoVariacao(false);
      carregar();
    } catch (err) {
      setMensagem('Erro ao criar variação: ' + err.message);
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
            {!tinyPublicado ? (
              <button
                onClick={async () => {
                  setPublicando('tiny');
                  setMensagem('');
                  try {
                    const result = await api.publicarLancamentoTiny(id);
                    setMensagem(`${result.fotosPublicadas} foto(s) publicadas no Tiny!`);
                    setTinyPublicado(true);
                  } catch (err) {
                    setMensagem('Erro: ' + err.message);
                  } finally {
                    setPublicando('');
                  }
                }}
                disabled={!!publicando}
                className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-xl disabled:opacity-50 font-semibold transition-colors"
              >
                {publicando === 'tiny' ? 'Publicando...' : 'Adicionar ao produto no Tiny'}
              </button>
            ) : (
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
                disabled={concluindo}
                className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 font-semibold transition-colors"
              >
                {concluindo ? 'Concluindo...' : '✓ Concluir lançamento'}
              </button>
            )}
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
                className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 disabled:opacity-50 transition-colors"
              >
                {importando ? 'Importando...' : `↓ Wbuy → Drive (${produto.fotos_wbuy.length})`}
              </button>
            )}
            <button onClick={() => publicar('tiny')} disabled={!!publicando}
              className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 disabled:opacity-50">
              {publicando === 'tiny' ? 'Publicando...' : 'Publicar no Tiny'}
            </button>
            <button onClick={() => publicar('wbuy')} disabled={!!publicando}
              className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 disabled:opacity-50">
              {publicando === 'wbuy' ? 'Publicando...' : 'Publicar na Wbuy'}
            </button>
            <button onClick={() => publicar('ambos')} disabled={!!publicando}
              className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-xl disabled:opacity-50 font-semibold">
              {publicando === 'ambos' ? 'Publicando...' : 'Publicar nos Dois'}
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
            <form onSubmit={handleAdicionarVariacao} className="mb-2 flex gap-1 px-1">
              <input
                autoFocus
                value={novaVariacao}
                onChange={e => setNovaVariacao(e.target.value)}
                placeholder="Ex: Rosa"
                className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              <button type="submit" className="text-xs px-2 py-1 bg-brand-600 text-white rounded-xl">OK</button>
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
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl disabled:opacity-50 font-medium transition-colors"
                >
                  {uploadando ? 'Enviando...' : '+ Adicionar fotos'}
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
                  fotos={comparativo.drive?.map(f => f.thumbnail_url || f.drive_url)}
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
