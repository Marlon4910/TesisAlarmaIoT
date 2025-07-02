import json
import sys
import os
import subprocess
import socket
import time
import datetime
import threading
import RPi.GPIO as GPIO
import pyrebase
from paho.mqtt.client import Client
import notificaciones
import servidor_http
import modulo_rele

# Localización los archivos en memoria no volatil.
UID_FILE_PATH   = 'uid.txt'     # Path de identificacion del usuario
TOKEN_FILE_PATH = 'token.txt'   # Path para el token del usuario
IP_FILE_PATH    = 'ip.txt'      # Path para la ip del dispositivo

# Ruta del socket de LIRC
LIRC_SOCKET_PATH = "/var/run/lirc/lircd"

# Declaracion de variables globales
mensaje_anterior = None
token            = None
uid              = None
modo             = 0
estado_sirena    = 0

# Variable global para controlar el hilo de sensor infrarrojo
boton_thread_active = False
boton_thread = None

# Diccionarios para almacenar sensores agregados sensores
sensorsint = {}
sensorsext = {}

# Configuracion Firebase para libreria pyrebase
config = {
    "apiKey": "AIzaSyBxdkpiEqvpAjrOlaq0IS1XIi0wPIC7y1c",
    "authDomain": "alarma-xibernetiq.firebaseapp.com",
    "databaseURL": "https://alarma-xibernetiq-default-rtdb.firebaseio.com/",
    "storageBucket": "alarma-xibernetiq.appspot.com"
}

# Inicializacion de Firebase para libreria pyrebase
firebase_pyrebase = pyrebase.initialize_app(config)
db_pyrebase       = firebase_pyrebase.database()

def modo_alarma_cambio(message):
    """
    Función que actualiza el modo de alarma basado en el mensaje recibido desde Firebase.

    Args:
        message (dict): Diccionario que contiene la información del mensaje. Debe incluir la clave "data".

    Returns:
     None
    """
    global modo
    if   message["data"] == 0:
        modo = 0
        print(f'Modo configuración: {modo}')
    elif message["data"] == 1:
        modo = 1
        print(f'Modo exteriores: {modo}')
    elif message["data"] == 2:
        modo = 2
        print(f'Modo completo: {modo}')
    elif message["data"] == 10:
        modo = 10
        print(f'Modo Alerta y panico')
    elif message["data"] == 11:
        modo = 11
        print(f'Reinicio del sistema')

def leer_archivo(ruta_archivo):
    """
    Función que lee el contenido de un archivo y lo devuelve sin espacios en blanco al inicio o final.

    Args:
        ruta_archivo (str): Ruta del archivo a leer.

    Returns:
        str: El contenido del archivo.

    Raises:
        FileNotFoundError: Si el archivo no existe.
        Exception: Si ocurre un error al leer el archivo.
    """
    try:
        with open(ruta_archivo, 'r') as file:
            return file.read().strip()
    except FileNotFoundError:
        print(f"Error: El archivo {ruta_archivo} no fue encontrado.")
        return None
    except Exception as e:
        print(f"Error al leer el archivo {ruta_archivo}: {e}")
        return None

def obtener_uid():
    """
    Función que obtiene el UID desde un archivo .txt.

    Returns:
        str: El UID obtenido del archivo.
    """
    return leer_archivo(UID_FILE_PATH)

def obtener_token():
    """
    Función que obtiene el token desde un archivo .txt.

    Returns:
        str: El token obtenido del archivo.
    """
    return leer_archivo(TOKEN_FILE_PATH)

def obtener_ip_anterior():
    """
    Función que obtiene la IP anterior desde un archivo .txt.

    Returns:
        str: La IP obtenida del archivo.
    """
    return leer_archivo(IP_FILE_PATH)


def guardar_ip(ip):
    """
    Función que guarda una dirección IP en un archivo .txt.

    Args:
        ip (str): La dirección IP del dispositivo

    Returns:
        None: La función no devuelve ningún valor.
    """
    with open(IP_FILE_PATH,'w') as file:
        file.write(ip)


def obtener_ip_actual():
    """
    Función que obtiene la dirección IP actual del dispositivo ejecutando el comando `hostname -I`.

    Returns:
        str: La dirección IP local de la máquina. Si ocurre un error, devuelve `None`.

    Raises:
        Exception: Para cualquier otro error inesperado.
    """
    try:
        # Ejecuta el comando 'hostname -I' para obtener la IP local
        resultado = subprocess.check_output(['hostname', '-I'])

        # Decodifica la salida, elimina espacios y obtiene la primera IP
        ip_local = resultado.decode('utf-8').strip().split()[0]

        return ip_local
    except Exception as e:
        print(f"Error inesperado al obtener la IP local: {e}")
    return None

