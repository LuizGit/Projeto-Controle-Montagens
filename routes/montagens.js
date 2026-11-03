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
                    m.prev_montagem, s.Descricao AS Status_Nome, u1.Nome AS Nome_Montador_1, u2.Nome AS Nome_Montador_2
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
    router.put('/:id', verificarToken, (req, res) => {
        const { id } = req.params;
        const { Orcamento, Cliente, Status_Id, Data_entrega, Montador_1, Montador_2, Local, prev_montagem } = req.body;
        
        // O multer manipula o req.file caso a requisição venha como multipart/form-data
        const novoProjetoUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // 🌟 CASO 1: Upload de arquivo isolado via Dashboard Web
        if (novoProjetoUrl && !Orcamento && !Cliente) {
            const queryApenasPdf = `UPDATE Montagem SET Projeto_Url = ? WHERE Id = ?`;
            db.query(queryApenasPdf, [novoProjetoUrl, id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                return res.json({ message: 'Projeto PDF vinculado com sucesso!' });
            });
        } 
        // 🌟 CASO 2: Atualização completa vinda da Web (Com arquivo)
        else if (novoProjetoUrl) {
            const queryCompleta = `UPDATE Montagem SET Orcamento = ?, Cliente = ?, Status_Id = ?, Data_entrega = ?, 
                                   Montador_1 = ?, Montador_2 = ?, Local = ?, Projeto_Url = ?, prev_montagem = ? WHERE Id = ?`;
            db.query(queryCompleta, [Orcamento, Cliente, Status_Id, Data_entrega, Montador_1, Montador_2, Local, novoProjetoUrl, prev_montagem || null, id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                return res.json({ message: 'Montagem e PDF atualizados com sucesso' });
            });
        } 
        // 🌟 CASO 3: Atualização padrão de texto (Muito usada pelo App Mobile)
        else {
            const queryPadrao = `UPDATE Montagem SET Orcamento = ?, Cliente = ?, Status_Id = ?, Data_entrega = ?, 
                                 Montador_1 = ?, Montador_2 = ?, Local = ?, prev_montagem = ? WHERE Id = ?`;
            db.query(queryPadrao, [Orcamento, Cliente, Status_Id, Data_entrega, Montador_1, Montador_2, Local, prev_montagem || null, id], (err) => {
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

    router.get('/relatorio/pdf', verificarToken, (req, res) => {
        const PDFDocument = require('pdfkit');
        const { dataInicio, dataFim } = req.query;

        if (!dataInicio || !dataFim) {
            return res.status(400).json({ error: "Por favor, informe a data de início e fim do período." });
        }

        // Busca montagens onde a Data_entrega OU a prev_montagem estejam no período, ignorando as concluídas
        const queryRelatorio = `
            SELECT m.Id, m.Orcamento, m.Cliente, m.Local, m.Data_entrada, m.Data_entrega, m.prev_montagem,
                   s.Descricao AS Status_Nome, u1.Nome AS Nome_Montador_1
            FROM Montagem m
            LEFT JOIN Status s ON m.Status_Id = s.Id
            LEFT JOIN Usuario u1 ON m.Montador_1 = u1.Id
            WHERE (m.Data_entrega BETWEEN ? AND ? OR m.prev_montagem BETWEEN ? AND ?)
              AND m.Status_Id <> 4
            ORDER BY COALESCE(m.prev_montagem, m.Data_entrega) ASC
        `;

        db.query(queryRelatorio, [dataInicio, dataFim, dataInicio, dataFim], (err, resultados) => {
            if (err) return res.status(500).json({ error: err.message });

            const doc = new PDFDocument({ size: 'A4', margin: 40 });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=Relatorio_montagens_Perto_do_vencimento.pdf');
            doc.pipe(res);

            // 🎨 DESIGN E IDENTIDADE DO RELATÓRIO
            doc.rect(0, 0, 600, 20).fill('#E53E3E'); 
            doc.moveDown(2);
            doc.fontSize(18).fillColor('#9B2C2C').text('RELATÓRIO DE MONTAGENS - PERTO DO VENCIMENTO', { bold: true });
            
            const perInicio = dataInicio.split('-').reverse().join('/');
            const perFim = dataFim.split('-').reverse().join('/');
            doc.fontSize(10).fillColor('#4B5563').text(`Período de Vencimento/Previsão Analisado: ${perInicio} até ${perFim}`);
            doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`);
            doc.moveDown(1);
            
            doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#D1D5DB').stroke();
            doc.moveDown(2);

            // 📊 TABELA DE DADOS
            doc.fontSize(12).fillColor('#1F2937').text('Ordens de Serviço Cronológicas no Período:', { bold: true });
            doc.moveDown(1);

            const yHeader = doc.y;
            doc.fontSize(10).fillColor('#1F2937');
            doc.text('Prazo / Venc.', 40, yHeader, { bold: true });
            doc.text('Orçamento', 135, yHeader, { bold: true });
            doc.text('Cliente', 200, yHeader, { bold: true });
            doc.text('Local', 320, yHeader, { bold: true });
            doc.text('Status', 480, yHeader, { bold: true });
            
            doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).strokeColor('#E5E7EB').stroke();
            doc.moveDown(0.8);

            if (resultados.length === 0) {
                doc.moveDown(2);
                doc.fontSize(11).fillColor('#718096').text('Nenhuma ordem de serviço pendente ou em andamento possui vencimento ou previsão neste período.', { align: 'center', italic: true });
            } else {
                resultados.forEach(item => {
                    if (doc.y > 750) {
                        doc.addPage();
                        const yNewHeader = doc.y;
                        doc.fontSize(10).fillColor('#1F2937');
                        doc.text('Prazo / Venc.', 40, yNewHeader, { bold: true });
                        doc.text('Orçamento', 135, yNewHeader, { bold: true });
                        doc.text('Cliente', 200, yNewHeader, { bold: true });
                        doc.text('Local', 320, yNewHeader, { bold: true });
                        doc.text('Status', 480, yNewHeader, { bold: true });
                        doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).strokeColor('#E5E7EB').stroke();
                        doc.moveDown(0.8);
                    }

                    const yRow = doc.y;
                    doc.fontSize(9).fillColor('#374151');
                    
                    // ⚙️ LÓGICA EXIGIDA: Se houver previsão de montagem, prioriza ela e adiciona a tag (Prev.)
                    let dataExibicao = 'N/A';
                    let usaPrevisao = false;

                    if (item.prev_montagem) {
                        dataExibicao = `(Prev.) ${new Date(item.prev_montagem).toLocaleDateString('pt-BR')}`;
                        usaPrevisao = true;
                    } else if (item.Data_entrega) {
                        dataExibicao = new Date(item.Data_entrega).toLocaleDateString('pt-BR');
                    }
                    
                    // Renderiza a linha com cores distintas para previsões (Azul) e prazos normais (Preto/Cinza)
                    doc.fillColor(usaPrevisao ? '#2B6CB0' : '#1F2937').text(dataExibicao, 40, yRow, { bold: usaPrevisao });
                    doc.fillColor('#374151').text(`#${item.Orcamento || 'N/A'}`, 135, yRow);
                    doc.text(item.Cliente ? item.Cliente.substring(0, 18) : 'N/A', 200, yRow);
                    doc.text(item.Local ? item.Local.substring(0, 25) : 'N/A', 320, yRow);
                    doc.text(item.Status_Nome ? item.Status_Nome.toUpperCase() : 'PENDENTE', 480, yRow, { color: '#E53E3E' });
                    doc.moveDown(0.8);
                });
            }

            doc.end();
        });
    });

    return router;
};