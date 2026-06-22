import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './components/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import TitleBar from './components/TitleBar';
import Layout from './components/Layout';
import Login from './pages/Login';
import Produtos from './pages/Produtos';
import Produto from './pages/Produto';
import Lancamentos from './pages/Lancamentos';

function PrivateRoutes() {
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <div className="flex flex-col h-screen bg-gray-100">
      <TitleBar />
      <div className="flex-1 min-h-0">
        <AuthProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<PrivateRoutes />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Produtos />} />
                  <Route path="/lancamentos" element={<Lancamentos />} />
                  <Route path="/produto/:id" element={<Produto />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </div>
    </div>
  </ErrorBoundary>
);
