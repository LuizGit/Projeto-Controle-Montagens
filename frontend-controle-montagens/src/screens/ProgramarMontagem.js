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

export default function ProgramarMontagem({ route, navigation }) {
    const { montagem, token } = route.params;

    const [usuarios, setUsuarios] = useState([]);
    const [dataAgendada, setDataAgendada] = useState('');
    const [montador1, setMontador1] = useState('');
    const [montador2, setMontador2] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [buscandoEquipe, setBuscandoEquipe] = useState(true);

    useEffect(() => {
        carregarMontadores();
        
        // Se a montagem já tiver uma data de entrega/agendamento salva, preenche na tela
        if (montagem.Data_entrega) {
            const [ano, mes, dia] = montagem.Data_entrega.split('T')[0].split('-');
            setDataAgendada(`${dia}/${mes}/${ano}`);
        } else {
            // Caso contrário, sugere a data de hoje para facilitar
            const hoje = new Date();
            const dia = String(hoje.getDate()).padStart(2, '0');
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            const ano = hoje.getFullYear();
            setDataAgendada(`${dia}/${mes}/${ano}`);
        }
        
        if (montagem.Montador_1) setMontador1(String(montagem.Montador_1));
        if (montagem.Montador_2) setMontador2(String(montagem.Montador_2));
    }, []);

    const carregarMontadores = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const resposta = await api.get('/usuarios', config);
            setUsuarios(resposta.data);
        } catch (error) {
            console.error('Erro ao carregar montadores:', error);
        } finally {
            setBuscandoEquipe(false);
        }
    };

    const handleDataChange = (texto) => {
        const apenasNumeros = texto.replace(/\D/g, '');
        let dataFormatada = apenasNumeros;

        if (apenasNumeros.length > 2 && apenasNumeros.length <= 4) {
            dataFormatada = `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2)}`;
        } else if (apenasNumeros.length > 4) {
            dataFormatada = `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2, 4)}/${apenasNumeros.slice(4, 8)}`;
        }
        setDataAgendada(dataFormatada);
    };

    const handleSalvarProgramacao = async () => {
        if (!dataAgendada || dataAgendada.length !== 10) {
            Alert.alert('Atenção', 'Por favor, insira uma data de agendamento válida (DD/MM/AAAA).');
            return;
        }

        if (!montador1) {
            Alert.alert('Atenção', 'Você precisa selecionar pelo menos o Montador Responsável Principal.');
            return;
        }

        setCarregando(true);

        // Converte DD/MM/AAAA para o padrão MySQL (AAAA-MM-DD)
        const [dia, mes, ano] = dataAgendada.split('/');
        const dataFormatadaBanco = `${ano}-${mes}-${dia}`;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Enviamos uma atualização PUT para atualizar os campos de agendamento no banco
            await api.put(`/montagens/${montagem.Id}`, {
                Orcamento: montagem.Orcamento,
                Cliente: montagem.Cliente,
                Local: montagem.Local,
                Status_Id: 2, // ⚙️ Atualiza automaticamente para o status 2 (Agendado) ao programar!
                Data_entrega: dataFormatadaBanco, 
                Montador_1: parseInt(montador1),
                Montador_2: montador2 ? parseInt(montador2) : null
            }, config);

            Alert.alert('Sucesso', 'Montagem programada e agendada com sucesso!', [
                { text: 'OK', onPress: () => navigation.navigate('ListagemMontagens', { usuario: { admin: true }, token }) }
            ]);

        } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar a programação da montagem.');
        } finally {
            setCarregando(false);
        }
    };

    if (buscandoEquipe) {
        return (
            <View style={styles.centralizado}>
                <ActivityIndicator size="large" color="#005483" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.titulo}>Programar Montagem</Text>
            
            <View style={styles.infoCard}>
                <Text style={styles.infoCliente}>📋 Cliente: {montagem.Cliente}</Text>
                <Text style={styles.infoSub}>Orçamento: Nº {montagem.Orcamento}</Text>
                <Text style={styles.infoSub}>Local: {montagem.Local}</Text>
            </View>

            <Text style={styles.label}>Data Agendada para o Início *</Text>
            <TextInput 
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={10}
                value={dataAgendada}
                onChangeText={handleDataChange}
            />

            <Text style={styles.label}>Montador Responsável Principal *</Text>
            <View style={styles.seletorContainer}>
                {usuarios.map((m) => (
                    <TouchableOpacity 
                        key={`m1-${m.Id}`}
                        style={[styles.seletorItem, montador1 === String(m.Id) && styles.seletorAtivo]}
                        onPress={() => setMontador1(String(m.Id))}
                    >
                        <Text style={[styles.seletorTexto, montador1 === String(m.Id) && styles.seletorTextoAtivo]}>
                            👤 {m.Nome}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Montador Auxiliar (Opcional)</Text>
            <View style={styles.seletorContainer}>
                <TouchableOpacity 
                    style={[styles.seletorItem, !montador2 && styles.seletorAtivoNenhum]}
                    onPress={() => setMontador2('')}
                >
                    <Text style={[styles.seletorTexto, !montador2 && styles.seletorTextoAtivo]}>❌ Nenhum Auxiliar</Text>
                </TouchableOpacity>
                {usuarios.filter(u => String(u.Id) !== montador1).map((m) => (
                    <TouchableOpacity 
                        key={`m2-${m.Id}`}
                        style={[styles.seletorItem, montador2 === String(m.Id) && styles.seletorAtivo]}
                        onPress={() => setMontador2(String(m.Id))}
                    >
                        <Text style={[styles.seletorTexto, montador2 === String(m.Id) && styles.seletorTextoAtivo]}>
                            👤 {m.Nome}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.botaoSalvar} onPress={handleSalvarProgramacao} disabled={carregando}>
                {carregando ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.botaoTexto}>CONFIRMAR PROGRAMAÇÃO</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    content: { padding: 20, paddingTop: 40 },
    centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
    titulo: { fontSize: 22, fontWeight: 'bold', color: '#005483', marginBottom: 20, textAlign: 'center' },
    infoCard: { backgroundColor: '#F7FAFC', padding: 15, borderRadius: 8, marginBottom: 25, borderWidth: 1, borderColor: '#E2E8F0' },
    infoCliente: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 4 },
    infoSub: { fontSize: 13, color: '#4A5568', marginTop: 2 },
    label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8, marginTop: 10 },
    input: { width: '100%', height: 50, backgroundColor: '#F7FAFC', borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#333' },
    seletorContainer: { width: '100%', marginBottom: 20 },
    seletorItem: { width: '100%', padding: 14, backgroundColor: '#F7FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
    seletorAtivo: { backgroundColor: '#005483', borderColor: '#005483' },
    seletorAtivoNenhum: { backgroundColor: '#718096', borderColor: '#718096' },
    seletorTexto: { fontSize: 15, color: '#4A5568', fontWeight: '500' },
    seletorTextoAtivo: { color: '#FFFFFF', fontWeight: 'bold' },
    botaoSalvar: { width: '100%', height: 55, backgroundColor: '#38A169', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 20, elevation: 2 },
    botaoTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});