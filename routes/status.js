const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Criar Status
    router.post('/', (req, res) => {
        const { Descricao } = req.body;
        const query = 'INSERT INTO Status (Descricao) VALUES (?)';
        db.query(query, [Descricao], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: result.insertId, Descricao });
        });
    });

    // Listar todos os Status
    router.get('/', (req, res) => {
        db.query('SELECT * FROM Status', (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });

    return router;
};