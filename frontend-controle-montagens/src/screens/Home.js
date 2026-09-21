import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function Home({ route, navigation }) {
    // Pega os dados do usuário enviados através da navegação
    const { usuario, token } = route.params || { usuario: { nome: 'Usuário', admin: false } };

    const handleLogout = async () => {
        // 🧹 Limpa os registros de login armazenados no celular
        await AsyncStorage.removeItem('@Nortfer:token');
        await AsyncStorage.removeItem('@Nortfer:usuario');
        
        // Volta para a tela de Login limpando o histórico
        navigation.replace('Login');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>Painel de Montagens</Text>
            <Text style={styles.subtitulo}>Bem-vindo, {usuario.nome}!</Text>
            <Text style={styles.perfil}>
                Tipo de Acesso: {usuario.admin ? '⭐ Administrador' : '🛠️ Montador'}
            </Text>

            {/* Menu Condicional: Só aparece se o usuário logado for ADMIN */}
            {usuario.admin && (
                <View style={styles.menuAdmin}>
                    <TouchableOpacity 
                        style={styles.botao}
                        onPress={() => navigation.navigate('AlterarSenhaUsuario', { token })}
                    >
                        <Text style={styles.botaoTexto}>⚙️ GERENCIAR SENHA DOS MONTADORES</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.botao}
                        onPress={() => navigation.navigate('CadastroMontagem', { token })}
                    >
                        <Text style={styles.botaoTexto}>➕ NOVA ORDEM DE MONTAGEM</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Menu Geral para todos os usuários */}
            <TouchableOpacity 
                style={[styles.botao, styles.botaoVisualizar]} 
                onPress={() => navigation.navigate('ListagemMontagens', { usuario, token })}
                >
                <Text style={styles.botaoTexto}>📋 VISUALIZAR MONTAGENS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoSair} onPress={handleLogout}>
                <Text style={styles.botaoSairTexto}>Sair da Conta</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 20,
        justifyContent: 'center',
    },
    titulo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#005483',
        textAlign: 'center',
        marginBottom: 5,
    },
    subtitulo: {
        fontSize: 18,
        color: '#333',
        textAlign: 'center',
        marginBottom: 5,
    },
    perfil: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
        fontWeight: '600',
    },
    menuAdmin: {
        width: '100%',
        marginBottom: 10,
    },
    botao: {
        width: '100%',
        height: 55,
        backgroundColor: '#005483',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    botaoVisualizar: {
        backgroundColor: '#4A5568', // Cor cinza escuro para diferenciar as ações
    },
    botaoTexto: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    botaoSair: {
        marginTop: 30,
        alignSelf: 'center',
    },
    botaoSairTexto: {
        color: '#E53E3E', // Vermelho para indicar saída
        fontSize: 16,
        fontWeight: 'bold',
    },
});