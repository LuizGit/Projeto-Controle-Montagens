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

    // Listar todos os Usuários
    router.get('/', verificarToken, apenasAdmin, (req, res) => {
        db.query('SELECT Id, Nome, Admin, Ativo FROM Usuario', (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
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

    return router;
};