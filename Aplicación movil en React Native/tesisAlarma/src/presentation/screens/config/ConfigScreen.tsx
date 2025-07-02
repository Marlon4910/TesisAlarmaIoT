import React, { useState } from 'react';
import { Icon, IconElement, List, ListItem, Text, Button, Modal, Layout, Card, Drawer, DrawerItem, IndexPath } from '@ui-kitten/components';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { MyIcon } from "../../components/ui/MyIcon";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParams } from '../../navigation/StackNavigator';
import { signOutt } from '../../../actions/authFirebase';
import { getAlarmMode } from '../../../infrastructure/modo/modo.status'
import { PermissionsAndroid, Platform } from 'react-native';
import { NetworkInfo } from 'react-native-network-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ConfigScreenNavigationProp = StackNavigationProp<RootStackParams, 'ConfigScreen'>;

interface IListItem {
    title: string;
    description: string;
    icon: string;
    screen?: keyof RootStackParams;
}

// Lista para generar nuevos items en pantalla
const data: IListItem[] = [
    { title: 'Configuración de red', description: 'Envio de credenciales a central de procesamiento', icon: 'wifi', screen: 'ConfigCpuScreen' },
    { title: 'Configurar nuevo sensor', description: 'Agregar sensor al sistema', icon: 'plus-circle' },
    // { title: 'Configurar tiempo de sirena', description: 'Configuración de tiempo de sirena', icon: 'volume-up-outline' },
    { title: 'Reinicio de fábrica', description: 'Restaurar el dispositivo a su configuración original', icon: 'sync' },
    { title: 'Cerrar sesión', description: 'Finaliza tu sesión actual', icon: 'log-out' },
];


