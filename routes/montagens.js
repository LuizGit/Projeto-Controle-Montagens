const express = require('express');
const router = express.Router();
// 🚀 MODIFICAÇÃO 1: Importa as duas bibliotecas de upload no topo do arquivo
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Importa as regras de segurança
const { verificarToken, apenasAdmin } = require('../middlewares/auth');

const pastaUploads = path.join(__dirname, '../uploads'); 
if (!fs.existsSync(pastaUploads)) {
    fs.mkdirSync(pastaUploads, { recursive: true });
}

// 🚀 MODIFICAÇÃO 2: Configuração de onde e como salvar o PDF no computador/servidor
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Salva na pasta 'uploads' da raiz do back-end
    },
    filename: (req, file, cb) => {
        // Renomeia o PDF com a data atual para que nenhum arquivo sobrescreva o outro
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = (db) => {
    
    // 🚀 MODIFICAÇÃO 3: Adicionado o 'upload.single('Projeto')' para capturar o arquivo vindo da Web
    // Criar Nova Montagem (Atualizada com a nova coluna Projeto_Url)
    router.post('/', verificarToken, apenasAdmin, upload.single('Projeto'), (req, res) => {
        // Na Web, usando multipart/form-data, os textos chegam em req.body
        const { Orcamento, Cliente, Status_Id, Data_entrada, Data_entrega, Montador_1, Montador_2, Local } = req.body;
        
        // Se o administrador anexou um arquivo, salva o caminho dele. Se não, deixa null.
        const projetoUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // Adicionada a coluna Projeto_Url no final do INSERT [9]
        const query = `INSERT INTO Montagem (Orcamento, Cliente, Status_Id, Data_entrada, Data_entrega, Montador_1, Montador_2, Local, Projeto_Url) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                       
        db.query(query, [Orcamento, Cliente, Status_Id, Data_entrada, Data_entrega, Montador_1, Montador_2, Local, projetoUrl], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: result.insertId, Cliente, Orcamento });
        });
    });

    // Listar Montagens (Trazendo os nomes do status e dos montadores com JOIN)
     router.get('/', verificarToken, (req, res) => {
        const dadosToken = req.usuarioLogado || {};
        const usuarioId = dadosToken.id; 
        const isAdmin = dadosToken.admin; 

        if (!usuarioId) {
            return res.status(401).json({ error: "Usuário não identificado na requisição." });
        }

        let filtroLista = '';
        let filtroDash = '';
        const paramsLista = [];
        const paramsDash = [];

        if (isAdmin === 0 || isAdmin === false || !isAdmin) {
            filtroLista = ` WHERE (IFNULL(m.Montador_1, 0) = ? OR IFNULL(m.Montador_2, 0) = ?) AND m.Status_Id IN (2, 3, 4) `;
            paramsLista.push(usuarioId, usuarioId);

            filtroDash = ` WHERE (IFNULL(m.Montador_1, 0) = ? OR IFNULL(m.Montador_2, 0) = ?) AND m.Status_Id IN (2, 3, 4) `;
            paramsDash.push(usuarioId, usuarioId);
        }

        const queryLista = `
                SELECT m.Id, m.Orcamento, m.Cliente, m.Local, m.Data_entrada, m.Data_entrega, m.Status_Id, m.Projeto_Url,
                    s.Descricao AS Status_Nome, u1.Nome AS Nome_Montador_1, u2.Nome AS Nome_Montador_2
                FROM Montagem m
                LEFT JOIN Status s ON m.Status_Id = s.Id
                LEFT JOIN Usuario u1 ON m.Montador_1 = u1.Id
                LEFT JOIN Usuario u2 ON m.Montador_2 = u2.Id
                ${filtroLista}
                ORDER BY m.Id DESC
            `;

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

        db.query(queryLista, paramsLista, (err, listaResultados) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(queryDash, paramsDash, (err, dashResultados) => {
                if (err) return res.status(500).json({ error: err.message });

                const dash = (dashResultados && dashResultados[0]) || { Pendente: 0, Agendado: 0, EmAndamento: 0, Concluido: 0 };
                
                // ⚙️ CALCULO DE PRAZO EM TEMPO REAL NO BACK-END
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                let totalAtrasados = 0;

                const montagensProcessadas = listaResultados.map(item => {
                    if (!item.Data_entrega) {
                        return { ...item, Dias_Restantes: null, Status_Prazo: 'Sem Prazo' };
                    }

                    // Se a montagem já foi concluída (Status_Id = 4), ela está regularizada
                    if (item.Status_Id === 4 || item.Status_Nome?.toLowerCase() === 'concluido') {
                        return { ...item, Dias_Restantes: 0, Status_Prazo: 'Finalizado' };
                    }

                    const dataLimite = new Date(item.Data_entrega);
                    dataLimite.setHours(0, 0, 0, 0);

                    const diferencaTempo = dataLimite.getTime() - hoje.getTime();
                    const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

                    let statusPrazo = '';
                    if (diferencaDias < 0) {
                        statusPrazo = 'Atrasado';
                        totalAtrasados++;
                    } else if (diferencaDias === 0) {
                        statusPrazo = 'Vence Hoje';
                    } else {
                        statusPrazo = 'No Prazo';
                    }

                    return {
                        ...item,
                        Dias_Restantes: Math.abs(diferencaDias),
                        Status_Prazo: statusPrazo
                    };
                });

                return res.json({
                    dashboard: {
                        Pendente: Number(dash.Pendente || 0),
                        Agendado: Number(dash.Agendado || 0),
                        EmAndamento: Number(dash.EmAndamento || 0),
                        Concluido: Number(dash.Concluido || 0),
                        Atrasado: totalAtrasados // Injeta o contador de atrasos no Dashboard global
                    },
                    montagens: montagensProcessadas
                });
            });
        });
    });
    
    // Atualizar Status ou Dados de uma Montagem
    router.put('/:id', verificarToken, apenasAdmin, upload.single('Projeto'), (req, res) => {
        const { id } = req.params;
        const { Orcamento, Cliente, Status_Id, Data_entrega, Montador_1, Montador_2, Local } = req.body;
        
        // Verifica se um arquivo PDF foi enviado no upload
        const novoProjetoUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // 🌟 CASO 1: O Frontend enviou APENAS o arquivo PDF (Upload direto pelo Dashboard)
        if (novoProjetoUrl && !Orcamento && !Cliente) {
            const queryApenasPdf = `UPDATE Montagem SET Projeto_Url = ? WHERE Id = ?`;
            
            db.query(queryApenasPdf, [novoProjetoUrl, id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                return res.json({ message: 'Projeto PDF vinculado com sucesso!' });
            });
        } 
        // 🌟 CASO 2: O Frontend enviou o formulário completo de edição + um novo arquivo PDF
        else if (novoProjetoUrl) {
            const queryComCompleta = `UPDATE Montagem SET Orcamento = ?, Cliente = ?, Status_Id = ?, Data_entrega = ?, 
                                      Montador_1 = ?, Montador_2 = ?, Local = ?, Projeto_Url = ? WHERE Id = ?`;
            
            db.query(queryComCompleta, [Orcamento, Cliente, Status_Id, Data_entrega, Montador_1, Montador_2, Local, novoProjetoUrl, id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                return res.json({ message: 'Montagem e PDF atualizados com sucesso' });
            });
        } 
        // 🌟 CASO 3: O Frontend enviou apenas o formulário de edição de texto (Sem alterar o PDF)
        else {
            const queryPadrao = `UPDATE Montagem SET Orcamento = ?, Cliente = ?, Status_Id = ?, Data_entrega = ?, 
                                 Montador_1 = ?, Montador_2 = ?, Local = ? WHERE Id = ?`;
            
            db.query(queryPadrao, [Orcamento, Cliente, Status_Id, Data_entrega, Montador_1, Montador_2, Local, id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                return res.json({ message: 'Montagem atualizada com sucesso' });
            });
        }
    });

    // 🔒 APENAS ADMIN: Alterar apenas o Status de uma Montagem
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