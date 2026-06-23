// URL da API — em produção aponta para fotos.autoeita.space
const API_URL = import.meta.env.VITE_API_URL || 'https://foto-manager-api.tqgmkj.easypanel.host';

let _token = null;

export function setToken(t) { _token = t; }
export function getToken() { return _token; }

// Imagem do Drive via CDN do Google (lh3) — direto, sem o redirect/throttle do
// drive.google.com. Muito mais rápido para carregar várias fotos de uma vez.
export function driveImg(fileId, w = 400) {
  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w${w}` : null;
}
// Extrai o file id de uma URL do Drive (uc?export=view&id=... ou /thumbnail?id=... ou /d/ID)
export function fileIdFromUrl(url) {
  if (!url) return null;
  const m = String(url).match(/[?&]id=([^&]+)/) || String(url).match(/\/d\/([^=/?]+)/);
  return m ? m[1] : null;
}

// Notificação nativa do sistema (ao terminar tarefas longas)
export function notificar(titulo, corpo) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') new Notification(titulo, { body: corpo });
    else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { if (p === 'granted') new Notification(titulo, { body: corpo }); });
  } catch {}
}

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (_token) headers.Authorization = `Bearer ${_token}`;

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (username, password) => req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  trocarSenha: (body) => req('/api/auth/trocar-senha', { method: 'POST', body: JSON.stringify(body) }),

  // Produtos
  getProdutos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/api/produtos${qs ? '?' + qs : ''}`);
  },
  getProduto: (id) => req(`/api/produtos/${id}`),
  getPendencias: () => req('/api/produtos/pendencias'),
  republicar: (id, destino = 'ambos') => req(`/api/produtos/${id}/republicar`, { method: 'POST', body: JSON.stringify({ destino }) }),
  getComparativo: (id, variacaoId = null) => {
    const qs = variacaoId ? `?variacao_id=${variacaoId}` : '';
    return req(`/api/produtos/${id}/comparativo${qs}`);
  },

  // Fotos
  getFotos: (produtoId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/api/fotos/${produtoId}${qs ? '?' + qs : ''}`);
  },
  atualizarOrdem: (ordens) => req('/api/fotos/ordem', { method: 'PATCH', body: JSON.stringify({ ordens }) }),
  copiarVariacao: (produto_id, origem_variacao_id, destino_variacao_id) =>
    req('/api/fotos/copiar-variacao', { method: 'POST', body: JSON.stringify({ produto_id, origem_variacao_id, destino_variacao_id }) }),
  deletarFoto: (id) => req(`/api/fotos/${id}`, { method: 'DELETE' }),

  // Variações
  criarVariacao: (produtoId, nome, sku_variacao) => req(`/api/produtos/${produtoId}/variacoes`, { method: 'POST', body: JSON.stringify({ nome, sku_variacao }) }),
  editarVariacao: (produtoId, variacaoId, body) => req(`/api/produtos/${produtoId}/variacoes/${variacaoId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deletarVariacao: (produtoId, variacaoId) => req(`/api/produtos/${produtoId}/variacoes/${variacaoId}`, { method: 'DELETE' }),
  reordenarVariacoes: (produtoId, ordens) => req(`/api/produtos/${produtoId}/variacoes/ordem`, { method: 'PATCH', body: JSON.stringify({ ordens }) }),

  // Sync
  triggerSync: () => req('/api/sync', { method: 'POST' }),
  getStatusSync: () => req('/api/sync/status'),

  // Publicar
  publicarTiny: (produtoId, body = {}) => req(`/api/publicar/tiny/${produtoId}`, { method: 'POST', body: JSON.stringify(body) }),
  publicarWbuy: (produtoId, body = {}) => req(`/api/publicar/wbuy/${produtoId}`, { method: 'POST', body: JSON.stringify(body) }),
  publicarAmbos: (produtoId) => req(`/api/publicar/ambos/${produtoId}`, { method: 'POST' }),

  // Importar fotos da Wbuy para o Drive
  importarFotosWbuy: (produtoId) => req(`/api/fotos/importar-wbuy/${produtoId}`, { method: 'POST' }),

  // Reprocessar fotos antigas (1:1 + 500KB)
  reprocessarTodos: () => req('/api/fotos/reprocessar-todos', { method: 'POST' }),
  statusReprocessar: () => req('/api/fotos/reprocessar-todos/status'),

  // Lançamentos
  getLancamentos: () => req('/api/lancamentos'),
  criarLancamento: (body) => req('/api/lancamentos', { method: 'POST', body: JSON.stringify(body) }),
  atualizarLancamento: (id, body) => req(`/api/lancamentos/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  publicarLancamentoTiny: (id) => req(`/api/lancamentos/${id}/publicar-tiny`, { method: 'POST' }),
  publicarLancamentoWbuy: (id) => req(`/api/lancamentos/${id}/publicar-wbuy`, { method: 'POST' }),
  concluirLancamento: (id) => req(`/api/lancamentos/${id}`, { method: 'DELETE' }),
};

// Upload multipart — usa window.electronAPI para ler os arquivos locais
export async function uploadFotos(produtoId, variacaoId, filePaths) {
  const formData = new FormData();
  formData.append('produto_id', produtoId);
  if (variacaoId) formData.append('variacao_id', variacaoId);

  for (const filePath of filePaths) {
    const { buffer, name } = await window.electronAPI.readFile(filePath);
    const bytes = Uint8Array.from(atob(buffer), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    formData.append('files', blob, name);
  }

  const headers = {};
  if (_token) headers.Authorization = `Bearer ${_token}`;

  const res = await fetch(`${API_URL}/api/fotos/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
