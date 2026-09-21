import axios from 'axios';

// ⚠️ ATENÇÃO AQUI: Se for testar no celular físico, substitua 'localhost' 
// pelo endereço de IP do seu computador (ex: '119.168.1.50').
const api = axios.create({
    baseURL: 'http://192.168.0.40:3000', 
});

export default api;