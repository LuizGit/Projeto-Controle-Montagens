import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CadastroMontagem from './pages/CadastroMontagem';

// 🎨 Objeto de estilos centralizado
const styles = {
    containerTemporario: {
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif'
    },
    titulo: {
        color: '#005483',
        fontSize: '28px',
        marginBottom: '10px'
    },
    texto: {
        color: '#4B5563',
        fontSize: '16px'
    }
};

// 🛡️ Guarda de Rotas para Administradores
const RotaPrivadaAdmin = ({ children }) => {
    const token = localStorage.getItem('@Nortfer:token');
    const usuarioRaw = localStorage.getItem('@Nortfer:usuario');
    
    if (!token || !usuarioRaw) {
        return <Navigate to="/login" replace />;
    }

    const usuario = JSON.parse(usuarioRaw);

    if (usuario.admin !== 1 && usuario.admin !== true) {
        alert('Acesso negado. Este painel é exclusivo para administradores da NORTFER.');
        localStorage.clear(); 
        return <Navigate to="/login" replace />;
    }

    return children;
};

// 🔄 Componente para decidir a página inicial
const RedirecionadorInicial = () => {
    const token = localStorage.getItem('@Nortfer:token');
    return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Rota Inicial: Decide o destino do usuário com base no Token */}
                <Route path="/" element={<RedirecionadorInicial />} />
                
                {/* Rota de Login */}
                <Route path="/login" element={<Login />} />
                
                {/* Rota Protegida do Dashboard */}
                <Route 
                  path="/dashboard" 
                  element={
                        <RotaPrivadaAdmin>
                        <Dashboard />
                        </RotaPrivadaAdmin>
                  } 
                />
                <Route 
                  path="/cadastrar-montagem" 
                  element={
                      <RotaPrivadaAdmin>
                      <CadastroMontagem />
                      </RotaPrivadaAdmin>
                  } 
                />
                
                {/* Rota de Fuga para links quebrados ou inexistentes */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}