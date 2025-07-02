import RPi.GPIO as GPIO
import time
import datetime

def setup():
    """
    Funcion que configura los pines GPIO que se usaran para la activación de la sirena
    """
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(17, GPIO.OUT)
    GPIO.output(17, GPIO.LOW)

def activar_sirena():
    """
    Función que coloca la salina en alto del pin GIO 17 de la sirena
    """
    GPIO.output(17, GPIO.HIGH)
    #Obtención de la hora actual en UTC al activar la sirena
    now = datetime.datetime.utcnow()
    current_time = now.time().isoformat(timespec='seconds')
    print(f"{current_time}")


def desactivar_sirena():
    """
    Función que coloca la salina en bajo del pin GIO 17 de la sirena
    """
    GPIO.output(17, GPIO.LOW)

def cleanup():
    """
    Función que limpia los pines GPIO cuando se necesita terminar la ejecución del codigo.
    """
    GPIO.cleanup()

# Bloque de inicialización
setup()
