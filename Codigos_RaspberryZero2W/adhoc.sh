sudo mv /etc/dhcpcd.conf /etc/dhcpcd.orig
sudo mv /etc/dhcpcd.orig1 /etc/dhcpcd.conf
#Se desactiva la interfaz inalambrica wlan0
sudo ip link set wlan0 down
#Se detienen los servicios relacionados con la red
sudo systemctl stop wpa_supplicant
sudo systemctl stop dhcpcd
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq
sleep 3
#Se activa la interfaz inalámbrica wlan0
sudo ip link set wlan0 up
#Inicia los servicios realacionados con la red en orden
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl start hostapd
sudo systemctl enable dnsmasq
sudo systemctl start dnsmasq
sudo systemctl restart dhcpcd
sudo systemctl restart wpa_supplicant
#Se da un reinicio en general
sudo systemctl restart networking.service
