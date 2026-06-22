import React, { createContext, useContext, useState, useEffect } from 'react';
import { setToken } from '../api';

const AuthContext = createContext(null);

// Decodifica o payload de um JWT de forma base64url-safe.
// Retorna null se o token for malformado OU já estiver expirado.
function decodeJwtPayload(token) {
  try {
    const base64url = token.split('.')[1];
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    const payload = JSON.parse(json);
    if (payload.exp && Date.now() >= payload.exp * 1000) return null; // expirado
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Carrega token salvo no Electron ao iniciar
    (async () => {
      try {
        const t = await window.electronAPI?.loadToken();
        if (t) {
          const payload = decodeJwtPayload(t);
          if (payload) {
            setToken(t);
            setTokenState(t);
            setUsuario(payload);
          } else {
            // Token expirado ou corrompido — descarta
            await window.electronAPI?.clearToken();
          }
        }
      } catch {
        await window.electronAPI?.clearToken().catch(() => {});
      }
      setCarregando(false);
    })();
  }, []);

  async function login(t, u) {
    setToken(t);
    setTokenState(t);
    setUsuario(u);
    await window.electronAPI?.saveToken(t);
  }

  async function logout() {
    setToken(null);
    setTokenState(null);
    setUsuario(null);
    await window.electronAPI?.clearToken();
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
