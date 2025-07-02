# Cambio de nombre de el archivo dhcpcd.conf original
sudo mv /etc/dhcpcd.conf /etc/dhcpcd.orig1

# Remplazo
sudo mv /etc/dhcpcd.orig /etc/dhcpcd.conf

# Detener el servicio hostapd (para configurar el punto de acceso)
sudo systemctl stop hostapd

# Deshabilitar el servicio hostapd para que no se inicie automáticamente
sudo systemctl disable hostapd

# Detener el servicio dnsmasq (para la gestión de DNS y DHCP)
sudo systemctl stop dnsmasq

# Deshabilitar el servicio dnsmasq
sudo systemctl disable dnsmasq

# Reiniciar el servicio dhcpcd para aplicar cambios
sudo systemctl restart dhcpcd

# Reiniciar el servicio wpa_supplicant (para la gestión de conexiones WiFi)
sudo systemctl restart wpa_supplicant

# Desbloquear la interfaz WLAN
sudo rfkill unblock wlan

# Desactivar la interfaz WLAN
sudo ip link set wlan0 down

# Activamos nuevamente la interfaz WLAN
sudo ip link set wlan0 up

sleep 3

# Reiniciar el servicio de networking
sudo systemctl restart networking.service