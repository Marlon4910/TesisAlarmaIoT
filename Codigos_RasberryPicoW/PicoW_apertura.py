import network
import socket
import ntptime
import time
import os
import urequests
import json
from umqtt.robust import MQTTClient  
from machine import Pin, reset, ADC

#------path de archivos 
CREDENTIALS_FILE = "wifi_credenciales.txt" 
SENSOR_FILE = "sensor_almacenado.txt"
#------Asignacion de pines para lectura
sensor_apertura = Pin(22, Pin.IN, Pin.PULL_UP)
boton_reinicio = Pin(21, Pin.IN,Pin.PULL_UP)
led = Pin("LED", Pin.OUT) #Led integrado en la placa
#------Tipo de sensor
tipo_sensor = 'apertura'
#------Variables globales para control de numero de intentos
intentos = 0
max_intentos = 5

def guardar_credenciales(ssid, password, sensor_id, uid, location):
    """
    Guarda las credenciales de red WiFi y la información del sensor en un archivo.

    Parámetros:
        ssid (str): Nombre de la red WiFi.
        password (str): Contraseña de la red WiFi.
        sensor_id (str): Identificador del sensor.
        uid (str): Identificador único del usuario.
        location (str): Ubicación física del sensor.

    Archivo generado:
        CREDENTIALS_FILE: Contiene las credenciales y datos del sensor, cada dato en una línea distinta.
    """
    with open(CREDENTIALS_FILE, "w") as f:
        f.write(f"{ssid}\n{password}\n{sensor_id}\n{uid}\n{location}")

def guardar_sensor(add):
    """
    Guarda el valor de "1" para reconocer si el sensor fue agregado
    
    Parámetros:
        add (int): Valor que representa si el sensor fue agregado del sensor.

    Archivo generado:
        SENSOR_FILE: Contiene un único valor numérico en formato de texto.
    """
    with open(SENSOR_FILE, "w") as f:
        f.write(str(add))

def cargar_sensor():
    """
    Carga el valor del sensor almacenado previamente en un archivo.

    Retorna:
        int | None: Devuelve el valor entero si existe, o None si el archivo
        no existe o está vacío.

    Manejo de errores:
        Retorna None si ocurre un error al intentar acceder al archivo.
    """
    try:
        os.stat(SENSOR_FILE)
        with open(SENSOR_FILE, 'r') as f:
            add = f.read().strip()
            return int(add) if add else None
    except OSError:
        return None

def cargar_credenciales():
    """
    Carga las credenciales de red WiFi y la información del sensor desde un archivo.

    Retorna:
        tuple: Una tupla con los siguientes cinco elementos, en orden:
            - ssid (str): Nombre de la red WiFi.
            - password (str): Contraseña de la red WiFi.
            - sensor_id (str): Identificador del sensor.
            - uid (str): Identificador único del usuario.
            - location (str): Ubicación física del sensor.

        En caso de error (por ejemplo, si el archivo no existe), retorna: (None, None, None, None, None)

    Manejo de errores:
        Si el archivo no puede ser leído (por ejemplo, no existe), se capturará la excepción OSError y se devolverán valores None.
    """
    try:
        os.stat(CREDENTIALS_FILE)
        with open(CREDENTIALS_FILE, "r") as f:
            ssid = f.readline().strip()
            password = f.readline().strip()
            sensor_id = f.readline().strip()
            uid = f.readline().strip()
            location = f.readline().strip()
            return ssid, password, sensor_id, uid, location
    except OSError:
        return None, None, None, None, None

