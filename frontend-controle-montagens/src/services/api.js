import axios from 'axios';

// ⚠️ ATENÇÃO AQUI: Se for testar no celular físico, substitua 'localhost' 
// pelo endereço de IP do seu computador (ex: '119.168.1.50').
const api = axios.create({
    baseURL: 'https://api.nortferelevadores.com', 
});

export default api;