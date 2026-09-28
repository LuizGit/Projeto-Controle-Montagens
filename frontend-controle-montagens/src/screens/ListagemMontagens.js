import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Alert, TouchableOpacity, Modal } from 'react-native';
import api from '../services/api';
import * as FileSystem from 'expo-file-system/legacy'; // 🚀 Adicionado o '/legacy' no final!
import * as Sharing from 'expo-sharing';

export default function ListagemMontagens({ route, navigation }) {
    const { usuario, token } = route.params;

    // Dados originais que vêm do servidor
    const [todasMontagens, setTodasMontagens] = useState([]);
    const [dashboard, setDashboard] = useState({ Pendente: 0, Agendado: 0, EmAndamento: 0, Concluido: 0 });
    const [carregando, setCarregando] = useState(true);

    // Estados de Controle de Filtro e Paginação
    const [statusFiltrado, setStatusFiltrado] = useState(null); // Armazena o status selecionado no Dash
    const [limiteExibicao, setLimiteExibicao] = useState(6); // Começa mostrando 6 itens

    // Estados para o Modal de Opções
    const [modalVisivel, setModalVisivel] = useState(false);
    const [montagemSelecionada, setMontagemSelecionada] = useState(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        setCarregando(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const resposta = await api.get('/montagens', config);
            
            // Guardamos a lista completa vinda do MySQL
            setTodasMontagens(resposta.data.montagens || []);

            const dadosDash = Array.isArray(resposta.data.dashboard) 
            ? resposta.data.dashboard[0] 
            : resposta.data.dashboard;

            setDashboard(dadosDash || { Pendente: 0, Agendado: 0, EmAndamento: 0, Concluido: 0 });
        } catch (error) {
            console.log("=== 🚨 FALHA DE REQUISIÇÃO NO MOBILE ===");
            console.log("Status do Erro:", error.response?.status);
            console.log("Detalhes da API:", error.response?.data);
            Alert.alert('Erro', 'Não foi possível carregar as informações.');
        } finally {
            setCarregando(false);
        }
    };

    const handleAlterarStatus = async (novoStatusId) => {
        if (!montagemSelecionada) return;
        setModalVisivel(false);
        setCarregando(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await api.patch(`/montagens/${montagemSelecionada.Id}/status`, { Status_Id: novoStatusId }, config);
            await carregarDados(); // Recarrega tudo atualizado do banco
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível atualizar o status.');
            setCarregando(false);
        }
    };
    const handleAbrirProjetoPDF = async (caminhoPdf) => {
        if (!caminhoPdf) {
            Alert.alert('Aviso', 'Esta montagem não possui projeto em PDF anexado.');
            return;
        }

        const urlBase = api.defaults.baseURL; 
        const urlCompletaServer = `${urlBase}${caminhoPdf}`; 

        try {
            // 1. Define um caminho temporário e seguro no disco do celular do montador
            const localUri = `${FileSystem.documentDirectory}projeto_nortfer.pdf`;
            
            // 2. Transfere o arquivo PDF do servidor Node para a memória do celular
            const download = await FileSystem.downloadAsync(urlCompletaServer, localUri);
            
            // 3. Dispara a folha de compartilhamento/visualização nativa do celular (Android ou iOS)
            // Isso permite ao montador abrir o PDF em tela cheia, dar zoom ou até enviar no WhatsApp.
            await Sharing.shareAsync(download.uri);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível baixar ou visualizar o PDF do projeto.');
        }
    };

    // ⚡ LÓGICA DE FILTRAGEM: Filtra a lista completa com base no Dashboard
    const montagensFiltradas = todasMontagens.filter(item => {
        if (!statusFiltrado) return true; // Se nenhum filtro ativo, mostra todas
        return item.Status_Nome?.toLowerCase() === statusFiltrado.toLowerCase();
    });

    // ⚡ LÓGICA DE PAGINAÇÃO: Corta a lista filtrada para exibir apenas o limite atual (ex: 6)
    const montagensExibidas = montagensFiltradas.slice(0, limiteExibicao);

    // Função para alternar o filtro ao clicar nos cards do Dashboard
    const alternarFiltroStatus = (status) => {
        if (statusFiltrado === status) {
            setStatusFiltrado(null); // Se clicou no mesmo, limpa o filtro
        } else {
            setStatusFiltrado(status); // Define o novo filtro
        }
        setLimiteExibicao(6); // Reseta a paginação para as 6 primeiras do novo filtro
    };

    const abrirModalStatus = (item) => {
        setMontagemSelecionada(item);
        setModalVisivel(true);
    };

    const renderItem = ({ item }) => {
        // Função interna para formatar a data que vem do MySQL (AAAA-MM-DD) para (DD/MM/AAAA)
        const formatarData = (dataSql) => {
            if (!dataSql) return null;
            // Corta apenas a parte da data caso venha com o formato de data e hora do banco
            const dataLimpa = dataSql.split('T')[0];
            const [ano, mes, dia] = dataLimpa.split('-');
            return `${dia}/${mes}/${ano}`;
        };

        const dataInicioFormatada = formatarData(item.Data_entrega);

        return (
            <TouchableOpacity 
                style={styles.card} 
                onPress={() => abrirModalStatus(item)} 
                activeOpacity={usuario.admin ? 0.7 : 1}
                disabled={!usuario.admin}
            >
                <View style={styles.cardLinha}>
                    <Text style={styles.cardCliente}>{item.Cliente}</Text>
                    <Text style={styles.cardOrcamento}> {item.Orcamento}</Text>
                </View>
                <Text style={styles.cardTexto}>📍 Local: {item.Local || 'Não informado'}</Text>
                
                {/* 🛠️ EXIBIÇÃO DOS MONTADORES: Mostra o principal e o auxiliar (se houver) */}
                <Text style={styles.cardTexto}>
                🛠️ Equipe: {
                    !item.Nome_Montador_1 && !item.Nome_Montador_2 
                        ? 'Sem montador designado' 
                        : `${item.Nome_Montador_1 || 'Não informado'}${item.Nome_Montador_2 ? ` / ${item.Nome_Montador_2}` : ''}`
                    }
                </Text>

                {/* 📅 EXIBIÇÃO DA DATA DE INÍCIO: Condicional (Só renderiza se tiver uma data salva) */}
                {dataInicioFormatada && (
                    <Text style={[styles.cardTexto, { fontWeight: '600', color: '#005483' }]}>
                        📅 Início: {dataInicioFormatada}
                    </Text>
                )}
                
                {item.Projeto_Url && (
                    <TouchableOpacity 
                        style={{
                            backgroundColor: '#005483', // Azul metálico da marca Nortfer
                            paddingVertical: 10,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 12,
                            marginBottom: 4,
                            elevation: 1
                        }}
                        onPress={() => handleAbrirProjetoPDF(item.Projeto_Url)}
                    >
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 }}>
                            📋 VISUALIZAR PROJETO TÉCNICO (PDF)
                        </Text>
                    </TouchableOpacity>
                )}
                
                <View style={styles.cardFooter}>
                    <View style={[styles.badge, { backgroundColor: obterCorStatus(item.Status_Nome) }]}>
                        <Text style={styles.badgeTexto}>{item.Status_Nome ? item.Status_Nome.toUpperCase() : 'PENDENTE'}</Text>
                    </View>
                    {usuario.admin && <Text style={styles.CliqueTexto}>Clique para opções 🔄</Text>}
                </View>
            </TouchableOpacity>
        );
    };

    // Componente de Rodapé da Lista (Botão Ver Mais)
    const renderFooter = () => {
        // Só mostra o botão se o total de itens filtrados for maior do que o que está na tela
        if (montagensFiltradas.length > limiteExibicao) {
            return (
                <TouchableOpacity 
                    style={styles.botaoVerMais} 
                    onPress={() => setLimiteExibicao(prev => prev + 6)}
                >
                    <Text style={styles.botaoVerMaisTexto}>Ver Mais (+6)</Text>
                </TouchableOpacity>
            );
        }
        return <View style={{ height: 20 }} />;
    };

    const obterCorStatus = (status) => {
        if (status === 'Pendente') return '#E53E3E';
        if (status === 'Agendado') return '#3182CE';
        if (status === 'Em Andamento') return '#DD6B20';
        return '#38A169'; // Concluido
    };

    if (carregando) {
        return (
            <View style={styles.centralizado}>
                <ActivityIndicator size="large" color="#005483" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* 📊 DASHBOARD: Exibido para todos, mudando a largura dos cards para montadores de forma fluida */}
            <View style={styles.dashboardContainer}>
                <Text style={styles.dashboardTitulo}>
                    Resumo de Montagens {statusFiltrado ? `(Filtrado: ${statusFiltrado})` : '(Todos)'}
                </Text>
                <View style={styles.dashboardGrid}>
                    {/* CARD PENDENTE: Renderizado EXCLUSIVAMENTE se for administrador */}
                    {usuario.admin && (
                        <TouchableOpacity 
                            style={[styles.dashCard, { borderColor: '#E53E3E', width: '23%' }, statusFiltrado === 'Pendente' && styles.dashCardAtivo]} 
                            onPress={() => alternarFiltroStatus('Pendente')}
                        >
                            <Text style={styles.dashNumero}>{dashboard.Pendente}</Text>
                            <Text style={styles.dashRotulo}>Pendentes</Text>
                        </TouchableOpacity>
                    )}

                    {/* CARD AGENDADO */}
                    <TouchableOpacity 
                        style={[styles.dashCard, { borderColor: '#3182CE', width: usuario.admin ? '23%' : '31%' }, statusFiltrado === 'Agendado' && styles.dashCardAtivo]} 
                        onPress={() => alternarFiltroStatus('Agendado')}
                    >
                        <Text style={styles.dashNumero}>{dashboard.Agendado}</Text>
                        <Text style={styles.dashRotulo}>Agendados</Text>
                    </TouchableOpacity>

                    {/* CARD EM ANDAMENTO */}
                    <TouchableOpacity 
                        style={[styles.dashCard, { borderColor: '#DD6B20', width: usuario.admin ? '23%' : '31%' }, statusFiltrado === 'Em Andamento' && styles.dashCardAtivo]} 
                        onPress={() => alternarFiltroStatus('Em Andamento')}
                    >
                        <Text style={styles.dashNumero}>{dashboard.EmAndamento}</Text>
                        <Text style={styles.dashRotulo}>Em Curso</Text>
                    </TouchableOpacity>

                    {/* CARD CONCLUIDO */}
                    <TouchableOpacity 
                        style={[styles.dashCard, { borderColor: '#38A169', width: usuario.admin ? '23%' : '31%' }, statusFiltrado === 'Concluido' && styles.dashCardAtivo]} 
                        onPress={() => alternarFiltroStatus('Concluido')}
                    >
                        <Text style={styles.dashNumero}>{dashboard.Concluido}</Text>
                        <Text style={styles.dashRotulo}>Concluídos</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.listaCabecalhoLinha}>
                <Text style={styles.listaTitulo}>Ordens de Serviço</Text>
                {statusFiltrado && (
                    <TouchableOpacity onPress={() => setStatusFiltrado(null)}>
                        <Text style={styles.limparFiltroTexto}>❌ Limpar Filtro</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* LISTA DE MONTAGENS */}
            <FlatList
                data={montagensExibidas} // Exibe apenas a fatia calculada (ex: até 6 itens)
                keyExtractor={(item) => item.Id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listaEspacamento}
                ListFooterComponent={renderFooter} // Pluga o botão Ver Mais no final da rolagem
                ListEmptyComponent={<Text style={styles.listaVazia}>Nenhuma montagem neste status.</Text>}
            />

            {/* MODAL DE OPÇÕES DE ALTERAÇÃO */}
            <Modal animationType="slide" transparent={true} visible={modalVisivel} onRequestClose={() => setModalVisivel(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitulo}>Opções da Montagem</Text>
                        <Text style={styles.modalSubtitulo}>Cliente: {montagemSelecionada?.Cliente}</Text>

                        <TouchableOpacity 
                            style={[styles.modalBotaoOpcao, { backgroundColor: '#005483', marginBottom: 20 }]} 
                            onPress={() => {
                                setModalVisivel(false);
                                navigation.navigate('ProgramarMontagem', { montagem: montagemSelecionada, token });
                            }}
                        >
                            <Text style={styles.modalBotaoTexto}>Agendar Manutenção</Text>
                            <View style={{ borderBottomWidth: 1, borderColor: '#E2E8F0', marginBottom: 15 }} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalBotaoOpcao, { backgroundColor: '#DD6B20' }]} onPress={() => handleAlterarStatus(3)}>
                            <Text style={styles.modalBotaoTexto}>🔄 Em Andamento</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalBotaoOpcao, { backgroundColor: '#38A169' }]} onPress={() => handleAlterarStatus(4)}>
                            <Text style={styles.modalBotaoTexto}>✅ Concluido</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalBotaoFechar} onPress={() => setModalVisivel(false)}>
                            <Text style={styles.modalBotaoFecharTexto}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 15,
        paddingTop: 20
    },
    centralizado: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF'
    },
    dashboardContainer: {
        backgroundColor: '#F7FAFC',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    dashboardTitulo: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#005483',
        marginBottom: 12
    },
    dashboardGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    dashCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        borderTopWidth: 4,
        elevation: 1
    },
    dashCardAtivo: {
        backgroundColor: '#EDF2F7',
        borderWidth: 1,
        borderColor: '#4A5568'
    }, // Destaque visual para o card filtrado
    dashNumero: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3748'
    },
    dashRotulo: {
        fontSize: 9,
        color: '#718096',
        marginTop: 2,
        fontWeight: '600'
    },

    listaCabecalhoLinha:
    {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        marginTop: 5
    },
    listaTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3748'
    },
    limparFiltroTexto: {
        fontSize: 13,
        color: '#E53E3E',
        fontWeight: '600'
    },
    listaEspacamento: {
        paddingBottom: 10
    },
    listaVazia: {
        textAlign: 'center',
        color: '#A0AEC0',
         marginTop: 40,
         fontSize: 15,
         fontStyle: 'italic'
     },
     card: {
         backgroundColor: '#FFFFFF',
         borderRadius: 8,
         padding: 15,
         marginBottom: 12,
         borderWidth: 1,
         borderColor: '#E2E8F0',
         elevation: 1
     },
     cardLinha: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         alignItems: 'center',
         marginBottom: 8
     },
     cardCliente: {
         fontSize: 16,
         fontWeight: 'bold',
         color: '#2D3748'
     },
     cardOrcamento: {
         fontSize: 15,
         fontWeight: 'bold',
         color: '#005483'
     },
     cardTexto: {
         fontSize: 13,
         color: '#4A5568',
         marginBottom: 4
     },
     cardFooter: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         alignItems: 'center',
         marginTop: 6
     }, 
    
      	badge:
      	{
      		paddingHorizontal: 8,
      		paddingVertical: 4,
      		borderRadius: 4
      	},
      	badgeTexto:
      	{
      		color:
      		'#FFFFFF',
      		fontSize:
      		10,
      		fontWeight:
      		'bold'
      	},
      	CliqueTexto:
      	{
      		fontSize:
      		11,
      		color:
      		'#718096',
      		fontStyle:
      		'italic'
      	},
      	// Botão Ver Mais discreto e limpo
      	botaoVerMais: { width: '100%', height: 45, backgroundColor: '#EDF2F7', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 5, marginBottom: 20, borderWidth: 1, borderColor: '#CBD5E0' },botaoVerMaisTexto: { color: '#4A5568', fontSize: 14, fontWeight: 'bold' },modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, paddingBottom: 40, elevation: 5 },modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 5, textAlign: 'center' },modalSubtitulo: { fontSize: 14, color: '#4A5568', marginBottom: 15, textAlign: 'center', fontWeight: '500' },modalBotaoOpcao: { width: '100%', height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12, elevation: 1 },modalBotaoTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },modalBotaoFechar: { width: '100%', height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 5, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F7FAFC' },modalBotaoFecharTexto: { color: '#4A5568', fontSize: 15, fontWeight: '600' }
});