def conectar_wifi(ssid, password):
    """
    Intenta conectar el dispositivo a una red WiFi utilizando el SSID y la contraseña proporcionados.

    Parámetros:
        ssid (str): Nombre de la red WiFi.
        password (str): Contraseña de la red WiFi.

    Retorna:
        bool: True si la conexión fue exitosa, False si no se logró conectar tras varios intentos.

    Comportamiento:
        - Se intenta conectar hasta alcanzar el número máximo de intentos definido por `max_intentos`.
        - Se enciende y apaga un LED como señal visual del proceso de conexión.
        - En cada intento se espera hasta 10 segundos por una conexión exitosa, revisando cada 0.1 segundos.
        - Si se conecta correctamente, se imprime la configuración de red y se retorna True.
        - Si falla, se imprime el error, espera 5 segundos y reintenta.
        - Si se alcanzan todos los intentos sin éxito, se retorna False.

    Variables globales requeridas:
        - intentos (int): Contador de intentos realizados.
        - max_intentos (int): Número máximo de intentos permitidos.
        - led (Pin): Objeto que controla el LED de la placa.
    """
    global intentos
    global max_intentos
    while intentos < max_intentos:
        try:
            led.value(0)
            time.sleep(1)
            led.value(1)
            time.sleep(1)
            led.value(0)

            wlan = network.WLAN(network.STA_IF)
            wlan.active(True)
            print(f"Conectando a la red {ssid}...")
            wlan.connect(ssid, password)

            # Esperar hasta que esté conectado o se acabe el tiempo
            tiempo_espera = 10  # segundos
            for _ in range(tiempo_espera * 10):  # chequeo cada 0.1 seg
                if wlan.isconnected():
                    break
                time.sleep(0.1)

            if wlan.isconnected():
                print("Conectado a la red:", wlan.ifconfig())
                led.value(1)
                time.sleep(1)
                intentos = 0
                return True
            else:
                raise Exception("No se logró conectar en el tiempo esperado")

        except Exception as e:
            print(f"Error al conectarse a wifi: {e}")
            intentos += 1
            time.sleep(5)

    print('No se logró conectar, se retorna False')
    return False


def modo_ad_hoc():
    """
    Activa el modo Access Point (AD-HOC) para recibir credenciales WiFi y configuración del sensor 
    desde una aplicación móvil mediante una solicitud HTTP.

    Proceso:
        1. Se activa el modo AP (Access Point) con SSID 'PICO-NETWORK' y contraseña '12345678'.
        2. Se abre un socket en el puerto 80 (HTTP).
        3. Espera una conexión entrante y analiza la solicitud HTTP recibida.
        4. Si la solicitud contiene los parámetros esperados (`ssid`, `password`, `sensorid`, `uid`, `location`):
            - Extrae los valores desde la URL.
            - Guarda los datos usando la función `guardar_credenciales`.
            - Envía una respuesta de confirmación a la aplicación.
            - Desactiva el AP y llama a `conectar_wifi()` para conectarse a la red recibida.
            - Si se conecta correctamente, parpadea el LED y hace un `reset()` del sistema.

    Parámetros esperados en la solicitud HTTP (GET):
        /wifi?ssid=<SSID>&password=<PASS>&sensorid=<ID>&uid=<UID>&location=<LOC>

    Consideraciones:
        - La función se bloquea hasta que recibe una solicitud válida con credenciales.
        - Utiliza `replace('%20', ' ')` para convertir espacios codificados en la URL.
        - Llama a `reset()` después de conectarse exitosamente a la red WiFi.
        - Usa variables y funciones externas como `led`, `guardar_credenciales`, `conectar_wifi` y `reset`.

    Ejemplo de URL esperada:
        /wifi?ssid=MiRed&password=12345678&sensorid=3&uid=abc123&location=Sala%20principal
        http://192.168.4.1/wifi?ssid=123&password=qissk&sensorid=1&uid=xozugjviRGMreIrZjYD2fgaVKqm1&location=exterior
        
    """
    ap = network.WLAN(network.AP_IF)
    ap.config(essid='PICO-NETWORK', password='12345678')
    ap.active(True)
    while not ap.active():
        pass
    print('Modo AD activo. Dirección IP: ' + ap.ifconfig()[0])
    
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 80))
    s.listen(5)
    
    while True:
        conn, addr = s.accept()
        print(f'Conexión desde {str(addr)}')
        request = conn.recv(1024).decode()
        
        # Verificación de parámetros en la solicitud HTTP
        if '/wifi?ssid=' in request and '&password=' in request and '&sensorid=' in request and '&uid=' in request and '&location=' in request:
            ssid_start      = request.find('/wifi?ssid=') + 11
            ssid_end        = request.find('&password=')
            password_start  = ssid_end + 10
            password_end    = request.find('&sensorid=')
            sensor_id_start = password_end + 10
            sensor_id_end   = request.find('&uid=')
            uid_start       = sensor_id_end + 5
            uid_end         = request.find('&location=')
            location_start  = uid_end + 10
            location_end    = request.find(' ', location_start)
            
            # Extraer valores desde la URL
            ssid       = request[ssid_start:ssid_end].replace('%20', ' ')
            password   = request[password_start:password_end]
            sensor_id  = request[sensor_id_start:sensor_id_end]
            uid        = request[uid_start:uid_end]
            location   = request[location_start:location_end].replace('%20', ' ')
            
            print(f"Recibido SSID: {ssid}, Password: {password}, Sensor ID: {sensor_id}, UID: {uid}, Ubicación: {location}")
            
            guardar_credenciales(ssid, password, sensor_id, uid, location)
            
            response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nCredenciales recibidas"
            conn.send(response.encode())
            conn.close()
            
            ap.active(False)
            print("AH apagado, conectando a la nueva red...")
            success = conectar_wifi(ssid, password)
            if success:
                led.value(0)
                time.sleep(5)
                led.value(1)
                reset()
                break
        
        conn.close()

