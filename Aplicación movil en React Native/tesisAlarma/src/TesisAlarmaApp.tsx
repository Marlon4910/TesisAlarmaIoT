import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StackNavigator } from './presentation/navigation/StackNavigator';
import { ApplicationProvider, IconRegistry, Layout, Text } from '@ui-kitten/components';
import * as eva from '@eva-design/eva';
import { useColorScheme } from 'react-native';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { useEffect } from 'react';
import PushNotification from 'react-native-push-notification';
import { requestNotificationPermission, handleForegroundNotifications } from './config/Firebase/FirebaseMessagingService';

export const TesisAlarmaApp = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? eva.dark : eva.light;
  const backgroundColor = (colorScheme === 'dark')
    ? theme['color-basic-800']
    : theme['color-basic-100'];

  // Crear canal de notificación para notificacion local --> se uso para el boton de panico
   useEffect(() => {
    PushNotification.createChannel(
      {
        channelId: "test-channel", // ID único del canal
        channelName: "Test Channel", // Nombre visible del canal
        channelDescription: "Canal para notificaciones de prueba", // Descripción del canal
        importance: 4, // Nivel de importancia, donde 4 es equivalente a HIGH
        vibrate: true,
      },
      (created) => console.log(`Canal creado: '${created}'`) // Confirma la creación en el log
    );
  }, []);

  
  useEffect(() => {  
    // Solicitar permisos para notificaciones
    requestNotificationPermission();

    // Configurar notificaciones en primer plano
    handleForegroundNotifications();
    PushNotification.createChannel(
      {
        channelId: 'default-channel-id', // Debe coincidir con el ID que usas en las notificaciones
        channelName: 'Default Channel', // Nombre del canal
        channelDescription: 'Un canal para notificaciones por defecto', // Descripción del canal
        soundName: 'default', // Nombre del sonido (opcional)
        importance: 4, // Nivel de importancia (1 a 5)
        vibrate: true, // Activar vibración
      },
      (created) => console.log(`Canal creado: ${created}`) // Verifica si se creó
    );

  }, []);
  
  return (
    <>
      <IconRegistry icons={EvaIconsPack} />
      <ApplicationProvider {...eva} theme={theme}>
        <NavigationContainer theme={{
          dark: colorScheme === 'dark',
          colors: {
            primary: theme['color-primary-500'],
            background: backgroundColor,
            card: theme['color-basic-100'],
            text: theme['text-basic-color'],
            border: theme['color-basic-800'],
            notification: theme['color-primary-500'],

          }

        }}>
          <StackNavigator />
        </NavigationContainer>
      </ApplicationProvider>
    </>
  )
}