def leer_token_firebase():
    """
    Función que obtiene el token del dispositivo al cual se enviara la notificacion mediante FMC y lo guarda en un archivo .txt

    La función realiza lo siguiente:
    1. Obtiene el token FCM desde la base de datos de Firebase en la ruta `/{uid}/Configuracion/tokenFCM`.
    2. Guarda el token en un archivo especificado por la constante `TOKEN_FILE_PATH`.

    Returns:
        None: La función no devuelve ningún valor.

    Raises:
        Exception: Si ocurre un error al obtener el token desde Firebase o al escribir en el archivo.
    """
    try:
        # Obtener el token FCM desde Firebase
        token_data = db_pyrebase.child(f'/{uid}/Configuracion/tokenFCM').get()

        # Verificar si se obtuvo un resultado válido
        if token_data is None or token_data.val() is None:
            raise ValueError("No se pudo obtener el token FCM desde Firebase.")

        # Extraer el valor del token
        token_value = token_data.val()

        # Guardar el token en un archivo
        with open(TOKEN_FILE_PATH, 'w') as file:
            file.write(str(token_value))  # Convertir el valor a cadena y escribirlo en el archivo

        print("Token FCM guardado correctamente.")
    except Exception as e:
        print(f"Error al leer o guardar el token FCM: {e}")
        raise  # Relanzar la excepción para que el llamador pueda manejarla


def on_message_monitoreo(client, userdata, msg):
    """
    Función Callback que procesa los mensajes de los temas suscritos por MQTT en el modo 1, 2

    Args:
        msg (paho.mqtt.client.MQTTMessage): El mensaje recibido. Contiene los siguientes atributos:
            - topic (str):     El tema (topic) en el que se publicó el mensaje.
            - payload (bytes): La carga útil del mensaje, en formato binario.
            - qos (int):       El nivel de calidad de servicio (QoS) del mensaje (0, 1 o 2).
            - retain (bool):   Indica si el mensaje está marcado como retenido.
            - mid (int):       El ID del mensaje (message ID).

    La función realiza lo siguiente:
    1. Decodifica y carga los mensajes en formato JSON
    2. Separa los mensajes en sensor_id, estado
    3. Verifica la ubicacion del sensor y el topic
    4. Extrae el topic
    5. Usando el estado 1, 0, offline, ejecuta la funcion actualizar el sensor

    Returns:
        None: La función no devuelve ningún valor.

    Raises:
        json.JSONDecodeError: Si el mensaje no es JSON valido
        Exception: Si ocurre un error al obtener el token desde Firebase o al escribir en el archivo.
    """
    try:
        # Decodifica y carga el mensaje JSON
        message = msg.payload.decode('utf-8')
        sensor_data = json.loads(message)

        sensor_id = sensor_data.get("sensor_id")
        estado = sensor_data.get("estado")

        # Formatear el sensor_id del sensor
        sensor_formateado = f"sensor{sensor_id}"

        if sensor_formateado in sensorsint:
            ubicacion = 'interior'
            topic = sensorsint[sensor_formateado]
        elif sensor_formateado in sensorsext:
            ubicacion = 'exterior'
            topic = sensorsext[sensor_formateado]
        else:
            ubicacion = 'desconocido'
            topic = None

        # Extraer el tipo de sensor si se encontró un topic
        if topic:
            tipo_sensor = topic.split('/')[-1]
        else:
            tipo_sensor = 'desconocido'

        # Acciones en función del estado recibido
        if estado == 1:
            print(f"Sensor {sensor_id} en {ubicacion} detectó actividad.")
            actualizar_estado_sensor(sensor_id, ubicacion, estado,tipo_sensor)

        elif estado == 0:
            print(f'El sensor {sensor_id} no se a activado {estado} en {ubicacion}');

        elif estado == 'offline':
            print(f"Sensor {sensor_id} está 'offline'. Actualizando estado...")
            actualizar_estado_sensor(sensor_id, ubicacion, estado,tipo_sensor)
            
        elif estado == 'online':
            print(f"Sensor {sensor_id} está 'online'. Actualizando estado...")
            actualizar_estado_sensor(sensor_id, ubicacion, estado,tipo_sensor)
            

    except json.JSONDecodeError:
        print("Error: el mensaje recibido no es un JSON válido.")
    except Exception as e:
        print(f"Error al procesar el mensaje de monitoreo: {e}")