def actualizar_url(uid):
    """
    Actualiza la URL completa con el UID para acceder a la dirección IP de la CPU en Firebase Realtime Database.

    Parámetros:
        uid (str): Identificador único del usuario.

    Retorna:
        str: URL formateada que apunta a la clave 'IPCPU' dentro del nodo de configuración
             correspondiente al UID proporcionado.

    Nota:
        - La base de la URL debe ser reemplazada por la real, por ejemplo:
          'https://mi-proyecto.firebaseio.com'
        - El resultado termina con `.json`, como es requerido por la libreria urequests.
    """
    firebase_url = f'https://URL/{uid}/Configuracion/IPCPU.json' # ----Actualizar URL-----
    return firebase_url


def leer_ip_desde_firebase(firebase_url):
    """
    Realiza una solicitud GET a Firebase para obtener la dirección IP de la CPU almacenada en la base de datos.

    Parámetros:
        firebase_url (str): URL completa hacia el nodo 'IPCPU' en Firebase (debe terminar en `.json`).

    Retorna:
        str | None:
            - La dirección IP como cadena si la solicitud es exitosa (HTTP 200).
            - None si ocurre un error o si el código de respuesta no es 200.

    Comportamiento:
        - Usa `urequests.get()` para realizar la solicitud HTTP.
        - El valor devuelto por Firebase puede venir entre comillas dobles (por ser string JSON),
          por lo que se limpia con `strip('"')`.
        - Imprime el estado del proceso y posibles errores.

    Manejo de errores:
        - Captura cualquier excepción durante la solicitud y devuelve None.
        - Cierra la conexión HTTP en el bloque `finally` para liberar recursos.
    """
    response = None  
    try:
        response = urequests.get(firebase_url)
        if response.status_code == 200:
            data = response.text.strip('"')
            print("IP obtenida de Firebase:", data)
            return data
        else:
            print(f"Error al obtener datos, código de respuesta: {response.status_code}")
    except Exception as e:
        print(f"Error al leer datos: {e}")
        return None
    finally:
        if response:
            response.close()


