import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    // Estados para guardar os dados carregados do Back-end
    const [dadosDashboard, setDadosDashboard] = useState({ Pendente: 0, Agendado: 0, EmAndamento: 0, Concluido: 0 });
    const [montagens, setMontagens] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [usuarioLogado, setUsuarioLogado] = useState(null);
    const [pesquisa, setPesquisa] = useState('');
    
    // Guarda o ID da montagem que receberá o upload no clique do botão
    const [idMontagemSelecionada, setIdMontagemSelecionada] = useState(null);
    const [enviandoPdf, setEnviandoPdf] = useState(false);

    useEffect(() => {
        // 🛡️ Trava de segurança para ler o usuário logado sem quebrar a tela
        try {
            const userRaw = localStorage.getItem('@Nortfer:usuario');
            if (userRaw) {
                const dadosProntos = JSON.parse(userRaw);
                setUsuarioLogado({
                    nome: dadosProntos.Nome || dadosProntos.nome || 'Administrador',
                    admin: dadosProntos.Admin || dadosProntos.admin || 0
                });
            }
        } catch (e) {
            console.error("Erro ao ler usuário do localStorage", e);
        }

        carregarInformacoes();
    }, []);

    const carregarInformacoes = async () => {
        try {
            setCarregando(true);
            const resposta = await api.get('/montagens');
            
            setDadosDashboard(resposta.data.dashboard || { Pendente: 0, Agendado: 0, EmAndamento: 0, Concluido: 0 });
            setMontagens(resposta.data.montagens || []);
        } catch (error) {
            console.error(error);
            alert('Não foi possível carregar os dados das montagens.');
        } finally {
            setCarregando(false);
        }
    };
    
    // Função disparada ao clicar no botão "Vincular PDF"
    const acionarInputArquivo = (id) => {
        setIdMontagemSelecionada(id);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Envia o PDF selecionado para a API utilizando multipart/form-data
    const handleUploadPdf = async (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo || !idMontagemSelecionada) return;

        // Validação simples para garantir que seja um arquivo PDF
        if (arquivo.type !== 'application/pdf' && !arquivo.name.endsWith('.pdf')) {
            alert('Por favor, selecione apenas arquivos no formato PDF.');
            return;
        }

        const formData = new FormData();
        formData.append('Projeto', arquivo);

        try {
            setEnviandoPdf(true);
            // Certifique-se de que sua rota PUT ou uma rota específica no back-end aceite este FormData
            await api.put(`/montagens/${idMontagemSelecionada}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('Projeto executivo vinculado com sucesso!');
            carregarInformacoes(); // Recarrega a tabela com o link atualizado
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar o arquivo PDF para o servidor.');
        } finally {
            setEnviandoPdf(false);
            setIdMontagemSelecionada(null);
            e.target.value = null; // Reseta o campo de input
        }
    };

    // Abre o PDF em uma nova aba do navegador usando a URL base da API
    const handleVisualizarPdf = (urlRelativa) => {
        const urlCompleta = `${api.defaults.baseURL || 'http://localhost:3000'}${urlRelativa}`;
        window.open(urlCompleta, '_blank');
    };

    const montagensFiltradas = montagens.filter(item => {
        const termo = pesquisa.toLowerCase();
        return (
            item.Cliente?.toLowerCase().includes(termo) ||
            item.Orcamento?.toString().includes(termo) ||
            item.Local?.toLowerCase().includes(termo) ||
            item.Status_Nome?.toLowerCase().includes(termo)
        );
    });

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const obterCorStatus = (status) => {
        if (status === 'Pendente') return '#E53E3E';
        if (status === 'Agendado') return '#3182CE';
        if (status === 'Em Andamento') return '#DD6B20';
        return '#38A169';
    };

    return (
        <div style={styles.layoutContainer}>
            <style>{`
                body, html, #root {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    overflow: hidden;
                }
            `}</style>
            
            {/* Input invisível para gerenciar o upload de PDF em segundo plano */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUploadPdf} 
                accept=".pdf" 
                style={{ display: 'none' }} 
            />

            {/* 🚪 MENU LATERAL ESQUERDO (SIDEBAR) */}
            <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <h2 style={styles.sidebarLogo}>NORTFER</h2>
                    <span style={styles.sidebarSublogo}>Controle de Montagens</span>
                </div>

                <div style={styles.usuarioPerfilContainer}>
                    <div style={styles.usuarioAvatar}>A</div>
                    <div style={styles.usuarioInfo}>
                        <p style={styles.usuarioNome}>{usuarioLogado?.nome || 'Administrador'}</p>
                        <span style={styles.usuarioCargo}>Painel Web</span>
                    </div>
                </div>

                <nav style={styles.menuNav}>
                    <button style={{ ...styles.menuBotao, ...styles.menuBotaoAtivo }}>
                        📊 Dashboard
                    </button>
                    <button style={styles.menuBotao} onClick={() => navigate('/cadastrar-montagem')}>
                        🏗️ Cadastrar Montagem
                    </button>
                    <button style={styles.menuBotao} onClick={() => alert('Navegar para Alterar Senhas')}>
                        🔒 Alterar Senhas
                    </button>
                </nav>

                <button style={styles.botaoSair} onClick={handleLogout}>
                    🚪 Sair do Sistema
                </button>
            </aside>

            {/* 📊 CONTEÚDO PRINCIPAL (DIREITA) */}
            <main style={styles.conteudoPrincipal}>
                <header style={styles.topoDashboard}>
                    <div>
                        <h1 style={styles.tituloPagina}>Visão Geral</h1>
                        <p style={styles.subtituloPagina}>Estado atual das ordens de serviço corporativas</p>
                    </div>
                    <button style={styles.botaoAtualizar} onClick={carregarInformacoes} disabled={carregando || enviandoPdf}>
                        {enviandoPdf ? 'Enviando PDF...' : carregando ? 'Carregando...' : '🔄 Atualizar'}
                    </button>
                </header>

                {/* CARDS INDICADORES (GRID SUPERIOR) */}
                <section style={styles.gridCards}>
                    <div style={{ ...styles.cardDash, borderLeft: '6px solid #E53E3E' }}>
                        <span style={styles.cardRotulo}>Pendentes</span>
                        <h2 style={styles.cardNumero}>{dadosDashboard.Pendente}</h2>
                    </div>
                    <div style={{ ...styles.cardDash, borderLeft: '6px solid #3182CE' }}>
                        <span style={styles.cardRotulo}>Agendados</span>
                        <h2 style={styles.cardNumero}>{dadosDashboard.Agendado}</h2>
                    </div>
                    <div style={{ ...styles.cardDash, borderLeft: '6px solid #DD6B20' }}>
                        <span style={styles.cardRotulo}>Em Curso</span>
                        <h2 style={styles.cardNumero}>{dadosDashboard.EmAndamento}</h2>
                    </div>
                    <div style={{ ...styles.cardDash, borderLeft: '6px solid #38A169' }}>
                        <span style={styles.cardRotulo}>Concluídos</span>
                        <h2 style={styles.cardNumero}>{dadosDashboard.Concluido}</h2>
                    </div>
                </section>

                {/* TABELA DE MONTAGENS (DESKTOP STYLE) */}
                <section style={styles.secaoTabela}>
                    <div style={styles.tabelaCabecalhoLinha}>
                        <h3 style={styles.tituloTabela}>Ordens de Serviço Recentes</h3>
                        <input 
                            type="text"
                            placeholder="🔍 Pesquisar por cliente, orçamento ou local..."
                            value={pesquisa}
                            onChange={(e) => setPesquisa(e.target.value)}
                            style={styles.inputPesquisa}
                        />
                    </div>
                    
                    <div style={styles.tabelaWrapper}>
                        <table style={styles.tabela}>
                            <thead>
                                <tr style={styles.tabelaHeaderRow}>
                                    <th style={styles.th}>Orçamento</th>
                                    <th style={styles.th}>Cliente</th>
                                    <th style={styles.th}>Local de Instalação</th>
                                    <th style={styles.th}>Responsável Principal</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>Projeto Executivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {montagensFiltradas.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={styles.tabelaVazia}>
                                            Nenhuma ordem de serviço corresponde à pesquisa.
                                        </td>
                                    </tr>
                                ) : (
                                    montagensFiltradas.map((item) => (
                                        <tr key={item.Id} style={styles.tabelaRow}>
                                            <td style={{ ...styles.td, fontWeight: 'bold', color: '#005483' }}>
                                                #{item.Orcamento}
                                            </td>
                                            <td style={styles.td}>{item.Cliente}</td>
                                            <td style={styles.td}>📍 {item.Local || 'Não informado'}</td>
                                            <td style={styles.td}>🛠️ {item.Nome_Montador_1 || 'Sem montador'}</td>
                                            <td style={styles.td}>
                                                <span style={{ 
                                                    color: obterCorStatus(item.Status_Nome),
                                                    fontWeight: 'bold',
                                                    fontSize: '13px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {item.Status_Nome ? item.Status_Nome : 'PENDENTE'}
                                                </span>
                                            </td>
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                {item.Projeto_Url ? (
                                                    <button 
                                                        onClick={() => handleVisualizarPdf(item.Projeto_Url)}
                                                        style={styles.botaoVisualizarPdf}
                                                    >
                                                        📄 Abrir Projeto
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => acionarInputArquivo(item.Id)}
                                                        style={styles.botaoUploadPdf}
                                                    >
                                                        ➕ Vincular PDF
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

const styles = {
    layoutContainer: { display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'sans-serif', overflow: 'hidden', margin: 0, padding: 0, boxSizing: 'border-box' },
    sidebar: { width: '260px', height: '100%', backgroundColor: '#002D47', color: '#FFFFFF', display: 'flex', flexDirection: 'column', padding: '24px 16px', boxSizing: 'border-box' },
    sidebarHeader: { textAlign: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' },
    sidebarLogo: { fontSize: '24px', fontWeight: 'bold', letterSpacing: '1.5px', color: '#FFFFFF', margin: 0 },
    sidebarSublogo: { fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' },
    usuarioPerfilContainer: { display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '25px' },
    usuarioAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#005483', display: 'flex', alignItems: 'center', justifycontent: 'center', fontWeight: 'bold', fontSize: '16px', marginRight: '10px' },
    usuarioInfo: { display: 'flex', flexDirection: 'column' },
    usuarioNome: { fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#FFFFFF' },
    usuarioCargo: { fontSize: '11px', color: '#9CA3AF' },
    menuNav: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
    menuBotao: { width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#D1D5DB', border: 'none', borderRadius: '6px', textAlign: 'left', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' },
    menuBotaoAtivo: { backgroundColor: '#005483', color: '#FFFFFF' },
    botaoSair: { width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', textAlign: 'left', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', marginTop: 'auto' },
    conteudoPrincipal: { flex: 1, height: '100%', padding: '32px', overflowY: 'auto', boxSizing: 'border-box' },
    topoDashboard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
    tituloPagina: { fontSize: '26px', fontWeight: 'bold', color: '#1F2937', margin: '0 0 4px 0' },
    subtituloPagina: { fontSize: '14px', color: '#6B7280', margin: 0 },
    botaoAtualizar: { padding: '10px 16px', backgroundColor: '#FFFFFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
    gridCards: { display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '32px' },
    cardDash: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', display: 'flex', flexDirection: 'column', justifycontent: 'center' },
    cardRotulo: { fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' },
    cardNumero: { fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: '8px 0 0 0' },
    secaoTabela: { backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    tituloTabela: { fontSize: '18px', fontWeight: 'bold', color: '#1F2937', margin: 0 },
    tabelaWrapper: { overflowX: 'auto' },
    tabela: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', textAlign: 'left', fontSize: '14px' },
    tabelaHeaderRow: { backgroundColor: 'transparent' },
    th: { padding: '0 16px 4px 16px', fontWeight: '600', color: '#4B5563', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    tabelaRow: { backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', transition: 'transform 0.2s' },
    td: { padding: '16px', color: '#374151', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' },
    tabelaVazia: { textAlign: 'center', padding: '30px', color: '#9CA3AF', fontStyle: 'italic' },
    tabelaCabecalhoLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' },
    inputPesquisa: { width: '320px', height: '38px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '0 12px', fontSize: '14px', color: '#1F2937', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' },
    botaoVisualizarPdf: {
        padding: '6px 12px',
        backgroundColor: '#EBF8FF',
        color: '#2B6CB0',
        border: '1px solid #BEE3F8',
        borderRadius: '4px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    botaoUploadPdf: {
        padding: '6px 12px',
        backgroundColor: '#F7FAFC',
        color: '#4A5568',
        border: '1px solid #CBD5E0',
        borderRadius: '4px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    }
};
