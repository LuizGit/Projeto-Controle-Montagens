jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Relatorios() {
    const navigate = useNavigate();
    const [montagensAtrasadas, setMontagensAtrasadas] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [buscado, setBuscado] = useState(false);

    const carregarAtrasadas = async () => {
        try {
            setCarregando(true);
            const resposta = await api.get('/montagens/relatorio/atrasadas');
            setMontagensAtrasadas(resposta.data || []);
            setBuscado(true);
        } catch (error) {
            console.error(error);
            alert('Não foi possível gerar o relatório de montagens atrasadas.');
        } finally {
            setCarregando(false);
        }
    };

    // 🚀 NOVA FUNÇÃO: Dispara o gerenciador de impressão nativo do navegador
    const handleImprimir = async () => {
        try {
            const resposta = await api.get('/montagens/relatorio/atrasadas/pdf', { 
                responseType: 'blob' // Diz ao Axios para tratar o retorno como um arquivo baixável
            });
            
            const url = window.URL.createObjectURL(new Blob([resposta.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Relatorio_Montagens_Atrasadas_NORTFER.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Não foi possível gerar o arquivo PDF do relatório.');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div style={styles.layoutContainer}>
            {/* 🚀 INJEÇÃO DE CSS DE IMPRESSÃO: Esconde a sidebar e otimiza a tabela na folha A4 */}
            <style>{`
                @media print {
                    aside, button, header, .no-print {
                        display: none !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                    }
                    body {
                        background-color: #FFFFFF !important;
                        color: #000000 !important;
                    }
                    .secao-tabela {
                        box-shadow: none !important;
                        padding: 0 !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <h2 style={styles.sidebarLogo}>NORTFER</h2>
                    <span style={styles.sidebarSublogo}>Controle de Montagens</span>
                </div>

                <nav style={styles.menuNav}>
                    <button style={styles.menuBotao} onClick={() => navigate('/dashboard')}>
                        📊 Dashboard
                    </button>
                    <button style={styles.menuBotao} onClick={() => navigate('/cadastrar-montagem')}>
                        🏗️ Cadastrar Montagem
                    </button>
                    <button style={{ ...styles.menuBotao, ...styles.menuBotaoAtivo }}>
                        📋 Central de Relatórios
                    </button>
                </nav>

                <button style={styles.botaoSair} onClick={handleLogout}>
                    🚪 Sair do Sistema
                </button>
            </aside>

            <main style={styles.conteudoPrincipal}>
                <header style={styles.topoDashboard}>
                    <div>
                        <h1 style={styles.tituloPagina}>Central de Relatórios</h1>
                        <p style={styles.subtituloPagina}>Gerenciamento de auditorias e prazos corporativos</p>
                    </div>
                </header>

                <div style={styles.containerFiltroRelatorio} className="no-print">
                    <div style={styles.blocoTextoFiltro}>
                        <span style={styles.tituloFiltroRelatorio}>⚠️ Ordens de Serviço Pendentes em Atraso</span>
                        <p style={styles.subtituloFiltroRelatorio}>Varre o banco de dados em tempo real buscando montagens não iniciadas com prazo de entrega vencido</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={carregarAtrasadas} style={styles.botaoGerar} disabled={carregando}>
                            {carregando ? 'Buscando...' : '🔍 Gerar Relatório'}
                        </button>
                        
                        {/* 🚀 NOVO BOTÃO: Exibido apenas após gerar os dados na tela */}
                        {buscado && montagensAtrasadas.length > 0 && (
                            <button onClick={handleImprimir} style={styles.botaoImprimir}>
                                🖨️ Imprimir PDF
                            </button>
                        )}
                    </div>
                </div>

                {buscado && (
                    <section style={styles.secaoTabela} className="secao-tabela">
                        <h3 style={styles.tituloTabela}>Resultado do Filtro ({montagensAtrasadas.length})</h3>
                        <div style={styles.tabelaWrapper}>
                            <table style={styles.tabela}>
                                <thead>
                                    <tr style={styles.thRow}>
                                        <th style={styles.th}>Orçamento</th>
                                        <th style={styles.th}>Cliente</th>
                                        <th style={styles.th}>Local</th>
                                        <th style={styles.th}>Data Limite</th>
                                        <th style={styles.th}>Dias de Atraso</th>
                                        <th style={styles.th}>Montador</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {montagensAtrasadas.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={styles.tabelaVazia}>
                                                Nenhuma ordem de serviço pendente está atrasada no momento.
                                            </td>
                                        </tr>
                                    ) : (
                                        montagensAtrasadas.map((item) => (
                                            <tr key={item.Id} style={styles.tabelaRow}>
                                                <td style={styles.tdOrcamento}>#{item.Orcamento}</td>
                                                <td style={styles.td}>{item.Cliente}</td>
                                                <td style={styles.td}>📍 {item.Local || 'Não informado'}</td>
                                                <td style={styles.tdData}>
                                                    {new Date(item.Data_entrega).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td style={styles.tdAtraso}>⚠️ {item.Dias_Atrasados} dias</td>
                                                <td style={styles.td}>{item.Nome_Montador_1 || 'Não alocado'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

const styles = {
    layoutContainer: { display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'sans-serif', overflow: 'hidden' },
    sidebar: { width: '260px', height: '100%', backgroundColor: '#002D47', color: '#FFFFFF', display: 'flex', flexDirection: 'column', padding: '24px 16px', boxSizing: 'border-box' },
    sidebarHeader: { textAlign: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' },
    sidebarLogo: { fontSize: '24px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 },
    sidebarSublogo: { fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' },
    menuNav: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
    menuBotao: { width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#D1D5DB', border: 'none', borderRadius: '6px', textAlign: 'left', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    menuBotaoAtivo: { backgroundColor: '#005483', color: '#FFFFFF' },
    botaoSair: { width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', textAlign: 'left', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    conteudoPrincipal: { flex: 1, height: '100%', padding: '32px', overflowY: 'auto', boxSizing: 'border-box' },
    topoDashboard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
    tituloPagina: { fontSize: '26px', fontWeight: 'bold', color: '#1F2937', margin: 0 },
    subtituloPagina: { fontSize: '14px', color: '#6B7280', margin: 0 },
    containerFiltroRelatorio: { backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '6px solid #E53E3E' },
    blocoTextoFiltro: { display: 'flex', flexDirection: 'column', gap: '2px' },
    tituloFiltroRelatorio: { fontSize: '15px', fontWeight: 'bold', color: '#1F2937' },
    subtituloFiltroRelatorio: { fontSize: '13px', color: '#6B7280', margin: 0 },
    botaoGerar: { height: '40px', padding: '0 20px', backgroundColor: '#E53E3E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
    botaoImprimir: { height: '40px', padding: '0 20px', backgroundColor: '#005483', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
    secaoTabela: { backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    tituloTabela: { fontSize: '16px', fontWeight: 'bold', color: '#1F2937', marginBottom: '15px' },
    tabelaWrapper: { overflowX: 'auto' },
    tabela: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '14px' },
    thRow: { backgroundColor: 'transparent' },
    th: { padding: '8px 16px', fontWeight: '600', color: '#4B5563', fontSize: '12px', textTransform: 'uppercase', textAlign: 'left' },
    tabelaRow: { backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' },
    td: { padding: '14px 16px', color: '#374151', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' },
    tdOrcamento: { padding: '14px 16px', fontWeight: 'bold', color: '#005483', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' },
    tdData: { padding: '14px 16px', color: '#4A5568', fontWeight: '500', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' },
    tdAtraso: { padding: '14px 16px', color: '#E53E3E', fontWeight: 'bold', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' },
    tabelaVazia: { textAlign: 'center', padding: '30px', color: '#9CA3AF', fontStyle: 'italic' }
};