def conectar_mqtt_config(ip_broker, sensor_id, location):
    """
    Establece conexión con un broker MQTT y publica los datos de configuración del sensor.
    
    Parámetros:
        ip_broker (str): Dirección IP del broker MQTT.
        sensor_id (str): Identificador del sensor que se está registrando.
        location (str): Ubicación física del sensor.

    Retorna:
        MQTTClient | bool:
            - Retorna el objeto `MQTTClient` si la conexión y la publicación son exitosas.
            - Retorna `False` si se excede el número máximo de intentos de conexión.

    Comportamiento:
        - Intenta conectarse al broker MQTT definido por `ip_broker`, puerto 1883.
        - Publica un mensaje en el topic `"alarma/configuracion"` con los datos:
            {
                "sensor_id": sensor_id,
                "topic": "alarma/sensor<sensor_id>/<tipo_sensor>",
                "ubicacion": location
            }
        - El `topic` se construye dinámicamente usando la variable global `tipo_sensor`.
        - Si la conexión falla, espera 5 segundos antes de reintentar.
        - Reintenta hasta alcanzar el valor definido en `max_intentos`.

    Variables globales requeridas:
        - intentos (int): Contador actual de intentos de conexión.
        - max_intentos (int): Número máximo de intentos permitidos.
        - tipo_sensor (str): Tipo de sensor (ej. "movimiento", "puerta", etc.), usado para formar el topic.

    Nota:
        - Si falla en todos los intentos, se imprime un mensaje y se retorna `False`.
    """
    global intentos
    global max_intentos
    while intentos < max_intentos:
        try:
            client = MQTTClient(f"sensor_pico_{sensor_id}", ip_broker, port=1883)
            client.connect()
            print("Conectado al broker MQTT")
            mensaje = json.dumps({
                "sensor_id": sensor_id,
                "topic": f"alarma/sensor{sensor_id}/{tipo_sensor}",
                "ubicacion": location
            })
            client.publish("alarma/configuracion", mensaje)
            print(f"Publicado nuevo sensor: {mensaje}")
            intentos = 0
            return client
        except Exception as e:
            print(f"Error al conectarse al broker MQTT: {e}")
            intentos += 1
            time.sleep(5) 

    print("No se pudo conectar al broker MQTT después de 5 intentos-- Reiniciando Raspberry")
    return False

def conectar_mqtt(ip_broker, sensor_id):
    """
    Conecta al broker MQTT y configura el mensaje Last Will and Testament (LWT).

    Parámetros:
        ip_broker (str): Dirección IP del broker MQTT.
        sensor_id (str): Identificador único del sensor que realiza la conexión.

    Retorna:
        MQTTClient | None:
            - Devuelve un objeto `MQTTClient` si la conexión es exitosa.
            - Devuelve `None` si ocurre un error durante la conexión.

    Comportamiento:
        - Crea un cliente MQTT identificado como `sensor_pico_<sensor_id>`.
        - Usa un keepalive de 30 segundos para mantener viva la conexión.
        - Define el topic MQTT como: `"alarma/sensor<sensor_id>/<tipo_sensor>"`.
        - Configura el Last Will and Testament (LWT), que es un mensaje que se publicará automáticamente
          si el cliente pierde la conexión inesperadamente:
            {
                "sensor_id": <sensor_id>,
                "estado": "offline"
            }
          Este mensaje se publica en el mismo topic del sensor.
        - Intenta conectarse al broker. Si tiene éxito, devuelve el cliente MQTT listo para usar.

    Variables globales requeridas:
        - tipo_sensor (str): Tipo de sensor, tilizado para formar el nombre del topic MQTT.

    Manejo de errores:
        - Si la conexión falla, se imprime un mensaje de error y se retorna `None`.
    """
    try:
        client = MQTTClient(f"sensor_pico_{sensor_id}", ip_broker, port=1883, keepalive=30)
        topic_mqtt = f"alarma/sensor{sensor_id}/{tipo_sensor}"
        # Configurar el Last Will and Testament (LWT)
        lwt_message = json.dumps({"sensor_id": sensor_id, "estado": "offline"})
        client.set_last_will(topic_mqtt, lwt_message.encode(), retain=False, qos=1)
        client.connect()
        print(f'conectado MQTT')
        return client
    except Exception as e:
        print(f'No se logró conectar al broker: {e}')
        return None



