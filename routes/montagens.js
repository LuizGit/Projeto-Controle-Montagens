const express = require('express');
const router = express.Router();
// Importa as regras de segurança
const { verificarToken, apenasAdmin } = require('../middlewares/auth');

module.exports = (db) => {
    // Criar Nova Montagem
    router.post('/', verificarToken, apenasAdmin, (req, res) => {
        const { Orcamento, Cliente, Status_Id, Data_entrada, Data_entrega, Montador_1, Montador_2, Local } = req.body;
        const query = `INSERT INTO Montagem (Orcamento, Cliente, Status_Id, Data_entrada, Data_entrega, Montador_1, Montador_2, Local) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(query, [Orcamento, Cliente, Status_Id, Data_entrada, Data_entrega, Montador_1, Montador_2, Local], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: result.insertId, Cliente, Orcamento });
        });
    });

    // Listar Montagens (Trazendo os nomes do status e dos montadores com JOIN)
    router.get('/', verificarToken, (req, res) => {
        // Consulta 1: Busca todas as montagens para a lista
        const queryLista = `
            SELECT m.*, s.Descricao AS Status_Nome, u1.Nome AS Nome_Montador_1, u2.Nome AS Nome_Montador_2
            FROM Montagem m
            LEFT JOIN Status s ON m.Status_Id = s.Id
            LEFT JOIN Usuario u1 ON m.Montador_1 = u1.Id
            LEFT JOIN Usuario u2 ON m.Montador_2 = u2.Id
        `;

        // Consulta 2: Calcula o Dashboard (Acessível por essa rota de forma leve)
        const queryDash = `
            SELECT 
                COALESCE(SUM(CASE WHEN LOWER(s.Descricao) = 'pendente' THEN 1 ELSE 0 END), 0) as Pendente,
                COALESCE(SUM(CASE WHEN LOWER(s.Descricao) = 'agendado' THEN 1 ELSE 0 END), 0) as Agendado,
                COALESCE(SUM(CASE WHEN LOWER(s.Descricao) = 'em andamento' THEN 1 ELSE 0 END), 0) as EmAndamento,
                COALESCE(SUM(CASE WHEN LOWER(s.Descricao) = 'concluido' THEN 1 ELSE 0 END), 0) as Concluido
            FROM Montagem m
            LEFT JOIN Status s ON m.Status_Id = s.Id
        `;

        // Executa a primeira consulta (Lista)
        db.query(queryLista, (err, listaResultados) => {
            if (err) return res.status(500).json({ error: err.message });

            // Executa a segunda consulta (Dashboard)
            db.query(queryDash, (err, dashResultados) => {
                if (err) return res.status(500).json({ error: err.message });

                const dash = dashResultados[0] || { Pendente: 0, Agendado: 0, EmAndamento: 0, Concluido: 0 };

                // Devolve os dois dados juntos estruturados em um único envio!
                res.json({
                    dashboard: {
                        Pendente: Number(dash.Pendente),
                        Agendado: Number(dash.Agendado),
                        EmAndamento: Number(dash.EmAndamento),
                        Concluido: Number(dash.Concluido)
                    },
                    montagens: listaResultados
                });
            });
        });
    });

    // Atualizar Status ou Dados de uma Montagem
    router.put('/:id', verificarToken, apenasAdmin, (req, res) => {
        const { id } = req.params;
        const { Orcamento, Cliente, Status_Id, Data_entrega, Montador_1, Montador_2, Local } = req.body;
        const query = `UPDATE Montagem SET Orcamento = ?, Cliente = ?, Status_Id = ?, Data_entrega = ?, 
                       Montador_1 = ?, Montador_2 = ?, Local = ? WHERE Id = ?`;
        db.query(query, [Orcamento, Cliente, Status_Id, Data_entrega, Montador_1, Montador_2, Local, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Montagem atualizada com sucesso' });
        });
    });

    // 🔒 APENAS ADMIN: Alterar apenas o Status de uma Montagem
    // Adicionado "apenasAdmin" como segundo parâmetro de proteção
    router.patch('/:id/status', verificarToken, apenasAdmin, (req, res) => {
        const { id } = req.params;
        const { Status_Id } = req.body;

        if (!Status_Id) {
            return res.status(400).json({ error: 'O Status_Id é obrigatório.' });
        }

        const query = 'UPDATE Montagem SET Status_Id = ? WHERE Id = ?';
        db.query(query, [Status_Id, id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Montagem não encontrada.' });
            }

            res.json({ message: 'Status atualizado com sucesso!' });
        });
    });

    // Deletar Montagem
    router.delete('/:id', verificarToken, apenasAdmin, (req, res) => {
        const { id } = req.params;
        db.query('DELETE FROM Montagem WHERE Id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Montagem removida com sucesso' });
        });
    });

    return router;
};