##!--------------Modificacion que se debe realizar-------------------------
def on_message_monitoreo_activo(client, userdata, msg):
    """
    Función Callback que procesa los mensajes de los temas suscritos por MQTT en el modo 10 que es cuando se activo un sensor

    Args:
        msg (paho.mqtt.client.MQTTMessage): El mensaje recibido. Contiene los siguientes atributos:
            - topic (str):     El tema (topic) en el que se publicó el mensaje.
            - payload (bytes): La carga útil del mensaje, en formato binario.
            - qos (int):       El nivel de calidad de servicio (QoS) del mensaje (0, 1 o 2).
            - retain (bool):   Indica si el mensaje está marcado como retenido.
            - mid (int):       El ID del mensaje (message ID).

    La función realiza lo siguiente:
    1. Decodifica y carga los mensajes en formato JSON
    2. Separa los mensajes en sensor_id, estado
    3. Verifica la ubicacion del sensor y el topic
    4. Extrae el topic
    5. Usando el estado 1, 0, offline, ejecuta almacenar sensor

    Returns:
        None: La función no devuelve ningún valor.

    Raises:
        json.JSONDecodeError: Si el mensaje no es JSON valido
        Exception: Si ocurre un error al obtener el token desde Firebase o al escribir en el archivo.
    """
    try:
        # Decodifica y carga el mensaje JSON
        message = msg.payload.decode('utf-8')
        sensor_data = json.loads(message)

        sensor_id = sensor_data.get("sensor_id")
        estado = sensor_data.get("estado")

        # Formatear el identificador del sensor
        sensor_formateado = f"sensor{sensor_id}"

        if sensor_formateado in sensorsint:
            ubicacion = 'interior'
            topic = sensorsint[sensor_formateado]
        elif sensor_formateado in sensorsext:
            ubicacion = 'exterior'
            topic = sensorsext[sensor_formateado]
        else:
            ubicacion = 'desconocido'
            topic = None

        # Extraer el tipo de sensor si se encontró un topic
        if topic:
            tipo_sensor = topic.split('/')[-1]
        else:
            tipo_sensor = 'desconocido'

        # Acciones en función del estado recibido
        if estado == 1:
            print(f"Sensor {sensor_id} en {ubicacion} detectó actividad.")
            mensaje = f'El sensor {sensor_id} de {tipo_sensor}, ubicado en el {ubicacion}/Se ha activado'
            almacenar_historial(mensaje)
        elif estado == 0:
            print(f'No se ha activado el sensor{sensor_id}');
        elif estado == 'offline':
            print(f"Sensor {sensor_id} está 'offline'. Actualizando estado...")
            mensaje = f'El sensor{sensor_id} de {tipo_sensor}, ubicado en el {ubicacion}/Se ha desconectado'
            almacenar_historial(mensaje)

    except json.JSONDecodeError:
        print("Error: el mensaje recibido no es un JSON válido.")
    except Exception as e:
        print(f"Error al procesar el mensaje de monitoreo: {e}")

def on_message_configuracion(client, userdata, msg):
    """
    Función Callback de MQTT para procesar mensajes de configuración.

    Esta función se ejecuta cuando se recibe un mensaje en el tema suscrito. Procesa el mensaje, extrae los datos de configuración (ubicación, sensor_id y topic)

    La función realiza lo siguiente:
    1. Guarda la configuración en un archivo de shell según la ubicación.
    2. Almacena la configuración en Firebase.

    Args:
        msg (paho.mqtt.client.MQTTMessage): El mensaje recibido. Contiene los siguientes atributos:
            - topic (str): El tema en el que se publicó el mensaje.
            - payload (bytes): La carga útil del mensaje, en formato binario.
            - qos (int): El nivel de calidad de servicio (QoS) del mensaje.
            - retain (bool): Indica si el mensaje está marcado como retenido.

    Returns:
        None: La función no devuelve ningún valor.

    Raises:
        json.JSONDecodeError: Si el mensaje no es un JSON válido.
        KeyError: Si el mensaje no contiene las claves esperadas ('ubicacion', 'sensor_id', 'topic').
        Exception: Si ocurre un error inesperado al procesar el mensaje o al realizar las acciones.
    """
    try:
        # Decodificar el payload (carga útil) del mensaje
        message = msg.payload.decode('utf-8')

        # Convertir el mensaje JSON en un diccionario de Python
        sensor_data = json.loads(message)

        # Extraer los datos de configuración
        ubicacion = sensor_data['ubicacion']
        sensor_id = sensor_data['sensor_id']
        sensor_topic = sensor_data['topic']

        # Guardar en archivo de shell según la ubicación
        guardar_en_archivo_shell( sensor_topic, ubicacion)

        # Guardar en Firebase
        almacenar_en_firebase(sensor_id, sensor_topic, ubicacion)

    except json.JSONDecodeError:
        print("Error: el mensaje recibido no es un JSON válido.")
    except KeyError as e:
        print(f"Error: el mensaje no contiene la clave esperada: {e}")
    except Exception as e:
        print(f"Error al procesar el mensaje de configuración: {e}")

