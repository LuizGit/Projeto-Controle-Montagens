import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Alert, TouchableOpacity, Modal } from 'react-native';
import api from '../services/api';

export default function ListagemMontagens({ route }) {
    // Pega o perfil do usuário logado enviado pela navegação
    const { usuario, token } = route.params;

    const [montagens, setMontagens] = useState([]);
    const [dashboard, setDashboard] = useState({ Pendente: 0, Agendado: 0, EmAndamento: 0, Concluido: 0 });
    const [carregando, setCarregando] = useState(true);
    const [modalVisivel, setModalVisivel] = useState(false);
    const [montagemSelecionada, setMontagemSelecionada] = useState(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        setCarregando(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            // Faz apenas UMA requisição que traz tudo junto de uma vez só!
            const resposta = await api.get('/montagens', config);
            
            // Separa os dados recebidos da API
            setMontagens(resposta.data.montagens);
            setDashboard(resposta.data.dashboard);

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar as informações do servidor.');
        } finally {
            setCarregando(false);
        }
    };

    // Função que envia o novo status para a API
    const handleAlterarStatus = async (novoStatusId) => {
        if (!montagemSelecionada) return;

        setModalVisivel(false);
        setCarregando(true);

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Envia a requisição PATCH para a nova rota da API
            await api.patch(`/montagens/${montagemSelecionada.Id}/status`, {
                Status_Id: novoStatusId
            }, config);

            // Recarrega a lista e o dashboard atualizados do banco automaticamente
            await carregarDados();

        } catch (error) {
            Alert.alert('Erro', 'Não foi possível atualizar o status.');
            setCarregando(false);
        }
    };

    const abrirModalStatus = (item) => {
        setMontagemSelecionada(item);
        setModalVisivel(true);
    };

    // Componente visual para cada Card de Montagem na lista
    const renderItem = ({ item }) => (
        // 🔒 Se usuario.admin for verdadeiro, o card é clicável. Caso contrário, desabilita o clique.
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
            <Text style={styles.cardTexto}>🛠️ Montador: {item.Nome_Montador_1 || 'Sem montador'}</Text>
            
            <View style={styles.cardFooter}>
                <View style={[styles.badge, { backgroundColor: obterCorStatus(item.Status_Nome) }]}>
                    <Text style={styles.badgeTexto}>{item.Status_Nome ? item.Status_Nome.toUpperCase() : 'PENDENTE'}</Text>
                </View>
                
                {/* 🔒 A mensagem indicando clique só aparece na tela do ADMINISTRADOR */}
                {usuario.admin && (
                    <Text style={styles.CliqueTexto}>Clique para alterar 🔄</Text>
                )}
            </View>
        </TouchableOpacity>
    );

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
            {/* 📊 DASHBOARD: Só renderiza na tela se o usuário for ADMIN */}
            {usuario.admin && (
                <View style={styles.dashboardContainer}>
                    <Text style={styles.dashboardTitulo}>Resumo de Montagens</Text>
                    <View style={styles.dashboardGrid}>
                        <View style={[styles.dashCard, { borderColor: '#E53E3E' }]}>
                            <Text style={styles.dashNumero}>{dashboard.Pendente}</Text>
                            <Text style={styles.dashRotulo}>Pendentes</Text>
                        </View>
                        <View style={[styles.dashCard, { borderColor: '#3182CE' }]}>
                            <Text style={styles.dashNumero}>{dashboard.Agendado}</Text>
                            <Text style={styles.dashRotulo}>Agendados</Text>
                        </View>
                        <View style={[styles.dashCard, { borderColor: '#DD6B20' }]}>
                            <Text style={styles.dashNumero}>{dashboard.EmAndamento}</Text>
                            <Text style={styles.dashRotulo}>Em Curso</Text>
                        </View>
                        <View style={[styles.dashCard, { borderColor: '#38A169' }]}>
                            <Text style={styles.dashNumero}>{dashboard.Concluido}</Text>
                            <Text style={styles.dashRotulo}>Concluídos</Text>
                        </View>
                    </View>
                </View>
            )}

            <Text style={styles.listaTitulo}>Ordens de Serviço</Text>

            {/* Lista Rolável de Montagens */}
            <FlatList
                data={montagens}
                keyExtractor={(item) => item.Id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listaEspacamento}
                ListEmptyComponent={<Text style={styles.listaVazia}>Nenhuma montagem encontrada.</Text>}
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisivel}
                onRequestClose={() => setModalVisivel(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitulo}>Alterar Status da Montagem</Text>
                        <Text style={styles.modalSubtitulo}>Cliente: {montagemSelecionada?.Cliente}</Text>

                        <TouchableOpacity style={[styles.modalBotaoOpcao, { backgroundColor: '#E53E3E' }]} onPress={() => handleAlterarStatus(1)}>
                            <Text style={styles.modalBotaoTexto}>PENDENTE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.modalBotaoOpcao, { backgroundColor: '#3182CE' }]} onPress={() => handleAlterarStatus(2)}>
                            <Text style={styles.modalBotaoTexto}>AGENDADO</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.modalBotaoOpcao, { backgroundColor: '#DD6B20' }]} onPress={() => handleAlterarStatus(3)}>
                            <Text style={styles.modalBotaoTexto}>EM ANDAMENTO</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.modalBotaoOpcao, { backgroundColor: '#38A169' }]} onPress={() => handleAlterarStatus(4)}>
                            <Text style={styles.modalBotaoTexto}>CONCLUÍDO</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalBotaoFechar} onPress={() => setModalVisivel(false)}>
                            <Text style={styles.modalBotaoFecharTexto}>Cancelar</Text>
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
        paddingTop: 20,
    },
    centralizado: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    dashboardContainer: {
        backgroundColor: '#F7FAFC',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    dashboardTitulo: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#005483',
        marginBottom: 12,
    },
    dashboardGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dashCard: {
        width: '23%',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        borderTopWidth: 4,
        elevation: 1,
    },
    dashNumero: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3748',
    },
    dashRotulo: {
        fontSize: 10,
        color: '#718096',
        marginTop: 2,
        fontWeight: '500',
    },
    listaTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: 10,
    },
    listaEspacamento: {
        paddingBottom: 20,
    },
    listaVazia: {
        textAlign: 'center',
        color: '#A0AEC0',
        marginTop: 40,
        fontSize: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 1,
    },
    cardLinha: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardCliente: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3748',
    },
    cardOrcamento: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#005483',
    },
    cardTexto: {
        fontSize: 13,
        color: '#4A5568',
        marginBottom: 4,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 6,
    },
    badgeTexto: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Escurece o fundo da lista por igual
        justifyContent: 'flex-end',            // Empurra o conteúdo do Modal para o fundo do celular
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,                // Mantém os cantos superiores arredondados
        borderTopRightRadius: 20,
        padding: 25,
        paddingBottom: 40,                      // Dá um espaço extra seguro em relação à barra de navegação do celular
        elevation: 5,                           // Sombra forte para destacar do fundo
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 }, // Sombra projetada para cima
        shadowOpacity: 0.25,
        shadowRadius: 4.65,
    },
    modalBotaoOpcao: {
        width: '100%',
        height: 48,                 // Dá uma altura ideal para o botão
        borderRadius: 8,            // Arredonda os cantos
        alignItems: 'center',       // Centraliza o texto na horizontal
        justifyContent: 'center',   // Centraliza o texto na vertical
        marginBottom: 12,           // Separa um botão do outro
        elevation: 2,               // Sombra leve no Android
        shadowColor: '#000',        // Sombra leve no iOS
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    modalBotaoTexto: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    modalBotaoFechar: {
        width: '100%',
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',     // Dá uma borda leve para o botão de cancelar
        backgroundColor: '#F7FAFC'  // Fundo cinza bem clarinho
    },
    modalBotaoFecharTexto: {
        color: '#4A5568',           // Cor de texto mais visível para o cancelar
        fontSize: 15,
        fontWeight: '600',
    },
});