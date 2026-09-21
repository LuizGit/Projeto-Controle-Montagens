import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    TextInput, 
    TouchableOpacity, 
    Alert, 
    ScrollView, 
    ActivityIndicator 
} from 'react-native';
import api from '../services/api';

export default function AlterarSenhaUsuario({ route, navigation }) {
    const { token } = route.params;

    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
    const [novaSenha, setNovaSenha] = useState('');
    const [carregandoLista, setCarregandoLista] = useState(true);
    const [carregandoSalvar, setCarregandoSalvar] = useState(false);

    useEffect(() => {
        carregarMontadores();
    }, []);

    const carregarMontadores = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            // Puxa apenas os usuários não-admins do banco
            const resposta = await api.get('/usuarios', config);
            setUsuarios(resposta.data);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar a lista de montadores.');
        } finally {
            setCarregandoLista(false);
        }
    };

    const handleSalvarSenha = async () => {
        if (!usuarioSelecionado) {
            Alert.alert('Atenção', 'Selecione um montador na lista.');
            return;
        }

        if (!novaSenha || novaSenha.trim().length < 4) {
            Alert.alert('Atenção', 'A nova senha deve ter no mínimo 4 caracteres.');
            return;
        }

        setCarregandoSalvar(true);

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            await api.patch(`/usuarios/${usuarioSelecionado.Id}/senha`, {
                NovaSenha: novaSenha
            }, config);

            Alert.alert('Sucesso', `Senha de ${usuarioSelecionado.Nome} alterada com sucesso!`, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            const msg = error.response?.data?.error || 'Erro ao atualizar a senha no servidor.';
            Alert.alert('Erro', msg);
        } finally {
            setCarregandoSalvar(false);
        }
    };

    if (carregandoLista) {
        return (
            <View style={styles.centralizado}>
                <ActivityIndicator size="large" color="#005483" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.titulo}>Alterar Senha do Montador</Text>

            <Text style={styles.label}>1. Selecione o Funcionário:</Text>
            <View style={styles.listaContainer}>
                {usuarios.length === 0 ? (
                    <Text style={styles.textoVazio}>Nenhum montador cadastrado ou ativo.</Text>
                ) : (
                    usuarios.map((user) => (
                        <TouchableOpacity 
                            key={user.Id}
                            style={[styles.itemUsuario, usuarioSelecionado?.Id === user.Id && styles.itemAtivo]}
                            onPress={() => setUsuarioSelecionado(user)}
                        >
                            <Text style={[styles.textoUsuario, usuarioSelecionado?.Id === user.Id && styles.textoAtivo]}>
                                👷 {user.Nome}
                            </Text>
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {usuarioSelecionado && (
                <View style={styles.formulario}>
                    <Text style={styles.label}>2. Digite a Nova Senha para {usuarioSelecionado.Nome}:</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="Mínimo 4 caracteres"
                        placeholderTextColor="#999"
                        secureTextEntry
                        value={novaSenha}
                        onChangeText={setNovaSenha}
                        autoCapitalize="none"
                    />

                    <TouchableOpacity style={styles.botaoSalvar} onPress={handleSalvarSenha} disabled={carregandoSalvar}>
                        {carregandoSalvar ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.botaoTexto}>ATUALIZAR SENHA</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    content: { padding: 20, paddingTop: 40 },
    centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
    titulo: { fontSize: 22, fontWeight: 'bold', color: '#005483', marginBottom: 25, textAlign: 'center' },
    label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 10 },
    listaContainer: { width: '100%', marginBottom: 25 },
    itemUsuario: { width: '100%', padding: 14, backgroundColor: '#F7FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
    itemAtivo: { backgroundColor: '#005483', borderColor: '#005483' },
    textoUsuario: { fontSize: 15, color: '#4A5568', fontWeight: '500' },
    textoAtivo: { color: '#FFFFFF', fontWeight: 'bold' },
    textoVazio: { fontStyle: 'italic', color: '#A0AEC0', padding: 10 },
    formulario: { marginTop: 10, width: '100%' },
    input: { width: '100%', height: 50, backgroundColor: '#F7FAFC', borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#333' },
    botaoSalvar: { width: '100%', height: 55, backgroundColor: '#005483', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 2 },
    botaoTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }
});