import firebase_admin
from firebase_admin import credentials, messaging

# Ruta al archivo JSON de credenciales
SERVICE_ACCOUNT_FILE = ".json"

# Inicializa la aplicación Firebase Admin
try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
    firebase_admin.initialize_app(cred)
    print("Firebase Admin inicializado correctamente.")
except Exception as e:
    print(f"Error al inicializar Firebase Admin: {e}")
    exit()

# Función para enviar notificaciones
def enviar_notificacion(token_dispositivo, titulo, cuerpo):
    # Construir el mensaje
    message = messaging.Message(
        token=token_dispositivo,
        notification=messaging.Notification(
            title=titulo,
            body=cuerpo
        ),
        android=messaging.AndroidConfig(
            priority="high",
        )
    )

    try:
        # Enviar el mensaje
        response = messaging.send(message)
        print(f"Notificación enviada con éxito: {response}")
    except firebase_admin.exceptions.FirebaseError as e:
        print(f"Error al enviar la notificación: {e}")
        raise e  # Lanza la excepción para que el main la capture

# Ejemplo de uso
if __name__ == "__main__":
    token_dispositivo = "c3hwsglTRpGCVmIN_sMcsj:APA91bH7198NOWVdggrsJofHwFIDkyvkfaM0JwHPYCOvrqGGCnDnvknmP3JwcEfLxpky6EUtVA6EFhGkNs_2fBY3bsvYCfJU3PdXylgBYZ-_h43E0i7Ga9Y"
    enviar_notificacion(token_dispositivo, "¡Alarma activada!", "La alarma está en cuenta regresiva para desactivación.")
