import { useState } from 'react';
import { Button, Icon, Input, Layout, Text } from "@ui-kitten/components"
import { TouchableWithoutFeedback, useWindowDimensions, Image, Alert } from "react-native";
import { ScrollView } from "react-native-gesture-handler"
import { MyIcon } from "../../components/ui/MyIcon";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ConfigCpuScreen = () => {

  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');

  // Almacena SSID, password de la red que le hemos colocado
  const storeNetworkData = async () => {
    try {
      await AsyncStorage.setItem('networkSSID', ssid);
      await AsyncStorage.setItem('networkPassword', password);
      console.log('Datos de red guardados correctamente');
    } catch (error) {
      console.log('Error al guardar los datos de red:', error);
    }
  };

  // Envia  credecnciales por http
  const sendCredentials = async () => {
    if (!ssid || !password) {
      Alert.alert('Error', 'Por favor ingrese el SSID y la contraseña');
      return;
    }
  
    // Obtienen el UID del almacenamiento local
    const uid = await AsyncStorage.getItem('UserUID');
    
    // Verifica que el UID exista
    if (!uid) {
      Alert.alert('Error', 'UID no encontrado');
      return;
    }
  
    // Incluye el UID en la URL
    const url = `http://192.168.4.1/wifi?ssid=${ssid}&password=${password}&uid=${uid}`;
    console.log('url enviada', url)
  
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json(); // Espera respuesta en JSON
        console.log('Respuesta del servidor:', data);
        Alert.alert('Éxito', 'Credenciales enviadas correctamente');
      } else {
        console.error('Error en la solicitud:', response.statusText);
        Alert.alert('Error', 'Fallo en el envío de credenciales');
      }
    } catch (error) {
      console.error('Se desconecto la red por lo que la CPU logro enlazarse:', error);
      Alert.alert('Éxito', 'Credenciales enviadas correctamente');
    }
  };
  
// Alternar para ver contraseña
  const toggleSecureEntry = (): void => {
    setSecureTextEntry(!secureTextEntry);
  };

  const { height } = useWindowDimensions();

  const renderIcon = (props: any): React.ReactElement => (
    <TouchableWithoutFeedback onPress={toggleSecureEntry}>
      <Icon
        {...props}
        name={secureTextEntry ? 'eye-off' : 'eye'}
      />
    </TouchableWithoutFeedback>
  );
  return (
    <Layout style={{ flex: 1 }}>
      <ScrollView style={{ marginHorizontal: 40 }}>
        <Layout style={{ justifyContent: 'center', alignItems: 'center', paddingTop: height * 0.10 }}>

          {/* Logo */}
          <Image
            source={require('../../../assets/images/raspberry-logo-raspberry-pi-svgrepo-com.png')}
            style={{ width: 200, height: 200, marginBottom: 10 }}
            resizeMode="contain"
          />

          <Text style={{ textAlign: 'center' }} category="h3">Configuración de red</Text>
          <Text style={{ textAlign: 'center' }} category="c2">Por favor, ingrese los siguientes datos de su red para continuar</Text>
        </Layout>

        {/* Ingreso de credenciales: SSID */}
        <Layout style={{ marginTop: 20 }}>
          <Input
            placeholder="SSID"
            autoCapitalize="none"
            accessoryLeft={<MyIcon name="globe" />}
            style={{ marginBottom: 10 }}
            onChangeText={(val) => setSsid(val)}
          />
          <Input
            placeholder="Contraseña"
            autoCapitalize="none"
            secureTextEntry={secureTextEntry}
            accessoryLeft={<MyIcon name="lock-outline" />}
            accessoryRight={renderIcon}
            style={{ marginBottom: 10 }}
            onChangeText={(val) => setPassword(val)}
          />

          {/* Button */}
          <Layout>
            <Button
              accessoryRight={<MyIcon name="cloud-upload" white />}
              onPress={() => {
                storeNetworkData(); // Llama a la función para almacenar datos de red
                sendCredentials(); // Llama a la función para enviar las credenciales
              }}
            // appearance="fille"
            >
              Enviar
            </Button>
          </Layout>



        </Layout>
      </ScrollView>
    </Layout>
  )
}