export const ConfigScreen = (): React.ReactElement => {
    const navigation = useNavigation<ConfigScreenNavigationProp>();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(new IndexPath(0));
    const [selectedTitle, setSelectedTitle] = React.useState('Interior');
    const [location, setLocation] = useState<string>('interior');
    const [sensorId, setSensorId] = useState('');

    // Función para recuperar las credenciales de AsyncStorage
    const getStoredWifiCredentials = async () => {
        try {
            const ssid = await AsyncStorage.getItem('networkSSID');
            const password = await AsyncStorage.getItem('networkPassword');
            const uid = await AsyncStorage.getItem('UserUID');

            if (ssid !== null && password !== null && uid !== null) {
                return { ssid, password, uid };
            } else {
                console.log('No hay credenciales de WiFi almacenadas');
                Alert.alert(
                    "Credenciales no encontradas",
                    "No se encontraron credenciales de WiFi almacenadas. ¿Deseas configurarlas ahora?",
                    [
                        {
                            text: "Cancelar",
                            style: "cancel"
                        },
                        {
                            text: "Aceptar",
                            onPress: () => navigation.navigate('ConfigRedScreen')
                        }
                    ]
                );
                return null;
            }
        } catch (error) {
            console.error('Error al recuperar las credenciales de WiFi:', error);
            Alert.alert(
                "Error",
                "Ocurrió un error al recuperar las credenciales",
                [
                    {
                        text: "OK",
                        onPress: () => navigation.navigate('ConfigCpuScreen')
                    }
                ]
            );
            return null;
        }
    };

    // Envio de datos de red a los modulos sensores por http
    const sendStoredWifiCredentials = async (location: string | null) => {
        try {
            // Obtener credenciales de WiFi y sensorId almacenado
            const credentials = await getStoredWifiCredentials();
            let sensorId = await AsyncStorage.getItem('SensorId');

            if (credentials && sensorId) {
                const { ssid, password, uid } = credentials;
                const url = `http://192.168.4.1/wifi?ssid=${ssid}&password=${password}&sensorid=${sensorId}&uid=${uid}&location=${location}`;
                console.log('UrlEnviado:', url);

                // Enviar solicitud
                const response = await fetch(url);

                if (response.ok) {
                    console.log('Credenciales WiFi enviadas correctamente');
                    Alert.alert('Credenciales enviadas');

                    // Incrementa el sensorId y guardar en AsyncStorage
                    const newSensorId = (parseInt(sensorId) + 1).toString();
                    await AsyncStorage.setItem('SensorId', newSensorId);
                } else {
                    console.log('Error al enviar las credenciales');
                }
            } else {
                console.log('No se encontraron credenciales para enviar o sensorId no está definido');
            }
        } catch (error) {
            console.error('Error al enviar las credenciales WiFi:', error);
        }
    };

    const getSensorId = async () => {
        const id = await AsyncStorage.getItem('SensorId');
        if (id) setSensorId(id);
    };

    const onInteriorPress = (): void => {
        setLocation('interior'); // Actualiza la ubicación a "Interior"
        setSelectedTitle('Interior');
    };
    const onExteriorPress = (): void => {
        setLocation('exterior'); // Actualiza la ubicación a "Exterior"
        setSelectedTitle('Exterior');
    };

    const toggleModal = () => {
        getSensorId();
        setIsModalVisible(!isModalVisible);
    };
  //Conceder permisos para ingreso
    const requestLocationPermission = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Permiso de Ubicación',
                    message: 'La app necesita acceder a la ubicación para verificar la red WiFi',
                    buttonNeutral: 'Preguntar Luego',
                    buttonNegative: 'Cancelar',
                    buttonPositive: 'Aceptar',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };
    //Chequeo si se esta conectado a RedAlarma para ingreso de envio de credenciales
    const checkNetworkConfigCpu = async (screen: keyof RootStackParams) => {
        const hasLocationPermission = await requestLocationPermission();
        if (hasLocationPermission) {
            NetworkInfo.getSSID().then(ssid => {
                if (ssid === 'RedAlarma') {
                    navigation.navigate(screen as any);
                } else if (ssid === '<unknown ssid>') {
                    Alert.alert('Ubicación no encendida', 'Por favor, enciende la ubicación para continuar')
                } else {
                    console.log('ssid' + ssid)
                    Alert.alert('No estas en  la red de la CPU', 'Por favor, debes estar conectado a la red "RedAlarma" para acceder a esta función.')
                };
            });
        } else {
            Alert.alert('Permiso Necesario', 'Se necesita permiso de ubicación para verificar la red WiFi.');
        }
    };
    //Chequeo si se esta conectado a PICO-NETWORK para ingreso de envio de credenciales
    const checkNetworkConfigSensor = async () => {
        const hasLocationPermission = await requestLocationPermission();
        if (hasLocationPermission) {
            NetworkInfo.getSSID().then(ssid => {
                if (ssid === 'PICO-NETWORK') {
                    const currentMode = getAlarmMode();
                    console.log('El current modo es ', currentMode);
                    (currentMode === 1 || currentMode === 2) ? Alert.alert("Modo Bloqueado", "No puedes configurar nuevos sensores en modo Exterior o Completo.") : (console.log('Es 0'), toggleModal());
                } else if (ssid === '<unknown ssid>') {
                    Alert.alert('Ubicación no encendida', 'Por favor, enciende la ubicación para continuar')
                } else {
                    console.log('ssid' + ssid)
                    Alert.alert('No estas en  la red del sensor', 'Por favor, debes estar conectado a la red "PICO-NETWORK" para acceder a esta función.')
                };
            });
        } else {
            Alert.alert('Permiso Necesario', 'Se necesita permiso de ubicación para verificar la red WiFi.');
        }
    };

    // Renderizacion de lista para acceso a pantallas
    const renderItemAccessory = (item: IListItem): React.ReactElement => (
        <TouchableOpacity
            onPress={() => {
                if (item.screen) {
                    if (item.title === 'Configuración de red') {
                        navigation.navigate(item.screen as any);
                    }
                } else if (item.title === 'Configurar nuevo sensor') {
                    const currentMode = getAlarmMode();
                    console.log('El current modo es ', currentMode);
                    (currentMode === 1 || currentMode === 2) ? Alert.alert("Modo Bloqueado", "No puedes configurar nuevos sensores en modo Exterior o Completo.") : (console.log('Es 0'), toggleModal());
                } else if (item.title === 'Cerrar sesión') {
                    MostarAlertaSesion();
                } else if (item.title === 'Reinicio de fábrica') {
                    MostarAlertaReinicio();
                }
            }}
        >
            <MyIcon name="arrow-ios-forward-outline" color="color-primary-500" />
        </TouchableOpacity>
    );


    const renderItemIcon = (props: any, iconName: string): IconElement => (
        <Icon
            {...props}
            name={iconName}
        />
    );

    const renderItem = ({ item }: { item: IListItem }): React.ReactElement => (
        <ListItem
            title={item.title}
            description={item.description}
            accessoryLeft={(props) => renderItemIcon(props, item.icon)}
            accessoryRight={() => renderItemAccessory(item)}
            onPress={() => {
                if (item.title === 'Configurar nuevo sensor') {
                    checkNetworkConfigSensor();
                } else if (item.screen) {
                    if (item.title === 'Configuración de red') {
                        checkNetworkConfigCpu(item.screen);
                    } else {
                        navigation.navigate(item.screen as any);
                    }
                } else if (item.title === 'Cerrar sesión') {
                    MostarAlertaSesion();
                } else if (item.title === 'Reinicio de fábrica') {
                    MostarAlertaReinicio();
                }
            }}
        />
    );

    //Alerta para cierre de sesion 
    const MostarAlertaSesion = () => {
        Alert.alert(
            "Confirmación",
            "¿Estás seguro de cerrar sesión?",
            [
                {
                    text: "Cancelar",
                    onPress: () => console.log("Cancelado"),
                    style: "cancel" // Aplica estilo de cancelación
                },
                {
                    text: "Sí",
                    onPress: () => handleSignOut()
                }
            ],
            { cancelable: false }
        );
    };
    //Alerta de reinicio de dispositivo
    const MostarAlertaReinicio = () => {
        Alert.alert(
            "Confirmación",
            "¿Estás seguro reiniciar el dispositivo?",
            [
                {
                    text: "Cancelar",
                    onPress: () => console.log("Cancelado"),
                    style: "cancel" // Aplica estilo de cancelación
                },
                {
                    text: "Sí",
                    onPress: () => { navigation.navigate('ResetScreen') }
                }
            ],
            { cancelable: false }
        );
    };

    //Manejo de cierre de sesion
    const handleSignOut = async () => {
        try {
            await signOutt();
            await AsyncStorage.clear();
            // sendTestNotification(),
            navigation.navigate('LoginScreen');

        } catch (error) {
            console.error('Error al cerrar sesión', error);
        }
    };

    return (
        <>
            <List
                style={styles.container}
                data={data}
                renderItem={renderItem}
            />
            <Layout level='1'>

                <Modal
                    backdropStyle={styles.backdrop}
                    visible={isModalVisible}
                    style={styles.modalContent}
                    animationType='fade'
                // hardwareAccelerated
                >
                    <Card style={styles.card} disabled={true}>
                        <Text style={{ textAlign: 'center' }} category='s1'>
                            Por favor, selecciona la ubicacion del sensor {sensorId}:{selectedTitle}
                        </Text>
                        <Drawer
                            selectedIndex={selectedIndex}
                            onSelect={index => setSelectedIndex(index)}
                        >
                            <DrawerItem title='Interior' accessoryLeft={<MyIcon name="collapse" />} onPress={onInteriorPress} />
                            <DrawerItem title='Exterior' accessoryLeft={<MyIcon name="expand" />} onPress={onExteriorPress} />
                        </Drawer>
                        <Layout style={styles.buttonContainer}>
                            <Button style={styles.closeButton} status='danger' onPress={toggleModal} accessoryRight={<MyIcon name="close" white />}>
                                Cancelar
                            </Button>
                            <Button style={styles.closeButton}
                                onPress={() => {
                                    toggleModal(); // Cierra el modal
                                    sendStoredWifiCredentials(location); // Llama a la función con la ubicación
                                }}
                                accessoryRight={<MyIcon name="cloud-upload" white />}>
                                Enviar
                            </Button>
                        </Layout>
                    </Card>
                </Modal>

            </Layout >
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: 192,
    },
    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        // height:'20%',
        backgroundColor: 'white',
        borderRadius: 20,
        alignItems: 'center',
    },
    closeButton: {
        marginTop: 10,
        flex: 1,
        marginHorizontal: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 1,
    },
    card: {
        width: '100%',
        height: '100%',
        padding: 20,
        borderRadius: 20,
    }
});
