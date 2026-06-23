import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, notificar } from '../api';

/* ---------- ícones ---------- */
const IconNoPhoto = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 15V5a2 2 0 0 0-2-2H9M3 3l18 18M3 7v12a2 2 0 0 0 2 2h12M21 15l-5-5M8.5 8.5 3 14" />
  </svg>
);
const IconDiverge = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
  </svg>
);
const IconTag = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59A2 2 0 0 0 3.41 11l9.59 9.59a2 2 0 0 0 2.82 0l4.77-4.77a2 2 0 0 0 0-2.41Z" />
    <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
const IconBroken = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
  </svg>
);
const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/* ---------- paleta por categoria ---------- */
const TONS = {
  slate:  { badge: 'bg-slate-100 text-slate-600',   pill: 'bg-slate-100 text-slate-600',   head: 'text-slate-700',   accent: 'bg-slate-400' },
  amber:  { badge: 'bg-amber-100 text-amber-600',   pill: 'bg-amber-100 text-amber-700',   head: 'text-amber-700',   accent: 'bg-amber-400' },
  orange: { badge: 'bg-orange-100 text-orange-600', pill: 'bg-orange-100 text-orange-700', head: 'text-orange-700',  accent: 'bg-orange-400' },
  red:    { badge: 'bg-red-100 text-red-600',       pill: 'bg-red-100 text-red-700',       head: 'text-red-700',     accent: 'bg-red-400' },
};

function Stat({ icon: Icon, label, value, tom, ativo }) {
  const t = TONS[tom];
  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-center gap-3.5 transition-shadow ${value > 0 ? 'border-gray-200 shadow-sm' : 'border-gray-100'}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${t.badge}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-bold leading-none ${value > 0 ? 'text-gray-900' : 'text-gray-300'}`}>{value}</div>
        <div className="text-xs text-gray-400 mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}

function Card({ icon: Icon, titulo, tom, total, children }) {
  const t = TONS[tom];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.badge}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className={`font-semibold text-sm flex-1 ${t.head}`}>{titulo}</h2>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${t.pill}`}>{total}</span>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[360px]">
        {total === 0
          ? <div className="px-5 py-10 text-center text-gray-300 text-sm flex flex-col items-center gap-2">
              <span className="text-2xl">🎉</span> Nada pendente aqui
            </div>
          : <div className="divide-y divide-gray-50">{children}</div>}
      </div>
    </div>
  );
}

