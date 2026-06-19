// URL da API — em produção aponta para fotos.autoeita.space
const API_URL = import.meta.env.VITE_API_URL || 'https://fotos.autoeita.space';

let _token = null;

export function setToken(t) { _token = t; }
export function getToken() { return _token; }

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
  getComparativo: (id) => req(`/api/produtos/${id}/comparativo`),

  // Fotos
  getFotos: (produtoId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/api/fotos/${produtoId}${qs ? '?' + qs : ''}`);
  },
  atualizarOrdem: (ordens) => req('/api/fotos/ordem', { method: 'PATCH', body: JSON.stringify({ ordens }) }),
  deletarFoto: (id) => req(`/api/fotos/${id}`, { method: 'DELETE' }),

  // Sync
  triggerSync: () => req('/api/sync', { method: 'POST' }),
  getStatusSync: () => req('/api/sync/status'),

  // Publicar
  publicarTiny: (produtoId, body = {}) => req(`/api/publicar/tiny/${produtoId}`, { method: 'POST', body: JSON.stringify(body) }),
  publicarWbuy: (produtoId, body = {}) => req(`/api/publicar/wbuy/${produtoId}`, { method: 'POST', body: JSON.stringify(body) }),
  publicarAmbos: (produtoId) => req(`/api/publicar/ambos/${produtoId}`, { method: 'POST' }),
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
