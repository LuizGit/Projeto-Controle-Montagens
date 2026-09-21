import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Login from './src/screens/login';
import Home from './src/screens/Home';
import ListagemMontagens from './src/screens/ListagemMontagens';
import CadastroMontagem from './src/screens/CadastroMontagem';
import ProgramarMontagem from './src/screens/ProgramarMontagem';
import AlterarSenhaUsuario from './src/screens/AlterarSenhaUsuario';

const Stack = createNativeStackNavigator();

export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [tokenSalvo, setTokenSalvo] = useState(null);

  useEffect(() => {
    checarSessao();
  }, []);

  const checarSessao = async () => {
    try {
      // Tenta buscar o token e o usuário guardados no celular
      const token = await AsyncStorage.getItem('@Nortfer:token');
      const usuarioTexto = await AsyncStorage.getItem('@Nortfer:usuario');

      if (token && usuarioTexto) {
        setTokenSalvo(token);
        setUsuarioLogado(JSON.parse(usuarioTexto)); // Transforma o texto de volta em objeto
      }
    } catch (error) {
      console.error('Erro ao ler AsyncStorage:', error);
    } finally {
      setCarregando(false);
    }
  };

  // Enquanto estiver lendo a memória do celular, mostra uma tela de carregamento neutra
  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#005483" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Stack.Navigator 
        // 🚀 Se achou dados salvos, inicia na Home. Caso contrário, inicia no Login.
        initialRouteName={usuarioLogado ? "Home" : "Login"}
        screenOptions={{ headerShown: false }}
      >
        {/* Caso o usuário já entre logado, passamos os parâmetros direto na rota inicial */}
        <Stack.Screen 
          name="Login" 
          component={Login} 
        />
        <Stack.Screen 
          name="Home" 
          component={Home} 
          initialParams={usuarioLogado ? { usuario: usuarioLogado, token: tokenSalvo } : undefined}
        />
        <Stack.Screen name="ListagemMontagens" component={ListagemMontagens} />
        <Stack.Screen name="CadastroMontagem" component={CadastroMontagem} />
        <Stack.Screen name="ProgramarMontagem" component={ProgramarMontagem} /> 
        <Stack.Screen name="AlterarSenhaUsuario" component={AlterarSenhaUsuario} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}