export default function Pendencias() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [republicando, setRepublicando] = useState(() => new Set());
  const [msg, setMsg] = useState(null);
  const [reproc, setReproc] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let t;
    const tick = async () => {
      try { const s = await api.statusReprocessar(); setReproc(s); if (s.rodando) t = setTimeout(tick, 2000); } catch {}
    };
    tick();
    return () => clearTimeout(t);
  }, []);

  async function padronizarFotos() {
    if (!confirm('Reprocessar TODAS as fotos antigas para 1:1 + 500KB? Roda em segundo plano e pode levar um tempo.')) return;
    try {
      const r = await api.reprocessarTodos();
      setReproc({ rodando: true, total: r.total, processados: 0, ok: 0, erro: 0 });
      const tick = async () => {
        const s = await api.statusReprocessar(); setReproc(s);
        if (s.rodando) setTimeout(tick, 2000);
        else notificar('Padronização concluída', `${s.ok} fotos${s.erro ? `, ${s.erro} com erro` : ''}`);
      };
      setTimeout(tick, 2000);
    } catch (e) { setMsg({ tipo: 'erro', txt: e.message }); }
  }

  async function carregar() {
    setCarregando(true); setErro(null);
    try { setDados(await api.getPendencias()); }
    catch (e) { setErro(e.message); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function igualar(p, e) {
    e.stopPropagation();
    setRepublicando(s => new Set(s).add(p.id));
    setMsg(null);
    try {
      const r = await api.republicar(p.id, 'ambos');
      const partes = [];
      if (r.tiny) partes.push(`Tiny ${r.tiny.ok ? 'ok' : '✗ ' + r.tiny.motivo}`);
      if (r.wbuy) partes.push(`Wbuy ${r.wbuy.ok ? 'ok' : '✗ ' + r.wbuy.motivo}`);
      setMsg({ tipo: 'ok', txt: `${p.nome}: ${partes.join(' · ')}` });
      carregar();
    } catch (err) {
      setMsg({ tipo: 'erro', txt: `${p.nome}: ${err.message}` });
    } finally {
      setRepublicando(s => { const n = new Set(s); n.delete(p.id); return n; });
    }
  }

  const Linha = ({ onClick, children }) => (
    <button onClick={onClick} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition flex items-center justify-between gap-2 group">
      {children}
    </button>
  );
  const Seta = () => <span className="text-gray-300 group-hover:text-brand-500 transition-colors"><Chevron /></span>;

  const rodando = reproc && reproc.rodando;

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      {/* Cabeçalho */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pendências</h1>
          <p className="text-gray-400 text-sm mt-0.5">O que falta resolver no catálogo</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={padronizarFotos} disabled={rodando}
            title="Reprocessa as fotos antigas para 1:1 + 500KB"
            className="text-sm px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60 transition flex items-center gap-2 shadow-sm">
            {rodando
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Padronizando {reproc.processados}/{reproc.total}…</>
              : <>🖼 Padronizar fotos</>}
          </button>
          <button onClick={carregar} disabled={carregando}
            className="text-sm px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
            {carregando ? 'Atualizando…' : '↻ Atualizar'}
          </button>
        </div>
      </div>

      {/* Barra de progresso da padronização */}
      {rodando && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Padronizando fotos…</span><span>{reproc.processados}/{reproc.total}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 transition-all" style={{ width: `${reproc.total ? (reproc.processados / reproc.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}
      {reproc && !reproc.rodando && reproc.concluido_em && (reproc.ok + reproc.erro) > 0 && (
        <div className="bg-green-50 text-green-700 px-4 py-2.5 rounded-xl mb-4 text-sm">
          ✓ Padronização concluída: {reproc.ok} fotos{reproc.erro ? ` · ${reproc.erro} com erro` : ''}.
        </div>
      )}
      {erro && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{erro}</div>}
      {msg && <div className={`px-4 py-3 rounded-xl mb-4 text-sm ${msg.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.txt}</div>}

      {!dados && carregando && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      )}

      {dados && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Stat icon={IconNoPhoto} label="Produtos sem foto"   value={dados.sem_foto.total}    tom="slate" />
            <Stat icon={IconDiverge} label="Divergentes"          value={dados.divergentes.total} tom="amber" />
            <Stat icon={IconTag}     label="Variações sem SKU"     value={dados.var_sem_sku.total} tom="orange" />
            <Stat icon={IconBroken}  label="Fotos quebradas"       value={dados.quebradas.total}   tom="red" />
          </div>

          {/* Listas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card icon={IconNoPhoto} titulo="Produtos sem foto" tom="slate" total={dados.sem_foto.total}>
              {dados.sem_foto.itens.map(p => (
                <Linha key={p.id} onClick={() => navigate(`/produto/${p.id}`)}>
                  <span className="text-sm text-gray-800 truncate">{p.nome}</span>
                  <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1.5"><span className="font-mono">{p.sku}</span><Seta /></span>
                </Linha>
              ))}
            </Card>

            <Card icon={IconDiverge} titulo="Divergentes (Drive ≠ publicado)" tom="amber" total={dados.divergentes.total}>
              {dados.divergentes.itens.map(p => (
                <div key={p.id} className="px-4 py-2.5 hover:bg-gray-50 transition flex items-center justify-between gap-2">
                  <button onClick={() => navigate(`/produto/${p.id}`)} className="flex-1 min-w-0 text-left">
                    <span className="text-sm text-gray-800 truncate block">{p.nome}</span>
                  </button>
                  <span className="text-[11px] shrink-0 flex gap-1">
                    <span title="Drive" className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 font-semibold">D{p.drive}</span>
                    {p.tem_tiny && <span title="Tiny" className={`px-1.5 py-0.5 rounded font-semibold ${p.drive !== p.tiny ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>T{p.tiny}</span>}
                    {p.tem_wbuy && <span title="Wbuy" className={`px-1.5 py-0.5 rounded font-semibold ${p.drive !== p.wbuy ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>W{p.wbuy}</span>}
                  </span>
                  <button onClick={e => igualar(p, e)} disabled={republicando.has(p.id)}
                    title="Igualar Tiny/Wbuy às fotos do Drive"
                    className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 shrink-0 transition">
                    {republicando.has(p.id) ? '…' : 'Igualar'}
                  </button>
                </div>
              ))}
            </Card>

            <Card icon={IconTag} titulo="Variações com foto mas sem SKU" tom="orange" total={dados.var_sem_sku.total}>
              {dados.var_sem_sku.itens.map(v => (
                <Linha key={v.id} onClick={() => navigate(`/produto/${v.produto_id}`)}>
                  <span className="text-sm text-gray-800 truncate">{v.nome} <span className="text-gray-400">· {v.variacao}</span></span>
                  <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1.5"><span className="font-mono">{v.sku || '—'}</span><Seta /></span>
                </Linha>
              ))}
            </Card>

            <Card icon={IconBroken} titulo="Fotos quebradas (importação)" tom="red" total={dados.quebradas.total}>
              {dados.quebradas.itens.map(p => (
                <Linha key={p.id} onClick={() => navigate(`/produto/${p.id}`)}>
                  <span className="text-sm text-gray-800 truncate">{p.nome}</span>
                  <span className="text-xs text-red-500 shrink-0 flex items-center gap-1.5">{p.fotos_ruins} ruim(s)<Seta /></span>
                </Linha>
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
