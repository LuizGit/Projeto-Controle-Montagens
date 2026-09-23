import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // Voltando a importar o nosso serviço do Axios

export default function Login() {
    const navigate = useNavigate();
    
    const [usuarios, setUsuarios] = useState([]);
    const [nome, setNome] = useState('');
    const [senha, setSenha] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);

    useEffect(() => {
        buscarListaUsuarios();
    }, []);

    // 🚀 ATUALIZADO: Buscando a lista com Axios
    const buscarListaUsuarios = async () => {
        try {
            const resposta = await api.get('/usuarios/lista-login');
            setUsuarios(resposta.data || []);
        } catch (error) {
            console.error(error);
            alert('Não foi possível carregar a lista de usuários da NORTFER.');
        } finally {
            setCarregandoUsuarios(false);
        }
    };

    // 🚀 ATUALIZADO: Efetuando o POST com Axios
    const handleLogin = async (e) => {
        e.preventDefault();

        if (!nome || !senha) {
            alert('Por favor, selecione seu usuário e digite a senha.');
            return;
        }

        setCarregando(true);

        try {
            const resposta = await api.post('/auth/login', {
                Nome: nome,
                Senha: senha
            });

            const { token, usuario } = resposta.data;

            // Salva os dados no navegador
            localStorage.setItem('@Nortfer:token', token);
            localStorage.setItem('@Nortfer:usuario', JSON.stringify(usuario));

            // Redireciona para o painel principal
            navigate('/dashboard');

        } catch (error) {
            const mensagemErro = error.response?.data?.error || 'Não foi possível conectar ao servidor.';
            alert(`Erro no Login: ${mensagemErro}`);
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.cardLogin}>
                <h1 style={styles.titulo}>Controle de Montagens</h1>
                <h2 style={styles.subtitulo}>Painel Administrativo NORTFER</h2>

                <form onSubmit={handleLogin} style={styles.formulario}>
                    <div style={styles.grupoInput}>
                        <label style={styles.label}>Usuário</label>
                        {carregandoUsuarios ? (
                            <div style={styles.selectPlaceholder}>Carregando equipe...</div>
                        ) : (
                            <select 
                                value={nome} 
                                onChange={(e) => setNome(e.target.value)} 
                                style={styles.select}
                            >
                                <option value="">Selecione seu Usuário...</option>
                                {usuarios.map((user) => (
                                    <option key={user.Id} value={user.Nome}>
                                        {user.Nome}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div style={styles.grupoInput}>
                        <label style={styles.label}>Senha</label>
                        <input 
                            type="password" 
                            placeholder="Digite sua senha de acesso"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            style={styles.input}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={carregando || carregandoUsuarios} 
                        style={carregando ? styles.botaoDesabilitado : styles.botao}
                    >
                        {carregando ? 'AUTENTICANDO...' : 'ENTRAR NO PAINEL'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', margin: 0, padding: 0, boxSizing: 'border-box' },
    cardLogin: { width: '100%', maxWidth: '420px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', textAlign: 'center' },
    titulo: { fontSize: '24px', fontWeight: 'bold', color: '#005483', margin: '0 0 8px 0' },
    subtitulo: { fontSize: '14px', color: '#6B7280', fontWeight: 'normal', margin: '0 0 32px 0' },
    formulario: { display: 'flex', flexDirection: 'column', textAlign: 'left' },
    grupoInput: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
    input: { width: '100%', height: '46px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '0 12px', fontSize: '16px', color: '#1F2937', outline: 'none', boxSizing: 'border-box' },
    select: { width: '100%', height: '46px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '0 12px', fontSize: '16px', color: '#1F2937', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' },
    selectPlaceholder: { width: '100%', height: '46px', display: 'flex', alignItems: 'center', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '0 12px', fontSize: '14px', color: '#9CA3AF', boxSizing: 'border-box' },
    botao: { width: '100%', height: '48px', backgroundColor: '#005483', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', boxSizing: 'border-box' },
    botaoDesabilitado: { width: '100%', height: '48px', backgroundColor: '#9CA3AF', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'not-allowed', marginTop: '10px', boxSizing: 'border-box' }
};