def conectar_al_broker(broker_ip):
    """
    Función que conecta al cliente MQTT al broker especificado y maneja posibles errores de conexión.

    Esta función intenta establecer una conexión con un broker MQTT en la dirección IP y puerto especificados.
    Si la conexión es exitosa, devuelve el cliente MQTT. Si ocurre un error, se imprime un mensaje de error y la función devuelve `None`.

    Args:
        broker_ip (str): La dirección IP o nombre del host del broker MQTT al que se desea conectar.

    Returns:
        paho.mqtt.client.Client: El cliente MQTT conectado al broker. Si la conexión falla, devuelve `None`.

    Raises:
        socket.gaierror: Si ocurre un error de resolución DNS (por ejemplo, si `broker_ip` no es válido).
        Exception: Si ocurre cualquier otro error durante la conexión.
    """
    client = Client()

    try:
        print(f"Conectando al broker MQTT en {broker_ip}...")
        client.connect(broker_ip, 1883, 60)
        print("Conexión establecida con el broker MQTT.")
    except socket.gaierror as e:
        print(f"Error de resolución DNS: {e}")
        return None
    except Exception as e:
        print(f"Error al conectar con el broker MQTT: {e}")
        return None
    return client


def cargar_sensores_desde_shell(archivo):
    """
    Función que carga los sensores desde un archivo de shell y los almacena en un diccionario.

    Esta función lee un archivo de shell y extrae los temas (topics) de los sensores. Luego, los almacena
    en un diccionario específico (`sensorsint` o `sensorsext`) según el nombre del archivo.

    Args:
        archivo (str): La ruta del archivo de shell que contiene la configuración de los sensores.

    Returns:
        None: La función no devuelve ningún valor.

    Raises:
        FileNotFoundError: Si el archivo especificado no existe.
        Exception: Si ocurre cualquier otro error durante la lectura del archivo o el procesamiento.
    """
    # Determina el diccionario según el nombre del archivo
    diccionario = sensorsint if "sensorsint" in archivo else sensorsext

    try:
        with open(archivo, 'r') as file:
            for line in file:
                if line.startswith("topic="):
                    topic = line.split('=')[1].strip()

                    # Extrae el número de sensor desde el topic
                    sensor_id = topic.split('/')[1]
                    if sensor_id not in diccionario:
                        diccionario[sensor_id] = topic  # Agrega el topic al diccionario correspondiente

        print(f"Sensores cargados desde {archivo} correctamente.")

    except FileNotFoundError:
        print(f"El archivo {archivo} no fue encontrado.")
    except Exception as e:
        print(f"Error al cargar los sensores desde el archivo {archivo}: {e}")


def guardar_en_archivo_shell(sensor_topic, ubicacion):
    """
    Función que almacena el topic de los sensores mediante su ubicación en archivo shell

    Args:
        sensor_topic (str): El tema mediante el cual sensore se va conectar al broker MQTT
        ubicacion (str): La ubicación donde se colocara el sensor exterior o interior

    Returns:
        None: La función no devuelve ningún valor.

    Raise:
        Exception: Si ocurre cualquier otro error durante la lectura del archivo o el procesamiento.
    """

    archivo = 'sensorsext.sh' if ubicacion == "exterior" else 'sensorsint.sh'

    try:
        with open(archivo, 'a') as file:
            file.write(f'topic={sensor_topic}\n')
        print(f"Configuración del sensor guardada en {archivo}")
    except Exception as e:
        print(f"Error al guardar el archivo {archivo}: {e}")

