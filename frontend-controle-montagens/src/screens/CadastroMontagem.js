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

export default function CadastroMontagem({ route, navigation }) {
    const { token } = route.params || { token: '' };

    const [orcamento, setOrcamento] = useState('');
    const [cliente, setCliente] = useState('');
    const [local, setLocal] = useState('');
    const [dataEntrada, setDataEntrada] = useState('');
    const [carregando, setCarregando] = useState(false);

    // Preenche o campo automaticamente com a data de hoje
    useEffect(() => {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        setDataEntrada(`${dia}/${mes}/${ano}`);
    }, []);

    // Aplica a máscara de barras "/" na data automaticamente
    const handleDataChange = (texto) => {
        const apenasNumeros = texto.replace(/\D/g, '');
        let dataFormatada = apenasNumeros;

        if (apenasNumeros.length > 2 && apenasNumeros.length <= 4) {
            dataFormatada = `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2)}`;
        } else if (apenasNumeros.length > 4) {
            dataFormatada = `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2, 4)}/${apenasNumeros.slice(4, 8)}`;
        }
        setDataEntrada(dataFormatada);
    };

    const handleSalvar = async () => {
        if (!orcamento || !cliente || !local || !dataEntrada) {
            Alert.alert('Atenção', 'Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        if (dataEntrada.length !== 10) {
            Alert.alert('Data Inválida', 'Por favor, digite a data completa no formato DD/MM/AAAA.');
            return;
        }

        setCarregando(true);

        // Conversão do formato brasileiro (DD/MM/AAAA) para o MySQL (AAAA-MM-DD)
        const [dia, mes, ano] = dataEntrada.split('/');
        const dataParaO_Banco = `${ano}-${mes}-${dia}`;

        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            // Envia a requisição POST travando o Status_Id obrigatoriamente em 1 (Pendente)
            await api.post('/montagens', {
                Orcamento: parseInt(orcamento),
                Cliente: cliente,
                Status_Id: 1, // 🔒 TRAVADO EM 1 (PENDENTE) PARA SEGURANÇA DA REGRA DE NEGÓCIO
                Data_entrada: dataParaO_Banco,
                Data_entrega: null,
                Montador_1: 1, 
                Montador_2: null,
                Local: local
            }, config);

            Alert.alert('Sucesso', 'Ordem de montagem criada com sucesso!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || 'Não foi possível salvar no servidor.';
            Alert.alert('Erro ao Salvar', msg);
        } finally {
            setCarregando(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.titulo}>Nova Ordem de Montagem</Text>

            <Text style={styles.label}>Número do Orçamento *</Text>
            <TextInput 
                style={styles.input}
                placeholder="Ex: 4520"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={orcamento}
                onChangeText={setOrcamento}
            />

            <Text style={styles.label}>Nome do Cliente *</Text>
            <TextInput 
                style={styles.input}
                placeholder="Ex: Carlos Ribeiro"
                placeholderTextColor="#999"
                value={cliente}
                onChangeText={setCliente}
            />

            <Text style={styles.label}>Data de Entrada *</Text>
            <TextInput 
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={10}
                value={dataEntrada}
                onChangeText={handleDataChange}
            />

            <Text style={styles.label}>Local da Entrega/Montagem *</Text>
            <TextInput 
                style={styles.input}
                placeholder="Ex: Av. Higienópolis, 1500"
                placeholderTextColor="#999"
                value={local}
                onChangeText={setLocal}
            />

            {/* 🔒 NOTA: O bloco visual "Status Inicial" foi removido inteiramente daqui */}

            <TouchableOpacity style={styles.botaoSalvar} onPress={handleSalvar} disabled={carregando}>
                {carregando ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.botaoTexto}>SALVAR ORDEM</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    content: { padding: 20, paddingTop: 40 },
    titulo: { fontSize: 22, fontWeight: 'bold', color: '#005483', marginBottom: 25, textAlign: 'center', letterSpacing: 0.5 },
    label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
    input: { width: '100%', height: 50, backgroundColor: '#F7FAFC', borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16, color: '#333' },
    botaoSalvar: { width: '100%', height: 55, backgroundColor: '#005483', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
    botaoTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }
});