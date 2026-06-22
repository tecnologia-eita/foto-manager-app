import React from 'react';

// Captura erros de render em qualquer tela e evita a "tela branca" do Electron,
// mostrando um fallback com opção de recarregar.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('[ErrorBoundary]', erro, info);
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-6 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="font-bold text-gray-900 text-lg mb-1">Algo deu errado</h1>
          <p className="text-sm text-gray-500 mb-4 max-w-md">
            Ocorreu um erro inesperado na tela. Você pode recarregar o aplicativo.
          </p>
          <pre className="text-[11px] text-gray-400 bg-white rounded-xl p-3 mb-4 max-w-lg overflow-auto">
            {String(this.state.erro?.message || this.state.erro)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