def reconectar_mqtt(client, uid, sensor_id):
    """
    Intenta reconectar al broker MQTT utilizando la IP actualizada desde Firebase.

    Parámetros:
        client (MQTTClient): Cliente MQTT previamente desconectado o fallido.
        uid (str): Identificador único del nodo/dispositivo en Firebase.
        sensor_id (str): Identificador del sensor que realiza la reconexión.

    Retorna:
        MQTTClient | None:
            - Retorna un nuevo objeto `MQTTClient` si la reconexión fue exitosa.
            - Retorna `None` si no se logró reconectar después del número máximo de intentos.

    Proceso:
        - Realiza hasta `max_intentos` intentos de reconexión.
        - En cada intento:
            1. Obtiene la IP del broker desde Firebase mediante `actualizacion_ip(uid)`.
            2. Llama a `conectar_mqtt(ip_broker, sensor_id)` para intentar reconectarse.
            3. Si la conexión es exitosa, reinicia el contador de intentos y devuelve el nuevo cliente.
            4. Si falla, espera 5 segundos antes de intentar nuevamente.

    Manejo de errores:
        - Captura cualquier excepción durante el proceso de reconexión.
        - Imprime mensajes de estado para seguimiento del proceso.
    """
    global intentos
    global max_intentos
    while intentos < max_intentos:
        try:
            print(f"Intentando reconectar al broker MQTT. Intento {intentos + 1}/{max_intentos}")
            ip_broker = actualizacion_ip(uid)  
            client = conectar_mqtt(ip_broker, sensor_id)  
            if client:
                print("Reconexión exitosa.")
                intentos = 0
                return client
        except Exception as e:
            print(f"Error al reconectar: {e}")
        intentos += 1
        time.sleep(5)
    
    print("No se pudo reconectar después de varios intentos.")
    return None

 
def actualizacion_ip(uid):
    """
    Obtiene la IP actual del broker MQTT desde Firebase Realtime Database.

    Parámetros:
        uid (str): Identificador único del nodo o dispositivo en la estructura de Firebase.

    Retorna:
        str | bool:
            - Devuelve la IP del broker como cadena si la consulta es exitosa.
            - Devuelve False si ocurre un error durante la solicitud.

    Proceso:
        - Genera la URL de acceso a Firebase llamando a `actualizar_url(uid)`.
        - Realiza una solicitud GET a esa URL mediante `leer_ip_desde_firebase(firebase_url)`.
        - Si la lectura es exitosa, retorna la IP.
        - Si ocurre un error, incrementa el contador de intentos y retorna `False`.
    """
    global intentos
    global max_intentos
    while intentos < max_intentos:
        try:    
            firebase_url = actualizar_url(uid)
            print(f'firebase url es: {firebase_url}')
            ip_broker = leer_ip_desde_firebase(firebase_url)
            return ip_broker
        except Exception as e:
            intentos += 1
            time.sleep(5)
            return False

def reinicio_dispositivo():
    """
    Borra las credenciales y configuración del sensor almacenadas localmente y reinicia el dispositivo.

    Comportamiento:
        - Elimina el contenido del archivo de credenciales (`CREDENTIALS_FILE`).
        - Elimina el contenido del archivo de configuración del sensor (`SENSOR_FILE`).
        - Espera 1 segundo y reinicia el sistema con `reset()`.

    Efectos:
        - Deja el dispositivo en un estado inicial, como si no se hubiera configurado.
        - Es útil para recuperación manual o remota, o en caso de error crítico en la configuración.

    """
    print("Reiniciando dispositivo...")
    with open(CREDENTIALS_FILE, 'w') as f:
        pass
    with open(SENSOR_FILE, 'w') as f:
        pass
    print("Credenciales borradas. Reiniciando...")
    time.sleep(1)
    reset()

