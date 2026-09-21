const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o Banco do XAMPP
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'controle_montagens'
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err);
        return;
    }
    console.log('Banco de dados conectado com sucesso!');
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});