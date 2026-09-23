import React, { useState, useEffect } from 'react';
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
import { Picker } from '@react-native-picker/picker'; // Instalar via npx expo install @react-native-picker/picker
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

import logoNortfer from '../assets/logo.png';

export default function Login({ navigation }) {
    const [usuarios, setUsuarios] = useState([]); // Lista vinda do banco de dados
    const [nome, setNome] = useState(''); // Armazena o nome selecionado
    const [senha, setSenha] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);

    // Carrega os usuários assim que a tela abre
    useEffect(() => {
        buscarListaUsuarios();
    }, []);

    const buscarListaUsuarios = async () => {
        try {
            // Chama a rota pública que criamos no backend
            const resposta = await api.get('/usuarios/lista-login');
            setUsuarios(resposta.data || []);
        } catch (error) {
            Alert.alert('Erro do Sistema', 'Não foi possível carregar a lista de usuários da NORTFER.');
        } finally {
            setCarregandoUsuarios(false);
        }
    };

    const handleLogin = async () => {
        if (!nome || nome === "" || !senha) {
            Alert.alert('Atenção', 'Por favor, selecione um usuário e digite a senha.');
            return;
        }

        setCarregando(true);

        try {
            const resposta = await api.post('/auth/login', {
                Nome: nome,
                Senha: senha
            });

            const { token, usuario } = resposta.data;

            await AsyncStorage.setItem('@Nortfer:token', token);
            await AsyncStorage.setItem('@Nortfer:usuario', JSON.stringify(usuario));

            navigation.replace('Home', { usuario, token });

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

            {/* Menu de Seleção de Usuários condicional */}
            {carregandoUsuarios ? (
                <View style={[styles.input, { justifyContent: 'center' }]}>
                    <ActivityIndicator size="small" color="#005483" />
                </View>
            ) : (
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={nome}
                        onValueChange={(itemValue) => setNome(itemValue)}
                        style={styles.picker}
                        dropdownIconColor="#005483"
                    >
                        <Picker.Item label="Selecione seu Usuário..." value="" color="#999" />
                        {usuarios.map((user) => (
                            <Picker.Item key={user.Id} label={user.Nome} value={user.Nome} color="#333" />
                        ))}
                    </Picker>
                </View>
            )}

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
            <TouchableOpacity style={styles.botao} onPress={handleLogin} disabled={carregando || carregandoUsuarios}>
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
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 120,       
        marginBottom: 30,  
    },
    logo: {
        width: 260,
        height: 90,
        backgroundColor: '#000', 
    },
    titulo: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#005483', 
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
    pickerContainer: {
        width: '100%',
        height: 50,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        justifyContent: 'center',
    },
    picker: {
        width: '100%',
        color: '#333',
    },
    botao: {
        width: '100%',
        height: 50,
        backgroundColor: '#005483', 
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        elevation: 2, 
        shadowColor: '#000', 
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