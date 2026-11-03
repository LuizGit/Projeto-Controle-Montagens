const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 🗄️ 1. CONEXÃO COM O BANCO DA HOSTGATOR (Substitua pelos dados do seu cPanel)
const db = mysql.createConnection({
    host: 'localhost', // Permanece localhost porque o banco está no mesmo servidor
    user: 'luiza981_nf2026', // O usuário completo criado no assistente do cPanel
    password: 'SuaSenhaForteCriadaNoCpanel', // A senha que você definiu para o usuário
    database: 'luiza981_controle_montagens' // O nome completo do banco com o prefixo
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err);
        return;
    }
    console.log('Banco de dados conectado com sucesso na HostGator!');
});

// Importação e Configuração das Rotas
const statusRoutes = require('./routes/status');
const usuarioRoutes = require('./routes/usuarios');
const montagemRoutes = require('./routes/montagens');
const authRoutes = require('./routes/auth');

app.use('/status', statusRoutes(db));
app.use('/usuarios', usuarioRoutes(db));
app.use('/montagens', montagemRoutes(db));
app.use('/auth', authRoutes(db));

// 📁 SERVIR ARQUIVOS DE UPLOAD: Configurado de forma segura para produção
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🚀 2. PORTA DINÂMICA: Essencial para o cPanel gerenciar o processo do Node.js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em ambiente de produção na porta: ${PORT}`);
});