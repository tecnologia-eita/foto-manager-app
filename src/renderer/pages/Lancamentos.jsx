import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function CardLancamento({ l, onUpdate, onNavigate, onDelete }) {
  const [editNome, setEditNome] = useState(l.nome);
  const [editSku, setEditSku] = useState(l.sku);
  const [salvando, setSalvando] = useState(false);
  const nomeRef = useRef(null);

  async function salvar() {
    if (editNome === l.nome && editSku === l.sku) return;
    setSalvando(true);
    try {
      const updated = await api.atualizarLancamento(l.id, { nome: editNome, sku: editSku });
      onUpdate(updated);
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
      setEditNome(l.nome);
      setEditSku(l.sku);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 border border-transparent hover:border-brand-100 transition-all">
      {/* Nome editável */}
      <input
        ref={nomeRef}
        value={editNome}
        onChange={e => setEditNome(e.target.value)}
        onBlur={salvar}
        onKeyDown={e => e.key === 'Enter' && nomeRef.current?.blur()}
        className="text-sm font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-brand-400 focus:outline-none py-0.5 w-full transition-colors"
        placeholder="Nome do produto"
      />

      {/* SKU editável */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 shrink-0">SKU</span>
        <input
          value={editSku}
          onChange={e => setEditSku(e.target.value)}
          onBlur={salvar}
          onKeyDown={e => e.key === 'Enter' && e.target.blur()}
          className="text-xs font-mono text-brand-600 bg-brand-50 border border-brand-100 focus:border-brand-400 focus:outline-none rounded-lg px-2 py-1 w-full transition-colors"
          placeholder="SKU-DO-PRODUTO"
        />
        {salvando && <span className="text-xs text-gray-400 shrink-0">•••</span>}
      </div>

      {/* Info fotos + botões */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-300">
            <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd"/>
          </svg>
          <span className="text-xs text-gray-400">{l.total_fotos || 0} foto(s)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onDelete(l.id, l.nome)}
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir lançamento"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd"/>
            </svg>
          </button>
          <button
            onClick={() => onNavigate(l.id)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            Gerenciar fotos →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoSku, setNovoSku] = useState('');
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const navigate = useNavigate();
  const nomeInputRef = useRef(null);

  async function carregar() {
    setCarregando(true);
    try {
      const data = await api.getLancamentos();
      setLancamentos(data.lancamentos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);
  useEffect(() => { if (criando) nomeInputRef.current?.focus(); }, [criando]);

  async function handleCriar(e) {
    e.preventDefault();
    if (!novoNome.trim() || !novoSku.trim()) return;
    setSalvandoNovo(true);
    try {
      await api.criarLancamento({ nome: novoNome.trim(), sku: novoSku.trim() });
      setNovoNome('');
      setNovoSku('');
      setCriando(false);
      await carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvandoNovo(false);
    }
  }

  function handleUpdate(updated) {
    setLancamentos(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
  }

  async function handleDelete(id, nome) {
    if (!confirm(`Excluir o lançamento "${nome}"? As fotos no Drive também serão APAGADAS.`)) return;
    try {
      await api.concluirLancamento(id);
      setLancamentos(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  }

  return (
    <div className="h-full">
      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl px-6 py-4 mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900 text-lg leading-tight">Lançamentos</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {lancamentos.length} produto(s) em preparação
          </p>
        </div>
        <button
          onClick={() => setCriando(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd"/>
          </svg>
          Novo lançamento
        </button>
      </div>

      {/* Formulário de criação */}
      {criando && (
        <div className="bg-white rounded-2xl px-6 py-5 mb-3 border-2 border-brand-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Novo lançamento</h2>
          <form onSubmit={handleCriar} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome do produto</label>
              <input
                ref={nomeInputRef}
                type="text"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                placeholder="Ex: Cadeira Montessori Premium"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 text-sm"
              />
            </div>
            <div className="w-44">
              <label className="block text-xs font-medium text-gray-500 mb-1">SKU</label>
              <input
                type="text"
                value={novoSku}
                onChange={e => setNovoSku(e.target.value.toUpperCase())}
                placeholder="SKU-DO-PRODUTO"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 text-sm font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setCriando(false); setNovoNome(''); setNovoSku(''); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoNovo || !novoNome.trim() || !novoSku.trim()}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
              >
                {salvandoNovo ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {carregando ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Carregando...</div>
      ) : lancamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-gray-300">
              <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-4.131A15.838 15.838 0 016.382 15H2.25a.75.75 0 01-.75-.75 6.75 6.75 0 017.815-6.666zM15 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd"/>
              <path d="M5.26 17.242a.75.75 0 10-.897-1.203 5.243 5.243 0 00-2.05 5.022.75.75 0 00.625.627 5.243 5.243 0 005.022-2.051.75.75 0 10-1.202-.897 3.744 3.744 0 01-3.008 1.51c0-1.23.592-2.323 1.51-3.008z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">Nenhum lançamento em preparação.</p>
          <p className="text-xs text-gray-400 mt-1">Crie um para começar a adicionar fotos antes do lançamento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {lancamentos.map(l => (
            <CardLancamento
              key={l.id}
              l={l}
              onUpdate={handleUpdate}
              onNavigate={(id) => navigate(`/produto/${id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
