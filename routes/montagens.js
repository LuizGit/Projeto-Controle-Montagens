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
    // 🛡️ CAPTURA EXATA: Utiliza a propriedade 'usuarioLogado' identificada no diagnóstico
    const dadosToken = req.usuarioLogado || {};
    
    // Captura as propriedades minúsculas geradas pelo seu jwt.sign
    const usuarioId = dadosToken.id; 
    const isAdmin = dadosToken.admin; 

    // Painel informativo limpo para o seu terminal
    console.log("=== SISTEMA NORTFER: LOGIN DETECTADO ===");
    console.log(`Usuário ID: ${usuarioId} | Nível: ${isAdmin === 1 || isAdmin === true ? "Administrador" : "Montador"}`);

    // Se por algum motivo de rede os dados não chegarem, evita que o servidor caia
    if (!usuarioId) {
        return res.status(401).json({ error: "Usuário não identificado na requisição. Entre em contato com o suporte." });
    }

    // Variáveis para construir os filtros do MySQL de forma dinâmica
    let filtroLista = '';
    let filtroDash = '';
    const paramsLista = [];
    const paramsDash = [];

    // REGRA DE PRIVACIDADE: Se NÃO for admin (0 ou false)
    if (isAdmin === 0 || isAdmin === false || !isAdmin) {
        // O montador só vê o que é dele e pula o status 1 (Pendente)
        filtroLista = ` WHERE (IFNULL(m.Montador_1, 0) = ? OR IFNULL(m.Montador_2, 0) = ?) AND m.Status_Id IN (2, 3, 4) `;
        paramsLista.push(usuarioId, usuarioId);

        filtroDash = ` WHERE (IFNULL(m.Montador_1, 0) = ? OR IFNULL(m.Montador_2, 0) = ?) AND m.Status_Id IN (2, 3, 4) `;
        paramsDash.push(usuarioId, usuarioId);
    }

    // Consulta 1: Busca todas as montagens para a lista (Preservando todos os Joins de Usuários e Status)
    const queryLista = `
        SELECT m.*, s.Descricao AS Status_Nome, u1.Nome AS Nome_Montador_1, u2.Nome AS Nome_Montador_2
        FROM Montagem m
        LEFT JOIN Status s ON m.Status_Id = s.Id
        LEFT JOIN Usuario u1 ON m.Montador_1 = u1.Id
        LEFT JOIN Usuario u2 ON m.Montador_2 = u2.Id
        ${filtroLista}
        ORDER BY m.Id DESC
    `;

    // Consulta 2: Calcula os dados numéricos do Dashboard
    const queryDash = `
        SELECT 
            COALESCE(SUM(CASE WHEN LOWER(s.Descricao) = 'pendente' THEN 1 ELSE 0 END), 0) as Pendente,
            COALESCE(SUM(CASE WHEN LOWER(s.Descricao) = 'agendado' THEN 1 ELSE 0 END), 0) as Agendado,
            COALESCE(SUM(CASE WHEN LOWER(s.Descricao) = 'em andamento' THEN 1 ELSE 0 END), 0) as EmAndamento,
            COALESCE(SUM(CASE WHEN LOWER(s.Descricao) = 'concluido' THEN 1 ELSE 0 END), 0) as Concluido
        FROM Montagem m
        LEFT JOIN Status s ON m.Status_Id = s.Id
        ${filtroDash}
    `;

    // Executa a primeira consulta (Lista)
    db.query(queryLista, paramsLista, (err, listaResultados) => {
        if (err) return res.status(500).json({ error: err.message });

        // Executa a segunda consulta (Dashboard)
        db.query(queryDash, paramsDash, (err, dashResultados) => {
            if (err) return res.status(500).json({ error: err.message });

            // Extrai o primeiro objeto retornado pelo MySQL
            const dash = (dashResultados && dashResultados[0]) || { Pendente: 0, Agendado: 0, EmAndamento: 0, Concluido: 0 };

            // Devolve os dados estruturados no exato formato que o seu Frontend espera ler
            res.json({
                dashboard: {
                    Pendente: Number(dash.Pendente || 0),
                    Agendado: Number(dash.Agendado || 0),
                    EmAndamento: Number(dash.EmAndamento || 0),
                    Concluido: Number(dash.Concluido || 0)
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