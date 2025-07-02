import network
import socket
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
humo_sensor_digital = Pin(22, Pin.IN)  
humo_sensor_analog = ADC(26) 
boton_reinicio = Pin(21, Pin.IN,Pin.PULL_UP)
led = Pin("LED", Pin.OUT) #Led integrado en la placa
#------Tipo de sensor
tipo_sensor = 'humo'
#------Variables globales para control de numero de intentos
intentos = 0
max_intentos = 5

def guardar_credenciales(ssid, password, sensor_id, uid, location):
    with open(CREDENTIALS_FILE, "w") as f:
        f.write(f"{ssid}\n{password}\n{sensor_id}\n{uid}\n{location}")

def guardar_sensor(add):
    with open(SENSOR_FILE, "w") as f:
        f.write(str(add))

def cargar_sensor():
    try:
        os.stat(SENSOR_FILE)
        with open(SENSOR_FILE, 'r') as f:
            add = f.read().strip()
            return int(add) if add else None
    except OSError:
        return None

def cargar_credenciales():
    try:
        os.stat(CREDENTIALS_FILE)
        with open(CREDENTIALS_FILE, "r") as f:
            ssid = f.readline().strip()
            password = f.readline().strip()
            sensor_id = f.readline().strip()
            uid = f.readline().strip()
            location = f.readline().strip()
            return ssid, password, sensor_id,uid, location
    except OSError:
        return None, None, None, None, None
    
def conectar_wifi(ssid, password):
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
            tiempo_espera = 10 
            for _ in range(tiempo_espera * 10):
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

    print(f'No se logró conectar, se retorna false')
    return False

def modo_ad_hoc():
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
        
        # Verificacion credenciales
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
            
            # Extraer los valores de la solicitud HTTP
            ssid       = request[ssid_start:ssid_end].replace('%20', ' ')
            password   = request[password_start:password_end]
            sensor_id  = request[sensor_id_start:sensor_id_end]
            uid        = request[uid_start:uid_end]
            location   = request[location_start:location_end].replace('%20', ' ')
            
            print(f"Recibido SSID: {ssid}, Password: {password}, Sensor ID: {sensor_id}, UID: {uid}, Ubicación: {location}")
            
            # Guarda el UID y la ubicación
            guardar_credenciales(ssid, password, sensor_id, uid, location)
            
            # Se envia una respuesta HTTP para la app, antes de apagar el AH
            response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nCredenciales recibidas"
            conn.send(response.encode())
            conn.close()
            
            # Desactiva el AH y se conceta al wifi
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
    firebase_url = f'https://alarma-xibernetiq-default-rtdb.firebaseio.com/{uid}/Configuracion/IPCPU.json'
    return firebase_url;

def leer_ip_desde_firebase(firebase_url):
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
    global intentos
    global max_intentos
    while intentos < max_intentos:
        try:
            client = MQTTClient(f"sensor_pico_{sensor_id}", ip_broker, port=1883)
            client.connect()
            print("Conectado al broker MQTT")
            mensaje = json.dumps({"sensor_id": sensor_id, "topic": f"alarma/sensor{sensor_id}/{tipo_sensor}", "ubicacion": location})
            client.publish("alarma/configuracion", mensaje)
            print(f"Publicado nuevo sensor: {mensaje}")
            intentos=0
            return client
        except Exception as e:
            print(f"Error al conectarse al broker MQTT: {e}")
            intentos += 1
            time.sleep(5) 

    print("No se pudo conectar al broker MQTT después de 5 intentos-- Reiniciando Raspberry")
    return False


def conectar_mqtt(ip_broker,sensor_id):
    try:
        client = MQTTClient(f"sensor_pico_{sensor_id}", ip_broker, port=1883, keepalive=30)
        topic_mqtt = f"alarma/sensor{sensor_id}/{tipo_sensor}"
        # Configurar el Last Will and Testament (LWT)
        lwt_message = json.dumps({"sensor_id": sensor_id, "estado": "offline"})
        client.set_last_will(topic_mqtt, lwt_message.encode(), retain=False, qos=1)
        client.connect()
        print(f'conectado MQTT');
        return client
    except Exception as e:
        print(f'No se logro conectar al broker')
        return None

# http://192.168.4.1/wifi?ssid=123&password=qissk&sensorid=1&uid=xozugjviRGMreIrZjYD2fgaVKqm1&location=exterior

def reconectar_mqtt(client, uid, sensor_id):
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
    global intentos
    global max_intentos
    while intentos < max_intentos:
        try:    
            firebase_url = actualizar_url(uid)
            print(f'firebase url es: {firebase_url}')
            ip_broker = leer_ip_desde_firebase(firebase_url)
            return ip_broker
        except Exception as e:
            intentos +=1
            time.sleep(5)
            return False

def reinicio_dispositivo():
    print("Reiniciando dispositivo...")
    with open(CREDENTIALS_FILE, 'w') as f:
        pass
    with open(SENSOR_FILE,'w') as f:
        pass
    print("Credenciales borradas. Reiniciando...")
    time.sleep(1)  
    reset()  

def monitorear_mqtt(client, uid, sensor_id, ip_broker):
    last_ping_time = time.time()
    keepalive_interval = 30

    while True:
        try:
            led.value(1)
            current_time = time.time()
            if not client.sock:  # Verificacion del si esta el broker MQTT
                raise Exception("El cliente MQTT se ha desconectado.")
            
            if boton_reinicio.value() == 0:
                print("Pulsador de reinicio detectado.")
                reinicio_dispositivo()
            
            if humo_sensor_digital.value() == 0:
                estado = 1
                print(f'Humo detectado')
            else:
                estado = 0
                print(f'No se detecto nada')
                
            print(f"Valor analógico: {humo_sensor_analog.read_u16()}")
            print(f"Valor digital: {humo_sensor_digital.value()}")

                
            if estado == 1:  
                mensaje = json.dumps({"sensor_id": sensor_id, "estado": estado})
                print(f"Humo detectado, enviando mensaje: {mensaje}")
                client.publish(f"alarma/sensor{sensor_id}/{tipo_sensor}", mensaje, qos=1)
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
                            
        elif add is None:
            led.value(0)
            time.sleep(5)
            led.value(1)
            time.sleep(5)
            led.value(0)
            time.sleep(5)
            print(f'UID es:{uid}')
            ip_broker = actualizacion_ip(uid)
            print(f'el ip es: {ip_broker}')
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
            print(f'Reinicio de la placa')
            reinicio_dispositivo()
    else:
        print("Error al conectar a la red. Iniciando modo AD...")
        modo_ad_hoc()

time.sleep(2)
main()