#Firebase
def almacenar_en_firebase(sensor_id, sensor_topic, sensor_ubicacion):
    """
    Función que almacena los sensores en firebase y actualiza el sensor numero del sensor

    Args:
        sensor_id (str): El numero de sensor a almacenar
        sensor_topic (str): El topic del sensor a almacenar
        sensor_ubicacion (str): La ubicación del sensor a almacenar

    Raise:
        Exception: Si ocurre cualquier un error durante la ejecución

    """
    try:
        ruta = f'{uid}/Sensores/{sensor_ubicacion.capitalize()}/sensor{sensor_id}' #Ruta de para la almacenar los sensores
        ruta_Nsensor = f'{uid}/Configuracion/Nsensores' # Ruta de numero de sensor siguiente
        #Guarda los topics para lista de sensores
        db_pyrebase.child(ruta).update({"topic": sensor_topic})
        db_pyrebase.child(ruta).update({"estado": 'online'})
        #Guarda el numero del sensor para que la aplicacion pueda agregar nuevos sensores en orden
        db_pyrebase.child(ruta_Nsensor).set(int(sensor_id)+1)
        print(f"Sensor {sensor_id} almacenado en Firebase con topic {sensor_topic}.")
    except Exception as e:
        print(f"Error al almacenar el sensor en Firebase: {e}")


def actualizar_estado_sensor(sensor_id, sensor_ubicacion, estado, tipo_sensor):
    """
    Función que actualiza el estado de los sensores en firebase.

    La función realiza lo siguiente:
        1. Almacena en el historial en Firebase.
        2. Envia la notificacion a la aplicación movil.
        3. Cambia el modo de alarma al modo: 10

    Args:
        sensor_id (str): El numero del sensor
        sensor_ubicacion (str): La ubicación del sensor
        estado (str): El estado del sensor
        tipo_sensor (str): El tipo de sensor

    Raise:
        Exception: Si ocurre cualquier un error durante la ejecución
    """
    try:
        alerta_ruta = f'{uid}/Alerta'
        ruta_modo   = f'/{uid}/Configuracion/modo'
        ruta_estado = f'{uid}/Sensores/{sensor_ubicacion.capitalize()}/sensor{sensor_id}/estado'
        token       = obtener_token()
        if estado == 1:
            mensaje = f'El sensor {sensor_id} de {tipo_sensor}, ubicado en el {sensor_ubicacion}/Se ha activado'
            almacenar_historial(mensaje)
            db_pyrebase.child(alerta_ruta).set(mensaje)
            print(f"Estado del sensor {sensor_id} actualizado en Firebase a: {estado}")
            db_pyrebase.child(ruta_modo).set(10)
            enviar_notifiacion(token)
        elif estado == 'offline':
            mensaje = f'El sensor{sensor_id} de {tipo_sensor}, ubicado en el {sensor_ubicacion}/Se ha desconectado'
            almacenar_historial(mensaje)
            db_pyrebase.child(alerta_ruta).set(mensaje)
            db_pyrebase.child(ruta_estado).set(estado)
            print(f"Estado del sensor {sensor_id} actualizado en Firebase a: {estado}")
            enviar_notifiacion(token,"Sensor desconectado",f"El sensor {sensor_id} de {tipo_sensor},ubicado en el {sensor_ubicacion} esta en estado offline")
        elif estado == 'online':
            db_pyrebase.child(ruta_estado).set(estado)
            print(f"Estado del sensor {sensor_id} actualizado en Firebase a: {estado}")

    except Exception as e:
        print(f"Error al actualizar el estado del sensor {sensor_id} en Firebase: {e}")

def almacenar_historial(mensaje):
    """
    Función que almacena el mensaje recibido en el historial de Firebase


    La función realiza lo siguiente:
        1. Compara el mensaje recibido con el anterior para evitar repetir el mismo mensaje
        2. Obtiene la fecha y hora actual.
        3. Coloca almacena en firebase.
        4. Actualiza el ultimo mensaje.

    Args:
        mensaje (str): Mensaje de alerta o desconexión de un sensor

    """
    global mensaje_anterior

    # Comparar con el último mensaje
    if mensaje != mensaje_anterior:
        # Obtener la fecha y hora actual
        now = datetime.datetime.now()
        iso_date = now.date().isoformat()
        current_time = now.time().isoformat(timespec='seconds')

        # Ruta en la base de datos
        ruta = f'{uid}/Historial/{iso_date}/{current_time}'

        # Guardar en la base de datos
        db_pyrebase.child(ruta).set(mensaje)
        print('Mensaje de historial enviado')

        # Actualizar el último mensaje
        mensaje_anterior = mensaje
    else:
        print('No se actualiza el historial porque el mensaje es repetido')

# TODO: Mensaje tiene que colocarse None cuando se ha quitado

