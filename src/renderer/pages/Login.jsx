import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../components/AuthContext';
import logo from '../assets/icone-branco.svg';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const data = await api.login(username, password);
      await login(data.token, data.usuario);
      navigate('/');
    } catch (err) {
      setErro(err.message || 'Usuário ou senha incorretos');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="h-full bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-600/40">
            <img src={logo} alt="Logo" className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white">Foto Manager</h1>
          <p className="text-sm text-gray-500 mt-0.5">Eita Casa Perfeita</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-white/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent placeholder-gray-600 text-sm"
                placeholder="seu.usuario"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent placeholder-gray-600 text-sm"
                placeholder="••••••••"
              />
            </div>

            {erro && (
              <div className="bg-red-500/10 text-red-400 text-sm px-3 py-2.5 rounded-xl border border-red-500/20">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors mt-2"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
