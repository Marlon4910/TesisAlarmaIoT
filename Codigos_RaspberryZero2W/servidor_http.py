from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse as urlparse
import os
import time
import subprocess
from firebase import firebase
import threading

urlDB = '' # colocar URL de firebase Database 
UID_FILE_PATH = 'uid.txt'

def obtener_ip_local_comando():
    try:
        resultado = subprocess.check_output(['hostname', '-I'])
        ip_local = resultado.decode('utf-8').strip().split()[0]
        return ip_local
    except Exception as e:
        print(f"Error al obtener la IP local: {e}")
        return None

def verificar_red_disponible(ssid):
    try:
        resultado = subprocess.check_output(['sudo', 'iwlist', 'wlan0', 'scan']).decode('utf-8')
        return ssid in resultado
    except Exception as e:
        print(f"Error al escanear redes WiFi: {e}")
        return False

class MyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global server_should_stop
        parsed_path = urlparse.urlparse(self.path)
        query_params = urlparse.parse_qs(parsed_path.query)
        ssid = query_params.get('ssid', [''])[0]
        psk = query_params.get('password', [''])[0]
        uid = query_params.get('uid', [''])[0]

        if ssid and psk and uid:
            print(f"Recibido SSID: {ssid}, PSK: {psk} y UID: {uid}")
            with open(UID_FILE_PATH, 'w') as file:
                file.write(uid)

            if not verificar_red_disponible(ssid):
                print("La red especificada no está disponible.")
                self.send_response(404)
                self.end_headers()
                self.wfile.write('{"status": "ERROR", "message": "Red no disponible"}'.encode('utf-8'))
                return

            wpa_conf = f"""
            country=EC
            ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
            update_config=1

            network={{
                ssid="{ssid}"
                psk="{psk}"
            }}
            """

            try:
                with open('/etc/wpa_supplicant/wpa_supplicant.conf', 'w') as file:
                    file.write(wpa_conf)

                os.system("sudo sh wifi.sh")
                time.sleep(10)

                result = subprocess.run(['iwgetid'], stdout=subprocess.PIPE).stdout.decode('utf-8')
                if ssid in result:
                    nueva_ip = obtener_ip_local_comando()
                    if nueva_ip:
                        with open(UID_FILE_PATH, 'r') as file:
                            stored_uid = file.read().strip()
                        fb = firebase.FirebaseApplication(urlDB, None)
                        fb.put(f'/{stored_uid}/Configuracion', 'IPCPU', nueva_ip)
                        fb.put(f'/{stored_uid}', 'Alerta', 'Seguro')
                        fb.put(f'/{stored_uid}/Configuracion','modo',0)
                        self.send_response(200)
                        self.end_headers()
                        self.wfile.write('{"status": "OK", "message": "Conexión exitosa y IP subida"}'.encode('utf-8'))
                        server_should_stop = True
                        return
                    else:
                        raise Exception("No se pudo obtener la nueva IP local")
                else:
                    raise Exception("Error de conexión")
            except Exception as e:
                print(f"Error: {e}. Volviendo a modo Adhoc...")
                os.system("sudo sh adhoc.sh")
                self.send_response(500)
                self.end_headers()
                self.wfile.write('{"status": "ERROR", "message": "Error al conectar"}'.encode('utf-8'))
                return
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write('{"status": "ERROR", "message": "Faltan credenciales"}'.encode('utf-8'))
            return

def run(server_class=HTTPServer, handler_class=MyHandler, port=80):
    global server_should_stop
    server_should_stop = False

    ip_actual = obtener_ip_local_comando()
    print(f"IP actual: {ip_actual}")
    if ip_actual != "192.168.4.1":
        print("La IP no es 192.168.4.1. Iniciando modo Adhoc...")
        os.system("sudo sh adhoc.sh")
        time.sleep(10)
        ip_actual = obtener_ip_local_comando()
        print(f"Nueva IP después de Adhoc: {ip_actual}")

    def server_thread():
        with server_class(('', port), handler_class) as httpd:
            print(f'Servidor HTTP corriendo en el puerto {port}...')
            while not server_should_stop:
                httpd.handle_request()

    thread = threading.Thread(target=server_thread)
    thread.start()
    return thread