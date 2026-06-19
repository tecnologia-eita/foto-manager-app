import React, { createContext, useContext, useState, useEffect } from 'react';
import { setToken } from '../api';

const AuthContext = createContext(null);

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
          setToken(t);
          setTokenState(t);
          // Decodifica payload JWT sem lib (só base64)
          const payload = JSON.parse(atob(t.split('.')[1]));
          setUsuario(payload);
        }
      } catch { /* token inválido */ }
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
