import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; 

export default function CadastroMontagem() {
    const navigate = useNavigate();

    // Estados do Formulário
    const [orcamento, setOrcamento] = useState('');
    const [cliente, setCliente] = useState('');
    const [local, setLocal] = useState('');
    const [dataEntrada, setDataEntrada] = useState('');
    const [prazoDias, setPrazoDias] = useState('7'); // Novo estado: Padrão de 7 dias de prazo
    const [carregando, setCarregando] = useState(false);
    const [arquivo, setArquivo] = useState(null);

    // Preenche o campo de data automaticamente com a data de hoje (AAAA-MM-DD)
    useEffect(() => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        
        setDataEntrada(`${ano}-${mes}-${dia}`); 
    }, []);

    const handleSalvar = async (e) => {
        e.preventDefault(); 

        if (!orcamento || !cliente || !local || !dataEntrada || !prazoDias) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setCarregando(true);

        try {
            // Calcula a Data_entrega com base na Data_entrada + Prazo em dias
            // Isso evita que você precise mexer na estrutura de colunas do MySQL agora!
            const dataBase = new Date(dataEntrada + 'T12:00:00'); // Evita problemas de fuso horário
            dataBase.setDate(dataBase.getDate() + parseInt(prazoDias, 10));
            
            const anoEntrega = dataBase.getFullYear();
            const mesEntrega = String(dataBase.getMonth() + 1).padStart(2, '0');
            const diaEntrega = String(dataBase.getDate()).padStart(2, '0');
            const dataEntregaCalculada = `${anoEntrega}-${mesEntrega}-${diaEntrega}`;

            const formData = new FormData();
            formData.append('Orcamento', orcamento);
            formData.append('Cliente', cliente);
            formData.append('Status_Id', 1);
            formData.append('Data_entrada', dataEntrada);
            formData.append('Data_entrega', dataEntregaCalculada); // Envia a data limite para o banco
            formData.append('Local', local);
            
            if (arquivo) {
                formData.append('Projeto', arquivo);
            }

            await api.post('/montagens', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('Ordem de montagem criada com sucesso!');
            navigate('/dashboard'); 

        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || 'Não foi possível salvar no servidor.';
            alert(`Erro ao Salvar: ${msg}`);
        } finally {
            setCarregando(false);
        }
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
            
            <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <h2 style={styles.sidebarLogo}>NORTFER</h2>
                    <span style={styles.sidebarSublogo}>Controle de Montagens</span>
                </div>
                <nav style={styles.menuNav}>
                    <button style={styles.menuBotao} onClick={() => navigate('/dashboard')}>
                        📊 Dashboard
                    </button>
                    <button style={{ ...styles.menuBotao, ...styles.menuBotaoAtivo }}>
                        🏗️ Cadastrar Montagem
                    </button>
                    <button style={styles.menuBotao} onClick={() => alert('Navegar para Alterar Senhas')}>
                        🔒 Alterar Senhas
                    </button>
                </nav>
            </aside>

            <main style={styles.conteudoPrincipal}>
                <header style={styles.topoPagina}>
                    <h1 style={styles.tituloPagina}>Nova Ordem de Montagem</h1>
                    <p style={styles.subtituloPagina}>Abra um novo registro no banco de dados corporativo</p>
                </header>

                <div style={styles.secaoFormulario}>
                    <form onSubmit={handleSalvar} style={styles.formulario}>
                        
                        <div style={styles.grupoInput}>
                            <label style={styles.label}>Número do Orçamento *</label>
                            <input 
                                type="number" 
                                placeholder="Ex: 4520"
                                value={orcamento}
                                onChange={(e) => setOrcamento(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>

                        <div style={styles.grupoInput}>
                            <label style={styles.label}>Nome do Cliente *</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Carlos Ribeiro"
                                value={cliente}
                                onChange={(e) => setCliente(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>

                        <div style={styles.duasColunas}>
                            <div style={styles.grupoInput}>
                                <label style={styles.label}>Data de Entrada *</label>
                                <input 
                                    type="date" 
                                    value={dataEntrada}
                                    onChange={(e) => setDataEntrada(e.target.value)}
                                    style={styles.input}
                                    required
                                />
                            </div>

                            {/* 🚀 NOVO CAMPO: Prazo de Entrega */}
                            <div style={styles.grupoInput}>
                                <label style={styles.label}>Prazo de Entrega (em dias) *</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    placeholder="Ex: 7"
                                    value={prazoDias}
                                    onChange={(e) => setPrazoDias(e.target.value)}
                                    style={styles.input}
                                    required
                                />
                            </div>
                        </div>

                        <div style={styles.grupoInput}>
                            <label style={styles.label}>Local da Entrega/Montagem *</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Av. Higienópolis, 1500"
                                value={local}
                                onChange={(e) => setLocal(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>

                        <div style={styles.grupoInput}>
                            <label style={styles.label}>Anexar Projeto Técnico (PDF)</label>
                            <input 
                                type="file" 
                                accept=".pdf"
                                onChange={(e) => setArquivo(e.target.files[0])} 
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.alertaRegra}>
                            ℹ️ Toda nova ordem será criada automaticamente com o status inicial de <strong>PENDENTE</strong>.
                        </div>

                        <div style={styles.containerAcoes}>
                            <button 
                                type="button" 
                                onClick={() => navigate('/dashboard')} 
                                style={styles.botaoCancelar}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={carregando} 
                                style={carregando ? styles.botaoDesabilitado : styles.botaoSalvar}
                            >
                                {carregando ? 'SALVANDO...' : 'SALVAR ORDEM'}
                            </button>
                        </div>

                    </form>
                </div>
            </main>
        </div>
    );
}

const styles = {
    layoutContainer: { display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'sans-serif', overflow: 'hidden', margin: 0, padding: 0, boxSizing: 'border-box' },
    sidebar: { width: '260px', height: '100%', backgroundColor: '#002D47', color: '#FFFFFF', display: 'flex', flexDirection: 'column', padding: '24px 16px', boxSizing: 'border-box' },
    sidebarHeader: { textAlign: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' },
    sidebarLogo: { fontSize: '24px', fontWeight: 'bold', letterSpacing: '1.5px', margin: 0 },
    sidebarSublogo: { fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' },
    menuNav: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
    menuBotao: { width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#D1D5DB', border: 'none', borderRadius: '6px', textAlign: 'left', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
    menuBotaoAtivo: { backgroundColor: '#005483', color: '#FFFFFF' },
    conteudoPrincipal: { flex: 1, height: '100%', padding: '32px', overflowY: 'auto', boxSizing: 'border-box' },
    topoPagina: { marginBottom: '28px' },
    tituloPagina: { fontSize: '26px', fontWeight: 'bold', color: '#1F2937', margin: '0 0 4px 0' },
    subtituloPagina: { fontSize: '14px', color: '#6B7280', margin: 0 },
    secaoFormulario: { backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '32px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', maxWidth: '700px' },
    formulario: { display: 'flex', flexDirection: 'column', gap: '20px' },
    grupoInput: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
    duasColunas: { display: 'flex', gap: '16px', width: '100%' },
    label: { fontSize: '14px', fontWeight: '600', color: '#374151' },
    input: { width: '100%', height: '46px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '0 12px', fontSize: '16px', color: '#1F2937', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' },
    alertaRegra: { backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '12px 16px', fontSize: '13px', color: '#1E40AF', marginTop: '5px' },
    containerAcoes: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' },
    botaoCancelar: { padding: '12px 24px', backgroundColor: '#FFFFFF', color: '#4B5563', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box' },
    botaoSalvar: { padding: '12px 24px', backgroundColor: '#005483', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box' },
    botaoDesabilitado: { padding: '12px 24px', backgroundColor: '#9CA3AF', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'not-allowed', boxSizing: 'border-box' }
};
