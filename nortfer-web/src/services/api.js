import axios from 'axios';

// Configura a URL base do seu Back-end Node.js
const api = axios.create({
    baseURL: 'http://localhost:3000', // Altere a porta se o seu Node usar outra
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