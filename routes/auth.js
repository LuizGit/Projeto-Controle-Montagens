const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Chave secreta para assinar o Token JWT (Mude para algo complexo em produção)
const JWT_SECRET = 'minha_chave_secreta_super_protegida';

module.exports = (db) => {
    // Rota de Login
    router.post('/login', (req, res) => {
        const { Nome, Senha } = req.body;

        // 1. Busca o usuário pelo Nome
        const query = 'SELECT * FROM Usuario WHERE Nome = ? AND Ativo = TRUE';
        db.query(query, [Nome], async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // 2. Verifica se o usuário existe
            if (results.length === 0) {
                return res.status(401).json({ error: 'Usuário não encontrado ou inativo.' });
            }

            const usuario = results[0];

            // 3. Compara a senha digitada com a senha criptografada do banco
            const senhaCorreta = await bcrypt.compare(Senha, usuario.Senha);
            if (!senhaCorreta) {
                return res.status(401).json({ error: 'Senha incorreta.' });
            }

            // 4. Se estiver tudo certo, gera o Token JWT
            const token = jwt.sign(
                { id: usuario.Id, nome: usuario.Nome, admin: usuario.Admin },
                JWT_SECRET,
                { expiresIn: '8h' } // O token expira em 8 horas
            );

            // 5. Retorna os dados do usuário e o token para o React Native
            res.json({
                message: 'Login realizado com sucesso!',
                token,
                usuario: {
                    id: usuario.Id,
                    nome: usuario.Nome,
                    admin: usuario.Admin
                }
            });
        });
    });

    return router;
};