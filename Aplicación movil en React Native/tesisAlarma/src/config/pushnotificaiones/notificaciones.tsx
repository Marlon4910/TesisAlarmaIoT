import PushNotification from 'react-native-push-notification';

class NotificationService {
  constructor(onNotification: (notification: any) => void) {
    PushNotification.configure({
      onNotification: onNotification,
      requestPermissions: true,
    });
  }

  // Mostrar notificación local
  showNotification(id: string, title: string, message: string): void {

    PushNotification.localNotification({
      channelId: 'default-channel-id', // El ID del canal configurado
      title: title,
      message: message,
      // id: id,
      // vibrate: true,
      // playSound: true,
      // soundName: 'default',
      // importance: 'high',
      // priority: 'high',
    });
  }

  cancelAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
  }
}

export default new NotificationService((notification: any) => {
  console.log('Notificación recibida:', notification);
});
