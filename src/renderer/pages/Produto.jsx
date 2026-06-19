import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import { api, uploadFotos } from '../api';
import FotoGrid from '../components/FotoGrid';

function ComparativoColuna({ titulo, fotos = [], cor }) {
  return (
    <div className={`flex-1 border rounded-xl p-3 ${cor}`}>
      <h3 className="text-sm font-semibold mb-2">{titulo}</h3>
      {fotos.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Sem fotos</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((url, i) => (
            <div key={i} className="aspect-square bg-white rounded-lg overflow-hidden">
              <img src={typeof url === 'string' ? url : url.url || url.driveUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Produto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [produto, setProduto] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [variacoes, setVariacoes] = useState([]);
  const [variacaoSelecionada, setVariacaoSelecionada] = useState(null); // null = Principal
  const [comparativo, setComparativo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [uploadando, setUploadando] = useState(false);
  const [publicando, setPublicando] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('fotos'); // 'fotos' | 'comparativo'

  const carregar = useCallback(async () => {
    try {
      const data = await api.getProduto(id);
      setProduto(data);
      setVariacoes(data.variacoes || []);
      setFotos(data.fotos?.filter(f => variacaoSelecionada ? f.variacao_id === variacaoSelecionada : f.variacao_id === null) || []);
    } catch (err) {
      setMensagem('Erro ao carregar produto: ' + err.message);
    } finally {
      setCarregando(false);
    }
  }, [id, variacaoSelecionada]);

  useEffect(() => { carregar(); }, [carregar]);

  async function carregarComparativo() {
    try {
      const data = await api.getComparativo(id);
      setComparativo(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (abaAtiva === 'comparativo') carregarComparativo();
  }, [abaAtiva, id]);

  async function handleUpload() {
    try {
      const filePaths = await window.electronAPI.openFiles();
      if (!filePaths?.length) return;

      setUploadando(true);
      setMensagem('');
      const result = await uploadFotos(id, variacaoSelecionada, filePaths);
      if (result.erros?.length) {
        setMensagem(`${result.uploaded.length} upload(s) OK. Erros: ${result.erros.map(e => e.arquivo).join(', ')}`);
      } else {
        setMensagem(`${result.uploaded.length} foto(s) adicionada(s) com sucesso!`);
      }
      carregar();
    } catch (err) {
      setMensagem('Erro no upload: ' + err.message);
    } finally {
      setUploadando(false);
    }
  }

  async function handleReorder(oldIndex, newIndex) {
    const novaOrdem = arrayMove(fotos, oldIndex, newIndex);
    setFotos(novaOrdem);
    const ordens = novaOrdem.map((f, i) => ({ id: f.id, ordem: i + 1 }));
    await api.atualizarOrdem(ordens).catch(console.error);
  }

  async function handleDelete(fotoId) {
    if (!confirm('Remover esta foto do Drive e do sistema?')) return;
    await api.deletarFoto(fotoId);
    carregar();
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
    return <div className="flex items-center justify-center h-screen text-gray-400">Carregando...</div>;
  }

  if (!produto) {
    return <div className="flex items-center justify-center h-screen text-red-500">Produto não encontrado</div>;
  }

  const fotosVariacao = fotos.filter(f =>
    variacaoSelecionada ? f.variacao_id === variacaoSelecionada : f.variacao_id === null
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</button>
            <div>
              <h1 className="font-bold text-gray-800">{produto.nome}</h1>
              <p className="text-xs text-gray-400">SKU: {produto.sku}</p>
            </div>
          </div>

          {/* Ações de publicação */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => publicar('tiny')}
              disabled={!!publicando}
              className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg disabled:opacity-50"
            >
              {publicando === 'tiny' ? 'Publicando...' : 'Publicar no Tiny'}
            </button>
            <button
              onClick={() => publicar('wbuy')}
              disabled={!!publicando}
              className="px-3 py-1.5 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg disabled:opacity-50"
            >
              {publicando === 'wbuy' ? 'Publicando...' : 'Publicar na Wbuy'}
            </button>
            <button
              onClick={() => publicar('ambos')}
              disabled={!!publicando}
              className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 font-semibold"
            >
              {publicando === 'ambos' ? 'Publicando...' : '✓ Publicar nos Dois'}
            </button>
          </div>
        </div>

        {mensagem && (
          <div className={`mt-2 text-sm px-3 py-1.5 rounded-lg ${mensagem.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {mensagem}
          </div>
        )}
      </div>

      <div className="p-6 flex gap-6">
        {/* Sidebar: variações */}
        <div className="w-48 shrink-0">
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Variações</h2>
          <div className="space-y-1">
            <button
              onClick={() => setVariacaoSelecionada(null)}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${variacaoSelecionada === null ? 'bg-orange-500 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              Principal
            </button>
            {variacoes.filter(v => v.nome !== 'Principal').map(v => (
              <button
                key={v.id}
                onClick={() => setVariacaoSelecionada(v.id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${variacaoSelecionada === v.id ? 'bg-orange-500 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                {v.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1">
          {/* Abas */}
          <div className="flex gap-4 mb-4 border-b border-gray-200">
            <button
              onClick={() => setAbaAtiva('fotos')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${abaAtiva === 'fotos' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Fotos padrão (Drive)
            </button>
            <button
              onClick={() => setAbaAtiva('comparativo')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${abaAtiva === 'comparativo' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Comparativo Tiny × Wbuy
            </button>
          </div>

          {abaAtiva === 'fotos' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{fotosVariacao.length} foto(s) · arraste para reordenar</p>
                <button
                  onClick={handleUpload}
                  disabled={uploadando}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg disabled:opacity-50 font-medium"
                >
                  {uploadando ? 'Enviando...' : '+ Adicionar fotos'}
                </button>
              </div>
              <FotoGrid fotos={fotosVariacao} onReorder={handleReorder} onDelete={handleDelete} />
            </>
          )}

          {abaAtiva === 'comparativo' && comparativo && (
            <div className="flex gap-4">
              <ComparativoColuna
                titulo={`📂 Google Drive (${comparativo.drive?.length || 0})`}
                fotos={comparativo.drive?.map(f => f.thumbnail_url || f.drive_url)}
                cor="border-orange-200 bg-orange-50"
              />
              <ComparativoColuna
                titulo={`🔵 Tiny (${comparativo.tiny?.length || 0})`}
                fotos={comparativo.tiny}
                cor="border-blue-200 bg-blue-50"
              />
              <ComparativoColuna
                titulo={`🟣 Wbuy (${comparativo.wbuy?.length || 0})`}
                fotos={comparativo.wbuy}
                cor="border-purple-200 bg-purple-50"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
