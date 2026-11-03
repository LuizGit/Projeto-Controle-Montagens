import axios from 'axios';

// Configura a URL base dinâmica diferenciando Desenvolvimento (Local) de Produção (HostGator)
const api = axios.create({
    // 🚀 ALTERADO: Se estiver em produção, adiciona o prefixo /api para bater na pasta correta do Node.js
    baseURL: import.meta.env.PROD 
        ? 'https://api.nortferelevadores.com' 
        : 'http://localhost:3000', 
    timeout: 10000, 
    headers: {
        'Content-Type': 'application/json',
    }
});

// 🛡️ INTERCEPTOR DE REQUISIÇÃO: Injeta o Token automaticamente
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('@Nortfer:token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 🔄 INTERCEPTOR DE RESPOSTA: Limpa a sessão se o token expirar (Erro 401)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('@Nortfer:token');
            localStorage.removeItem('@Nortfer:usuario');
            
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;