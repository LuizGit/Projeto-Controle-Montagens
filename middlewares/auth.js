const jwt = require('jsonwebtoken');
const JWT_SECRET = 'minha_chave_secreta_super_protegida'; // Deve ser a mesma chave do auth.js

// Middleware para verificar se o usuário está logado (Qualquer usuário ativo)
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Pega o token após a palavra "Bearer"

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    try {
        const decorrido = jwt.verify(token, JWT_SECRET);
        req.usuarioLogado = decorrido; // Guarda os dados do usuário (Id, Nome, Admin) na requisição
        next(); // Autorizado! Vai para a próxima função
    } catch (error) {
        res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};

// Middleware para verificar se o usuário é Administrador
const apenasAdmin = (req, res, next) => {
    // Primeiro garante que o token foi verificado
    if (!req.usuarioLogado) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    // Se NÃO for administrador, bloqueia a ação
    if (!req.usuarioLogado.admin) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
    }

    next(); // É admin! Pode continuar
};

module.exports = { verificarToken, apenasAdmin };