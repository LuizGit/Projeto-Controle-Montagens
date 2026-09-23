const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Importa o bcrypt
const { verificarToken, apenasAdmin } = require('../middlewares/auth');

module.exports = (db) => {
    // Criar Usuário (Cadastro com Senha Criptografada)
    router.post('/', verificarToken, apenasAdmin, async (req, res) => {
        const { Nome, Senha, Admin, Ativo } = req.body;
        
        try {
            // Criptografa a senha antes de salvar no banco (10 rounds de salt)
            const senhaCriptografada = await bcrypt.hash(Senha, 10);
            
            const query = 'INSERT INTO Usuario (Nome, Senha, Admin, Ativo) VALUES (?, ?, ?, ?)';
            db.query(query, [Nome, senhaCriptografada, Admin || false, Ativo !== false], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ id: result.insertId, Nome, Admin, Ativo });
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao processar a senha.' });
        }
    });

    // Listar todos os Usuários que forem ativos e não forem admins
    router.get('/', verificarToken, apenasAdmin, (req, res) => {
        // Filtra para trazer apenas Montadores (Admin = 0) e que estejam Ativos (Ativo = 1)
        const query = 'SELECT Id, Nome FROM Usuario WHERE Admin = 0 AND Ativo = 1';
        
        db.query(query, (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });

    //Atualizar senha de usuarios montadores
    router.patch('/:id/senha', verificarToken, apenasAdmin, async (req, res) => {
        const { id } = req.params;
        const { NovaSenha } = req.body;

        if (!NovaSenha || NovaSenha.trim().length < 4) {
            return res.status(400).json({ error: 'A nova senha deve ter pelo menos 4 caracteres.' });
        }

        try {
            // Gera a criptografia forte da nova senha antes de salvar
            const senhaCriptografada = await bcrypt.hash(NovaSenha, 10);
            
            // Query com trava de segurança dupla: só atualiza se Admin for 0
            const query = 'UPDATE Usuario SET Senha = ? WHERE Id = ? AND Admin = 0';
            
            db.query(query, [senhaCriptografada, id], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                
                if (result.affectedRows === 0) {
                    return res.status(403).json({ error: 'Operação não permitida ou Usuário não encontrado.' });
                }
                
                res.json({ message: 'Senha do montador atualizada com sucesso!' });
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao processar a criptografia da senha.' });
        }
    });

    // Atualizar Usuário
    router.put('/:id', verificarToken, apenasAdmin, (req, res) => {
        const { id } = req.params;
        const { Nome, Admin, Ativo } = req.body;
        const query = 'UPDATE Usuario SET Nome = ?, Admin = ?, Ativo = ? WHERE Id = ?';
        db.query(query, [Nome, Admin, Ativo, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Usuário atualizado com sucesso' });
        });
    });

    // ROTA NOVA: Listar usuários para a tela de login (PÚBLICA)
    // Traz TODOS os usuários ativos (Admin e Montadores), apenas os campos necessários
    router.get('/lista-login', (req, res) => {
        const query = 'SELECT Id, Nome FROM Usuario WHERE Ativo = 1 ORDER BY Nome ASC';
        
        db.query(query, (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });

    return router;
};