def monitorear_mqtt(client, uid, sensor_id, ip_broker):
    """
    Supervisa continuamente el estado del sensor de apertura y mantiene activa la conexión con el broker MQTT.

    Parámetros:
        client (MQTTClient): Objeto MQTT ya conectado al broker.
        uid (str): Identificador único del dispositivo (usado para recuperación).
        sensor_id (str): ID del sensor que publica eventos.
        ip_broker (str): IP del broker MQTT actual.

    Comportamiento:
        - Verifica si el cliente MQTT sigue conectado.
        - Si el botón físico de reinicio (`boton_reinicio`) está presionado, borra las credenciales y reinicia el dispositivo.
        - Lee el estado del sensor de apertura (`sensor_apertura`):
            - Si se detecta una apertura (estado = 1), publica un mensaje con `{sensor_id, estado}` en el topic correspondiente.
            - También imprime la fecha en UTC (para depuración).
        - Si no hay eventos, publica un mensaje periódico (ping) para mantener la conexión con el broker activa.
        - En caso de perder la conexión MQTT, intenta reconectarse usando `reconectar_mqtt()`.
            - Si la reconexión falla, reinicia el dispositivo con `reset()`.

    Variables requeridas globalmente:
        - tipo_sensor (str): Tipo del sensor, usado para formar el topic MQTT.
        - sensor_apertura (Pin): Entrada digital conectada al sensor físico.
        - boton_reinicio (Pin): Entrada digital conectada al botón de reinicio.
        - led (Pin): LED que indica actividad del sistema.

    Lógica adicional:
        - Se realiza un ping al broker cada 15 segundos (la mitad del keepalive de 30s).
        - Usa JSON para los mensajes publicados.
        - Al reconectarse exitosamente, se publica un mensaje indicando que el sensor está "Online".

    Manejo de errores:
        - Captura excepciones en el ciclo principal.
        - Si la reconexión falla completamente, reinicia la Pico con `reset()`.

    """
    last_ping_time = time.time()
    keepalive_interval = 30

    while True:
        try:
            led.value(1)
            current_time = time.time()
            if not client.sock:
                raise Exception("El cliente MQTT se ha desconectado.")

            if boton_reinicio.value() == 0:
                print("Pulsador de reinicio detectado.")
                reinicio_dispositivo()

            estado = 1 if sensor_apertura.value() == 1 else 0

            if estado == 1:
                mensaje = json.dumps({"sensor_id": sensor_id, "estado": estado})
                print(f"Apertura detectada, enviando mensaje: {mensaje}")
                client.publish(f"alarma/sensor{sensor_id}/{tipo_sensor}", mensaje, qos=1)

                timestamp = time.time()
                fecha_utc = time.gmtime(timestamp)
                print("UTC:", fecha_utc)

                time.sleep(5)
            else:
                if current_time - last_ping_time >= keepalive_interval / 2:
                    mensaje = json.dumps({"sensor_id": sensor_id, "estado": estado})
                    client.publish(f"alarma/sensor{sensor_id}/{tipo_sensor}", mensaje, qos=1)
                    last_ping_time = current_time
                    print("Sin eventos detectados.")
                else:
                    print("Sin eventos detectados durante el tiempo")

        except Exception as e:
            print(f"Error en la conexión MQTT: {e}. Intentando reconectar...")
            client = reconectar_mqtt(client, uid, sensor_id)
            if not client:
                print("Reconexión fallida. Reiniciando dispositivo...")
                reset()
                return
            else:
                try:
                    mensaje = json.dumps({"sensor_id": sensor_id, "estado": "Online"})
                    client.publish(f"alarma/sensor{sensor_id}/{tipo_sensor}", mensaje, qos=1)
                    print("Reconexión exitosa. Estado Online publicado.")
                except Exception as e:
                    print(f"Error al publicar Online tras reconectar: {e}")
        led.value(0)
        time.sleep(1)