def enviar_notifiacion(tokenn,tema="¡Alarma activada!",mensaje="La alarma ha sido activada, por favor ingresa a la aplicación para desactivarla"):
    """
    Función que envia la notifcacíon a la aplicacion movil

    Args:
        tokken (str): token del dispositivo para envio de mensaje por FCM
        tema (str): Tema que saldra en la notificación
        mensaje (str): Mensaje que se mostrara al ampliar notificación en el dispositivo movil

      Raise:
        Exception: Si ocurre cualquier un error durante la ejecución, actualiza el token del dispositivo y vuelve a enviar notificación
    """
    try:
        notificaciones.enviar_notificacion(tokenn,tema,mensaje)
    except Exception as e:
        print(f"Error al activar la sirena: {e}")
        if "Invalid token" in str(e) or "registration-token-not-registered" in str(e) or "Requested entity was not found" in str(e):
            print("Token inválido. Obteniendo un nuevo token...")
            leer_token_firebase()
            global token
            token = obtener_token()
            print(f"Nuevo token obtenido: {token}")
            notificaciones.enviar_notificacion(token, tema, mensaje)


def reiniciar_programa():
    """
    Función que reinicia el programa actual.

    Esta función detiene la ejecución del programa actual y lo reinicia utilizando `os.execv`.

    Nota:
        - `os.execv` reemplaza el proceso actual con un nuevo proceso.
    """
    print("Reiniciando el programa...")
    os.execv(sys.executable, ['python'] + sys.argv)

def reinicio_dispositivo():
    """
    Función que borra todos los datos del usuario
    """
    #Borrar UID
    with open(UID_FILE_PATH, 'w') as file:
        pass
    print(f"Contenido de {UID_FILE_PATH} eliminado.")

    with open(TOKEN_FILE_PATH,'w') as file:
        pass
    print(f'Contenido de {TOKEN_FILE_PATH} eliminado');

    with open('sensorsext.sh','w') as file:
        pass
    print(f'Contenido de sensorsext.sh eliminado');

    with open('sensorsint.sh','w') as file:
        pass
    print(f'Contenido de sensorsint.sh eliminado');

def actualizacion_ip():
    """
    Función que actualiza el ip del disposito en Firebase

    """
    ip_anterior = obtener_ip_anterior()
    broker_ip   = obtener_ip_actual()  #Ip del broker MQTT tomada

    if (broker_ip != ip_anterior):
        ruta_ip= f'/{uid}/Configuracion/IPCPU'
        db_pyrebase.child(ruta_ip).set(broker_ip)
        guardar_ip(broker_ip)
        return broker_ip
    else:
        return broker_ip

#-------------------------manejo de sensor infrarrojo------------------------------------

def escuchar_boton(modo_anterior):
    """
    Función que escucha el botón a través del socket de LIRC.
    Si se detecta KEY_OK, se cambia el modo en Firebase al anterior desactivando la sirena

    Args:
        modo_anterior: modo anterior a la activación del modo 10

    Raise:
        FileNotFoundError: Error en caso de no encontrar le path de LIRC
        Exception: Error que se captura al no poder ejecutarse el proceso

    """
    global boton_thread_active

    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as lirc_socket:
            lirc_socket.connect(LIRC_SOCKET_PATH)
            print("Escuchando botón en modo 10...")

            while boton_thread_active:
                data = lirc_socket.recv(1024).decode('utf-8')
                if data.strip() and "KEY_OK" in data:
                    print("Botón KEY_OK detectado, regresando al modo anterior.")

                    # Desactiva el hilo antes de cambiar de modo
                    boton_thread_active = False

                    # Actualiza el modo en Firebase
                    nodo_modo = f'/{uid}/Configuracion/modo'
                    nodo_alerta = f'/{uid}/Alerta'
                    db_pyrebase.child(nodo_modo).set(modo_anterior)
                    db_pyrebase.child(nodo_alerta).set('Seguro')

                    break

    except FileNotFoundError:
        print(f"Socket de LIRC no encontrado en {LIRC_SOCKET_PATH}. Verifica que LIRC está funcionando.")
    except Exception as e:
        print(f"Error en escuchar_boton: {e}")

def manejar_hilo_boton(modo_actual, modo_anterior):
    """
    Activa o desactiva el hilo de escucha del botón según el modo actual.

    Args:
        modo_actual: El modo actual en que esta sistema de alarma
        modo_anterior: El modo anterior antes del modo 10

    """
    global boton_thread_active, boton_thread

    if modo_actual == 10:
        if not boton_thread_active:
            print("Activando hilo de escucha de botón...")
            boton_thread_active = True
            boton_thread = threading.Thread(target=escuchar_boton, args=(modo_anterior,), daemon=True)
            boton_thread.start()
    else:
        if boton_thread_active:
            print("Desactivando hilo de escucha del botón...")
            boton_thread_active = False  # Detiene el while en escuchar_boton()

            if boton_thread and boton_thread.is_alive():
                boton_thread.join(timeout=1)  # Esperar 1 segundo máximo
                boton_thread = None  # Limpiar la referencia

            print("Hilo de escucha del botón desactivado.")

