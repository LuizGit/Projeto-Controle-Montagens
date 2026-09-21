import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
// 🛠️ Alterado para importar o native-stack (livre do bug do hitSlop)
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import ListagemMontagens from './src/screens/ListagemMontagens';

import Login from './src/screens/login';
import Home from './src/screens/Home';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false // Esconde a barra de título padrão do topo
        }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="ListagemMontagens" component={ListagemMontagens} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}