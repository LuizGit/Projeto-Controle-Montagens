import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import axios from 'axios';
import api from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registrarParaNotificacoesPush(tokenUsuarioAutenticado) {
  let token;

  // Alerta 1: Garante que a função foi chamada
  Alert.alert('Diagnóstico', '1. Função de notificação iniciada no celular.');

  if (!Device.isDevice) {
    Alert.alert('Aviso', 'Notificações push exigem um dispositivo físico real.');
    return;
  }

  try {
    // 2. Verifica permissões existenciais
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Erro de Permissão', 'O usuário recusou ou o sistema barrou as notificações.');
      return;
    }

    // Alerta 2: Passou das permissões nativas do Android
    Alert.alert('Diagnóstico', '2. Permissão concedida. Solicitando token ao servidor do Expo...');

    // 3. Captura do token usando o seu ID de projeto fixado
    const projectId = "fcaf0894-b650-4ae9-a517-36dfaf88132a";
    
    const tokenObj = await Notifications.getExpoPushTokenAsync({ projectId });
    token = tokenObj.data;

    // Alerta 3: Token gerado com sucesso
    Alert.alert('Diagnóstico', `3. Token gerado com sucesso:\n\n${token}`);

  } catch (error) {
    Alert.alert('Falha Nativa', `Erro ao gerar o token no celular: ${error.message}`);
    return;
  }

  // Configuração de canal para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 500, 750],
      lightColor: '#FF231F77',
    });
  }

  // 4. ENVIAR DEFINITIVO PARA A API DA NORTFER
  if (token && tokenUsuarioAutenticado) {
    try {
      Alert.alert('Diagnóstico', '4. Enviando token para a API da NORTFER...');

      // CORRIGIDO: Agora usa a instância local 'api' importada do seu api.js
      // que aponta oficialmente para https://nortferelevadores.com
      const respostaServidor = await api.post('/usuarios/salvar-token', 
        { token: token },
        { 
          headers: { 
            'Authorization': `Bearer ${tokenUsuarioAutenticado}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      Alert.alert('Sucesso Total!', `Servidor respondeu: ${respostaServidor.data?.message || 'OK'}`);
    } catch (error) {
      const msgErroServidor = error.response?.data?.error || error.message;
      Alert.alert('Erro no Envio HTTP', `O app gerou o token, mas a API da NORTFER recusou:\n\n${msgErroServidor}`);
    }
  } else {
    Alert.alert('Aviso Final', 'Token ou credenciais JWT do usuário estavam ausentes.');
  }

  return token;
}