def escuchar_boton_gpio():
    """Monitoriza un botón físico conectado a GPIO para acciones de apagado/reinicio.

    Esta función configura un botón conectado al pin GPIO 4 (con resistencia pull-up) y detecta
    pulsaciones cortas (<3s) o largas (≥3s) para ejecutar diferentes acciones:
    - Pulsación corta: Apaga el sistema (sudo shutdown)
    - Pulsación larga: Reinicia la aplicación y dispositivo

    El bucle principal verifica el estado del botón cada 100ms para evitar falsos positivos.

    Raises:
        Exception: Registra errores de hardware/comunicación GPIO pero no los relanza,
                   permitiendo que el programa continúe (aunque sin funcionalidad de botón).
    """
    PIN_BOTON = 4
    TIEMPO_LARGO = 3 

    try:
        GPIO.setup(PIN_BOTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        print("Monitor de botón GPIO 4 activo.")

        while True:
            if GPIO.input(PIN_BOTON) == GPIO.LOW:
                tiempo_inicio = time.time()
                while GPIO.input(PIN_BOTON) == GPIO.LOW:
                    time.sleep(0.1)
                duracion = time.time() - tiempo_inicio

                if duracion >= TIEMPO_LARGO:
                    print(f"🔁 Botón presionado {duracion:.2f}s → Reinicio completo.")
                    reinicio_dispositivo()
                    reiniciar_programa()
                else:
                    print(f"⏻ Botón presionado {duracion:.2f}s → Apagando Raspberry.")
                    os.system("sudo shutdown -h now")

            time.sleep(0.1)

    except Exception as e:
        print(f"❌ Error en el hilo del botón: {e}")

def checkea_modo_periodicamente():
    """Verifica periódicamente el modo de operación en Firebase y ejecuta acciones correspondientes.

    Esta función corre en un bucle infinito, consultando periódicamente (cada 1 segundo) el valor
    de 'modo' en la base de datos Firebase. Si detecta un cambio, dispara la función de callback
    `modo_alarma_cambio` para manejar la transición.

    La variable global `modo` es monitoreada, pero no modificada directamente por esta función
    (eso lo hace el callback).

    Maneja excepciones para evitar que el bucle se rompa por errores de conexión o lectura.
    
    Raises:
        Exception: Captura cualquier error durante la lectura de Firebase, pero lo imprime
                  y continúa la ejecución.
    """
    global modo
    ruta = f'/{uid}/Configuracion/modo'
    modo_anterior = modo
    while True:
        try:
            nuevo = db_pyrebase.child(ruta).get().val()
            if nuevo is not None and nuevo != modo_anterior:
                modo_anterior = nuevo
                # simulamos un mensaje SSE para reutilizar tu callback
                modo_alarma_cambio({"data": nuevo})
            # opcionalmente, aquí puedes también encender/apagar el relé directamente
        except Exception as e:
            print(f"Error leyendo modo de Firebase: {e}")
        time.sleep(1)


def main():
    """
    Función principal del programa.

    Esta función es el punto de entrada del programa. Se encarga de:
    1. Verifica si existe el usuario mediante la lectura del UID
    2. En caso de no existir usuario inicia el servidor http para recibir credenciales
    3. Cuando recibe las credenciales del servidor http reinicia el programa
    4. Inicia el stream de la variable modo de Firebase Database Realtime
    5. Maneja la logica del cambio de modos.
    6. Modos:
            Modo 0: -Modo configuracion se desuscribe de todos los topics del los diccionarios sensores interior y esteriores
                    -Se suscribe al topic de configuracion
                    -Cambia el callback de los mensajes a configuracion
                    -Apaga la sirena
            Modo 1: -Modo exteriores
                    -Se desuscribe del topic de configuracion
                    -Se suscribe a los topics de sensores exteriores del diccionario sensores exteriores
                    -Cambia el callback de los mensajes a monitoreo
                    -Apaga la sirena
            Modo 2: -Modo armado completo
                    -Cambia el callback de los mensajes a monitoreo
                    -Se desuscribe del topic de configuración
                    -Se suscribe a los topics de sensores exteriores del diccionario sensores exteriores
                    -Se suscribe a los topics de sensores interiores del diccionario sensores interiores
                    -Apaga la sirena
            Modo 10:-Modo alarma activa
                    -Cambia el callback de los mensajes a monitoreo activo
                    -Enciende la sirena
            Modo 11:-Modo reinicio dispositivo
                    -Borra los datos del usuario
                    -Reinicia el dispotivio

    """
    global boton_thread_active
    global token
    global uid

    uid = obtener_uid()

    if uid == '':
        server_thread = servidor_http.run(port=80)
        server_thread.join()
        reiniciar_programa()

    token       = obtener_token()
    if token == '':
        leer_token_firebase()
        token = obtener_token()


    ip_anterior  = obtener_ip_anterior()
    broker_ip    = obtener_ip_actual()

    if broker_ip != ip_anterior:
        ruta_ip  = f'/{uid}/Configuracion/IPCPU'
        db_pyrebase.child(ruta_ip).set(broker_ip)
        guardar_ip(broker_ip)
    threading.Thread(target=escuchar_boton_gpio, daemon=True).start()
    threading.Thread(target=checkea_modo_periodicamente, daemon=True).start()


    client      = None
    modo_anterior = None

    try:
        client = conectar_al_broker(broker_ip)
        if client:
            client.loop_start()
            while True:
                if modo != modo_anterior:
                    manejar_hilo_boton(modo, modo_anterior)
                    modo_anterior = modo

                    if modo == 0:
                        # Lógica de modo configuración
                        modulo_rele.desactivar_sirena()
                        for topic in sensorsext.values():
                            client.unsubscribe(topic)
                            print(f'Desuscrio a {topic}');
                        for topic in sensorsint.values():
                            client.unsubscribe(topic)
                            print(f'Desuscrio a {topic}');
                        print("Modo configuración activo.")
                        client.on_message = on_message_configuracion
                        client.subscribe("alarma/configuracion")
                        print(f'Suscribiendose a alarma/configuracion');
                        # Desuscribe de todos los topics de sensores de exterior e interior
                    elif modo == 1:
                        # Lógica de modo exteriores
                        print("Modo exteriores activado.")
                        modulo_rele.desactivar_sirena()
                        client.on_message = on_message_monitoreo
                        client.unsubscribe("alarma/configuracion")
                        for topic in sensorsint.values():
                            client.unsubscribe(topic)

                        print(f'Dejando de leer sensores interiores');
                        cargar_sensores_desde_shell('sensorsext.sh')

                        # Suscribirse solo a los topics de sensores exteriores.
                        for topic in sensorsext.values():
                            client.subscribe(topic)
                            print(f"Suscrito a topic de exterior: {topic}")
                    elif modo == 2:
                        # Lógica de modo completo.
                        print("Modo armado completo.")
                        modulo_rele.desactivar_sirena()
                        client.on_message = on_message_monitoreo
                        client.unsubscribe("alarma/configuracion")

                        # Cargar los sensores desde los archivos de shell.
                        cargar_sensores_desde_shell('sensorsint.sh')
                        cargar_sensores_desde_shell('sensorsext.sh')

                        # Suscribirse a todos los topics de exterior e interior.
                        for topic in sensorsint.values():
                            client.subscribe(topic)
                            print(f"Suscrito a topic de interior: {topic}")
                        for topic in sensorsext.values():
                            client.subscribe(topic)
                            print(f"Suscrito a topic de exterior: {topic}")

                    elif modo == 10:
                        # Lógica de modo alarma activa.
                        print("Modo alarma activa.")
                        client.on_message = on_message_monitoreo_activo
                        modulo_rele.activar_sirena()

                    elif modo == 11:
                        # Lógica de modo reinicio de dispositivo.
                        print("Modo 11: reiniciando dispositivo.")
                        reinicio_dispositivo()
                        time.sleep(5)
                        reiniciar_programa()

                # Verificar la conexión periódicamente
                if not client.is_connected():
                    print("El cliente MQTT se ha desconectado, intentando reconectar...")
                    broker_ip = actualizacion_ip()
                    if broker_ip:
                        client.loop_stop()
                        client.disconnect()
                        client = conectar_al_broker(broker_ip)
                        if client:
                            client.loop_start()
                            print(f"Reconexion exitosa al broker: {broker_ip}")
                        else:
                            print("No se pudo reconectar al broker MQTT.")
                    else:
                        print("No se obtuvo una IP válida para el broker.")

                time.sleep(1)

    except KeyboardInterrupt:
        print("Programa interrumpido manualmente (Ctrl+C).")
    finally:
        if client:
            client.loop_stop()
            client.disconnect()
        if boton_thread_active:
            boton_thread_active = False
            if boton_thread:
                boton_thread.join()
        modulo_rele.cleanup()
        GPIO.cleanup()
        print("Finalizando el programa.")

if __name__ == "__main__":
    main()