def main():
    
    """
    Función principal que gestiona el ciclo de vida del dispositivo:
    - Verifica si se debe reiniciar por pulsador físico.
    - Carga credenciales y estado del sensor.
    - Se conecta al WiFi almacenado o inicia modo Ad-Hoc si no hay credenciales.
    - Según el estado del sensor (`add`), realiza una configuración inicial o inicia el monitoreo MQTT.

    Flujo general:
    1. Revisa si se presionó el botón de reinicio → Si es así, borra archivos y reinicia.
    2. Carga credenciales (SSID, contraseña, sensor_id, uid, ubicación) y el valor de configuración (`add`).
    3. Si hay credenciales válidas:
       - Intenta conectarse al WiFi.
       - Si `add != None`, significa que el sensor ya fue agregado:
         - Sincroniza el reloj NTP.
         - Obtiene la IP del broker MQTT desde Firebase.
         - Intenta conectar al broker con `conectar_mqtt()` o `reconectar_mqtt()`.
         - Publica que el sensor está "Online" y entra en el bucle de monitoreo.
       - Si `add == None`, significa que el sensor aún no ha sido registrado:
         - Obtiene IP del broker.
         - Usa `conectar_mqtt_config()` para enviar su información de configuración.
         - Guarda que fue agregado (`add=1`) y reinicia la función `main()` recursivamente.
    4. Si falla la conexión al WiFi:
       - Si el sensor ya había sido agregado, se reinicia la placa.
       - Si no había sido agregado, se borran credenciales con `reinicio_dispositivo()`.
    5. Si no hay credenciales, entra en modo Ad-Hoc para recibirlas.

    Variables globales utilizadas:
        - intentos (int): Contador de intentos de conexión (reiniciado a 0).
        - max_intentos (int): Límite máximo de intentos (definido fuera de `main`).
        - tipo_sensor (str): Tipo de sensor (global, usada en publicaciones MQTT).

    Llamadas clave:
        - `cargar_credenciales()` y `cargar_sensor()` para obtener datos almacenados.
        - `conectar_wifi()` para conectarse a la red.
        - `actualizacion_ip()` y `leer_ip_desde_firebase()` para obtener la IP del broker.
        - `conectar_mqtt()` y `conectar_mqtt_config()` para establecer conexión MQTT.
        - `monitorear_mqtt()` para iniciar el ciclo de monitoreo de eventos.
        - `reinicio_dispositivo()` o `reset()` si ocurre un fallo grave.
    """
    led.value(1) 
    if boton_reinicio.value() == 0:
        print("Pulsador de reinicio detectado.")
        reinicio_dispositivo()
    ssid, password, sensor_id,uid, location = cargar_credenciales()
    add = cargar_sensor()
    global intentos
    intentos = 0
    global max_intentos
    print(f"Valor de 'add' cargado: {add}")
    if ssid and password and sensor_id:
        print(f"Conectando a la red guardada: {ssid}")
        success = conectar_wifi(ssid, password)
        if success and add != None:
            ntptime.settime()
            led.value(0)
            time.sleep(5)
            led.value(1)
            time.sleep(5)
            led.value(0)
            print("Sensor ya agregado a CPU. Conectandose al broker")
            ip_broker = actualizacion_ip(uid)
            client = conectar_mqtt(ip_broker, sensor_id)
            if not client:
                print("Error: No se pudo conectar al broker MQTT.")
                client = reconectar_mqtt(client,uid,sensor_id)
                if client:
                    print(f'Conexion exitosa')
                else:
                    print(f'No se logro conectar a broker mqtt, esperando');
                    time.sleep(300)
                    reset()
            
            mensaje = json.dumps({"sensor_id": sensor_id, "estado": "Online"})
            client.publish(f"alarma/sensor{sensor_id}/{tipo_sensor}", mensaje, qos=1)
            
            
            #!--------------------------Iniciando monitoreo----------------------------------
            monitorear_mqtt(client,uid,sensor_id,ip_broker)
                            
        elif success and add is None:
            led.value(0)
            time.sleep(5)
            led.value(1)
            time.sleep(5)
            led.value(0)
            time.sleep(5)
            print(f'UID es:{uid}')
            ip_broker = actualizacion_ip(uid)
            if ip_broker != False:
                client = conectar_mqtt_config(ip_broker, sensor_id, location)
                if client:
                    guardar_sensor(add=1)
                    print("Sensor agregado y guardado correctamente.")
                    time.sleep(5)
                    intentos = 0
                    main()
                else:
                    time.sleep(30)
                    reset()
        elif not success and add != None:
            reset()
        elif not success and add is None:
            print(f'Reincio del la placa');
            reinicio_dispositivo()
    else:
        print("Error al conectar a la red. Iniciando modo AD...")
        modo_ad_hoc()

time.sleep(2)
main()

