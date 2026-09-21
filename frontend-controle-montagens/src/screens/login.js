import React, { useState } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    TextInput, 
    TouchableOpacity, 
    Image, 
    Alert, 
    ActivityIndicator 
} from 'react-native';
import api from '../services/api';

export default function Login({ navigation }) {
    const [nome, setNome] = useState('');
    const [senha, setSenha] = useState('');
    const [carregando, setCarregando] = useState(false);

    const handleLogin = async () => {
        if (!nome || !senha) {
            Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
            return;
        }

        setCarregando(true);

        try {
            const resposta = await api.post('/auth/login', {
                Nome: nome,
                Senha: senha
            });

            const { token, usuario } = resposta.data;

            navigation.replace('Home', { usuario, token });
            
            // TODO: Aqui salvaremos o token e navegaremos para a próxima tela nos próximos passos.

        } catch (error) {
            const mensagemErro = error.response?.data?.error || 'Não foi possível conectar ao servidor.';
            Alert.alert('Erro no Login', mensagemErro);
        } finally {
            setCarregando(false);
        }
    };

    return (
        <View style={styles.container}>
            
            <Text style={styles.titulo}>Controle de Montagens</Text>

            {/* Campo Usuário */}
            <TextInput 
                style={styles.input}
                placeholder="Usuário"
                placeholderTextColor="#999"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="none"
            />

            {/* Campo Senha */}
            <TextInput 
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#999"
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
                autoCapitalize="none"
            />

            {/* Botão Entrar */}
            <TouchableOpacity style={styles.botao} onPress={handleLogin} disabled={carregando}>
                {carregando ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.botaoTexto}>ENTRAR</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Fundo Branco solicitado
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    logo: {
        width: 280,
        height: 180,
        marginBottom: 20,
    },
    titulo: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#005483', // Azul baseado na identidade visual
        marginBottom: 30,
        letterSpacing: 1,
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        color: '#333',
    },
    botao: {
        width: '100%',
        height: 50,
        backgroundColor: '#005483', // Azul escuro metálico da marca
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        elevation: 2, // Sombra leve no Android
        shadowColor: '#000', // Sombra leve no iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    botaoTexto: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});