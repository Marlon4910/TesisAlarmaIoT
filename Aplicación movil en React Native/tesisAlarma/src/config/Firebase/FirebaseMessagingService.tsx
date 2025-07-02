// FirebaseMessagingService.ts
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import NotificationService from '../pushnotificaiones/notificaciones';
import { getAuthStatus } from '../../actions/authFirebase';

// Se solicita permisos para notificaciones
export async function requestNotificationPermission(): Promise<void> {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Permiso para notificaciones otorgado');
  } else {
    console.log('Permiso para notificaciones denegado');
  }
}

// Se maneja notificaciones en segundo plano
messaging().setBackgroundMessageHandler(
  async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    console.log('Mensaje recibido en segundo plano:', remoteMessage);
    const authStatus = await getAuthStatus();

    const { notification } = remoteMessage;
    if (notification && authStatus === 'authenticated') {
      NotificationService.showNotification(
        remoteMessage.messageId || '',
        notification.title || 'Notificación',
        notification.body || ''
      );
    }
  }
);

// Se maneja notificaciones en primer plano 
export function handleForegroundNotifications(): void {
  messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    
    // Mensaje recibido por Firebase Cloud Messaging
    console.log('Mensaje recibido en primer plano:', remoteMessage);

    const { notification, sentTime } = remoteMessage;

    // Marca de tiempo al momento de recibir la notificación en UTC 
    if (sentTime) {
      const fecha = new Date(sentTime);
      console.log('Marca de tiempo UTC:', fecha.toUTCString());
    }

    const authStatus = await getAuthStatus();
    if (notification && authStatus === 'authenticated') {
      NotificationService.showNotification(
        remoteMessage.messageId || '',
        notification.title || 'Notificación',
        notification.body || ''
      );
    }
  });
}
