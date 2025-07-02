import React, { useEffect, useState } from 'react';
import { Text, Layout, Icon, Modal, Button, Card, Drawer, DrawerItem, IndexPath, Input } from '@ui-kitten/components';
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParams } from "../../navigation/StackNavigator";
import PushNotification from 'react-native-push-notification';
import { StyleSheet, TouchableOpacity, Animated, Easing, Linking, Alert } from 'react-native';
import { MyIcon, MyRIcon } from "../../components/ui/MyIcon";
import { updateSirenStatusIn, updateAlarmMode } from '../../../actions/actionsHomeScreen';
import { setAlarmMode } from '../../../infrastructure/modo/modo.status'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../../../actions/authFirebase';
import { ref, onValue, get, set, getDatabase } from 'firebase/database';
import NetInfo from '@react-native-community/netinfo';
import Ricon from 'react-native-vector-icons/MaterialCommunityIcons';
import messaging from '@react-native-firebase/messaging';

interface Props extends StackScreenProps<RootStackParams, 'HomeScreen'> { }

// Define la estructura de cada elemento del historial
export type HistorialItem = {
  fecha: string;
  hora: string;
  mensaje: string;
};

export const HomeScreen = ({ navigation }: Props) => {

  const [estado, setEstado] = useState('Cargando...');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(new IndexPath(0));
  const [boxColor, setBoxColor] = useState('#E0E0E0');
  const [Alicon, setAlicon] = useState('wifi-off-outline');
  const [Alcolor, setAlcolor] = useState('white')
  const [opacity] = useState(new Animated.Value(0));
  const [isAlertModalVisible, setAlertModalVisible] = useState(false);
  const [isModalVisible2, setIsModalVisible2] = useState(false);
  const [isAddContactModalVisible, setIsAddContactModalVisible] = useState(false);
  const [isEditContactModalVisible, setIsEditContactModalVisible] = useState(false);
  const [isDisconnectedModalVisible, setDisconnectedModalVisible] = useState(false);
  const [disconnectedMessage, setDisconnectedMessage] = useState('');
  const [selectedIndex2, setSelectedIndex2] = useState(new IndexPath(0));
  const [contacts, setContacts] = useState([{ name: 'Emergencias', number: '911', isPredefined: true }]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [editContactIndex, setEditContactIndex] = useState<number | null>(null);
  const [modo, setModo] = useState<number>();

  // Obtiene el sensor ID del firebase
  useEffect(() => {
    const fetchSensorId = async () => {
      try {
        const uid = await AsyncStorage.getItem('UserUID');
        if (!uid) return;

        // Obtener sensorId de Firebase
        const sensorRef = ref(database, `${uid}/Configuracion/Nsensores`);
        const snapshot = await get(sensorRef);
        const firebaseSensorId = snapshot.exists() ? Number(snapshot.val()) : 1;

        // Obtener sensorId de AsyncStorage
        const storedSensorId = Number(await AsyncStorage.getItem('SensorId')) || 0;

        // Tomar el mayor de los dos valores
        const finalSensorId = Math.max(firebaseSensorId, storedSensorId);

        // Actualizar AsyncStorage solo si es necesario
        if (finalSensorId !== storedSensorId) {
          await AsyncStorage.setItem('SensorId', finalSensorId.toString());
        }

        console.log(`ID del sensor actualizado: ${finalSensorId}`);
      } catch (error) {
        console.error('Error al actualizar el ID del sensor:', error);
        // Establecer valor por defecto en caso de error
        await AsyncStorage.setItem('SensorId', '1');
      }
    };

    fetchSensorId();
  }, []);

  // Recupera el modo de alarma de firebase
  useEffect(() => {
    const fetchAlarmMode = async () => {
      try {
        const uid = await AsyncStorage.getItem('UserUID');
        if (!uid) {
          console.warn('No se encontró el UserUID en AsyncStorage');
          return;
        }

        // 1. Obtener el modo actual desde Firebase
        const modeRef = ref(database, `${uid}/Configuracion/modo`);
        const snapshot = await get(modeRef);

        // Valor por defecto: 0 (Modo Configuración) si no existe en Firebase
        const firebaseMode = snapshot.exists() ? Number(snapshot.val()) : 0;

        // 2. Guardar en AsyncStorage (siempre actualiza con el valor de Firebase)
        await AsyncStorage.setItem('ModoAlarma', firebaseMode.toString());
        // 3. Establece el modo de alarma
        setModo(firebaseMode);
        setAlarmMode(firebaseMode);

        console.log(`Modo de alarma actualizado desde Firebase:(${firebaseMode})`);

      } catch (error) {
        console.error('Error al sincronizar el modo de alarma:', error);
        // Valores por defecto
        setModo(0);
        setAlarmMode(0);
        await AsyncStorage.setItem('ModoAlarma', '0');
      }
    };

    fetchAlarmMode();
  }, []);

  //Actualiza el token del dispositivo
  useEffect(() => {
    const updateToken = async () => {
      try {
        // Obtiene el token actual de FCM
        const token = await messaging().getToken();

        // Obtiene el token previamente almacenado
        const storedToken = await AsyncStorage.getItem('FCMToken');

        if (token !== storedToken) {
          console.log('Token actualizado:', token);

          // Obtiene el UID del usuario
          const uid = await AsyncStorage.getItem('UserUID');

          if (uid) {
            // Guarda el nuevo token en Firebase
            await set(ref(database, `${uid}/Configuracion/tokenFCM`), token);

            // Almacena el token en AsyncStorage
            await AsyncStorage.setItem('FCMToken', token);

            console.log('Token actualizado en Firebase y AsyncStorage');
          } else {
            console.error('UID no encontrado');
          }
        } else {
          console.log('El token no ha cambiado, no se envió a Firebase.');
        }
      } catch (error) {
        console.error('Error al actualizar el token:', error);
      }
    };

    updateToken();
  }, []);

  // Actualiza el cuadro de estado de alarma con los mensajes de alerta de firebase
  useEffect(() => {
    const fetchUIDAndSubscribe = async () => {
      try {
        const uid = await AsyncStorage.getItem('UserUID');
        if (!uid) {
          console.warn('UID no encontrado en AsyncStorage');
          return;
        }

        const alertaRef = ref(database, `${uid}/Alerta`);
        const unsubscribe = onValue(alertaRef, (snapshot) => {
          const alertValue = snapshot.val();

          if (alertValue === 'Seguro') {
            setEstado('Todo está seguro');
            setBoxColor('#4CAF50'); // Verde
            setAlicon('lock-outline');
            setAlcolor('white');
            setAlertModalVisible(false);
          } else if (alertValue?.includes('Se ha activado')) {
            const sensor = alertValue.split('/')[0];
            const mensaje = `${sensor} se ha activado`;
            setEstado(mensaje);
            setBoxColor('#F44336'); // Rojo
            setAlicon('alert-circle-outline');
            setAlcolor('white');
            setAlertModalVisible(true);
            setDisconnectedModalVisible(false);
          } else if (alertValue?.includes('Se ha desconectado')) {
            const sensor = alertValue.split('/')[0];
            const mensaje = `${sensor} se ha desconectado`;
            setEstado(mensaje);
            setBoxColor('#f4d03f'); // Amarillo
            setAlicon('wifi-off-outline');
            setAlcolor('black');
            // Mostrar el modal con el mensaje
            setDisconnectedMessage(mensaje);
            setDisconnectedModalVisible(true);
          } else if (alertValue?.includes('Falta configurar la CPU')) {
            const mensaje = `Falta configurar la CPU`;
            setEstado(mensaje);
            setBoxColor('#bb8fce'); // Morado
            setAlcolor('settings-2-outline');
            setAlcolor('white');
          } else {
            setEstado('Estado desconocido');
            setBoxColor('#E0E0E0'); // Blanco si esta desconectado
          }
        });

        return () => unsubscribe(); // Limpia la suscripción al desmontar
      } catch (error) {
        console.error('Error al obtener el UID o suscribirse a Firebase:', error);
      }
    };

    fetchUIDAndSubscribe();
  }, []);


  //Mostrar modal, en caso de no tener acceso a la red mostrar sin conexion
  const toggleModal = async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected || !state.isWifiEnabled) {
      Alert.alert('Sin conexión', 'No estás conectado a una red WiFi.');
      return;
    }
    setIsModalVisible(!isModalVisible);
  };

  //Mostar modales
  const toggleModal2 = () => setIsModalVisible2(!isModalVisible2);
  const toggleAddContactModal = () => setIsAddContactModalVisible(!isAddContactModalVisible);
  const toggleEditContactModal = () => setIsEditContactModalVisible(!isEditContactModalVisible);

  // Manejo de sirena
  const handleAlertaSirena = async () => {
    try {
      const uid = await AsyncStorage.getItem('UserUID');
      if (uid) {
        console.warn('UID no encontrado en AsyncStorage');
        const newMensaje = 'Seguro';
        await set(ref(database, `${uid}/Alerta`), newMensaje);
        const storedMode = await AsyncStorage.getItem('ModoAlarma');
        if (storedMode != null) {
          const storedModeNumber = parseInt(storedMode, 10);

          if (storedModeNumber !== 10 && storedModeNumber !== 11) {
            await set(ref(database, `${uid}/Configuracion/modo`), storedModeNumber);
          } else {
            setModo(0);
            updateAlarmMode(0);
            await set(ref(database, `${uid}/Configuracion/modo`), 0);
          }

          setAlertModalVisible(false);
        }

      } else {
        console.error('UID no encontrado');
        return;
      }
    } catch (error) {
      console.error('No se pudo Alertar a la Sirena');
    }

  }

  // Mostrar boton Información y Configuración al mantener pulsado
  const handlePressInF = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 1000,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  // Envia directamente a realizar la llamada
  const handleCalls = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  // Manejo de nuevo contacto
  const handleAddContact = () => {
    if (newContactName && newContactNumber) {
      setContacts([...contacts, { name: newContactName, number: newContactNumber, isPredefined: false }]);
      setNewContactName('');
      setNewContactNumber('');
      toggleAddContactModal();
    }
  };
  //Manejo de edicion de contactos
  const handleEditContact = () => {
    if (editContactIndex !== null) {
      const updatedContacts = [...contacts];
      updatedContacts[editContactIndex] = {
        ...updatedContacts[editContactIndex],
        name: newContactName,
        number: newContactNumber,
      };
      setContacts(updatedContacts);
      setEditContactIndex(null);
      setNewContactName('');
      setNewContactNumber('');
      toggleEditContactModal();
    }
  };
  //Manejo de borrar contacto
  const handleDeleteContact = () => {
    if (editContactIndex !== null) {
      const updatedContacts = contacts.filter((_, index) => index !== editContactIndex);
      setContacts(updatedContacts);
      setEditContactIndex(null);
      toggleEditContactModal();
    }
  };

  //Envio de notificaicones de manera local, en este caso accionamiento de boton de panico
  const sendTestNotification = () => {
    PushNotification.localNotification({
      channelId: "test-channel", // tiene que ser el mismo canal ID
      title: "Botón de pánico activado",
      message: "Haz activado el botón de pánico",
      // bigPictureUrl: "https://cdn-icons-png.flaticon.com/512/994/994909.png",
    });
  };
  // manejo mensaje de esconexion de sensores
  const handleOmitirDisconection = async () => {
    const uid = await AsyncStorage.getItem('UserUID');
    const db = getDatabase();
    const alertaRef = ref(db, `/${uid}/Alerta`);
    set(alertaRef, 'Seguro')
      .then(() => {
        console.log('Alerta actualizada a "Seguro"');
        setDisconnectedModalVisible(false);
      })
      .catch((error) => {
        console.error('❌ Error al actualizar la alerta:', error);
      });
  };
  return (
    <Layout style={styles.container}>
      {/* Icono de Configuración en la esquina superior derecha */}
      <TouchableOpacity
        style={styles.iconButton}
        onLongPress={handlePressInF}
        onPressOut={handlePressOut}
        onPress={() => navigation.navigate('ConfigScreen')}

      >
        <MyIcon name="settings-2-outline" />
        <Animated.Text style={[styles.tooltip, { opacity }]}>
          Config.
        </Animated.Text>
      </TouchableOpacity>

      {/* Icono de Configuración en la esquina superior izquierda */}

      <TouchableOpacity
        style={styles.iconButton2}
        onLongPress={handlePressInF}
        onPressOut={handlePressOut}
        onPress={() => navigation.navigate('HelpScreen')}
      >
        <MyIcon name="question-mark-circle-outline" />
        <Animated.Text style={[styles.tooltip2, { opacity }]}>
          Inf.
        </Animated.Text>
      </TouchableOpacity>

      {/* Mensaje en reacuadro de modo actual */}
      <Layout style={[styles.estadoBox, { backgroundColor: boxColor }]}>
        <Text style={styles.estadoText} category='h3'>{estado}</Text>
        <Icon name={Alicon} fill={Alcolor} style={{ width: 100, height: 100, paddingTop: 40 }} ></Icon>
        <Text style={styles.modeText} category='h6'>
          {modo === 0
            ? 'Modo Configuración'
            : modo === 1
              ? 'Modo Exteriores'
              : modo === 2
                ? 'Modo Armado Completo'
                : modo === 10
                  ? 'Modo Alerta'
                  : modo === 11
                    ? 'Modo Dispositivo Reiniciado'
                    : `Modo desconocido`}
        </Text>
      </Layout>
      
      {/* Botones superiores */}
      <Layout style={styles.configBox}>
        <TouchableOpacity style={[styles.newBox, styles.box1]} onPress={toggleModal}>
          <Text style={styles.boxText} category='h5'>Modo de alarma</Text>
          <Icon name='options' fill='white' style={{ width: 50, height: 50, paddingTop: 50 }} ></Icon>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.newBox, styles.box2]} onPress={() => navigation.navigate('SensorsList')}>
          <Text style={styles.boxText} category='h5' >Lista de sensores</Text>
          <Icon name='list' fill='white' style={{ width: 50, height: 50, paddingTop: 50 }} ></Icon>
        </TouchableOpacity>
      </Layout>

      {/* Botones inferiores */}
      <Layout style={styles.configBox2}>
        <TouchableOpacity style={[styles.newBox2, styles.box3]} onPress={() => navigation.navigate('HistorialScreen')}>
          <Text style={styles.boxText} category='h5'>Historial</Text>
          <Icon name='clipboard' fill='white' style={{ width: 50, height: 50, paddingTop: 75 }} ></Icon>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.newBox2, styles.box4]} onPress={toggleModal2}>
          <Text style={styles.boxText} category='h5' >Contacto</Text>
          <Icon name='phone-call' fill='white' style={{ width: 50, height: 50, paddingTop: 75 }} ></Icon>
        </TouchableOpacity>
      </Layout>

      {/* Boton de panico */}
      <Layout style={styles.circleBox}>
        <TouchableOpacity style={styles.centerCircle} onLongPress={() => [updateSirenStatusIn(10), sendTestNotification()]}
          onPressOut={async () => {
            try {
              const modeString = await AsyncStorage.getItem('Mode');
              // Validar si modeString no es nulo antes de parsearlo
              if (modeString !== null && modeString !== '10') {
                const mode = parseInt(modeString, 10);
                updateSirenStatusIn(mode);
              } else {
                updateSirenStatusIn(0);
              }
            } catch (error) {
              console.error('Error al obtener el modo de AsyncStorage:', error);
            }
          }}>
          <Text style={styles.centerText} category='h4'>SOS</Text>
          <Ricon name='alarm-light' color='white' size={50}></Ricon>
        </TouchableOpacity>
      </Layout>

      {/* Modal de configuracion de modo de alarma */}
      <Modal
        backdropStyle={styles.backdrop}
        visible={isModalVisible}
        style={styles.modalContent}
        animationType='fade'
        onBackdropPress={() => toggleModal()}
      >
        <Card style={styles.card} disabled={true}>
          <Text style={{ textAlign: 'center' }} category='s1'>
            Por favor, selecciona el modo de alarma:
          </Text>
          <Drawer
            selectedIndex={selectedIndex}
            onSelect={index => setSelectedIndex(index)}
          >
            <DrawerItem title='Modo Configuración' accessoryLeft={<MyIcon name="settings" />} />
            <DrawerItem title='Modo Exteriores' accessoryLeft={<MyIcon name="shield-off" />} />
            <DrawerItem title='Modo Armado Completo' accessoryLeft={<MyIcon name="shield" />} />
          </Drawer>
          <Layout style={styles.buttonContainer}>
            <Button style={styles.closeButton} status='danger' onPress={toggleModal} accessoryRight={<MyIcon name="close" white />}>
              Cancelar
            </Button>
            <Button
              style={styles.closeButton}
              onPress={async () => {
                const mode = selectedIndex.row; // 0 para configuración, 1 para exterior, 2 para completo
                await AsyncStorage.setItem('ModoAlarma', mode.toString());
                setAlarmMode(mode);
                setModo(mode)
                updateAlarmMode(mode);
                console.log('Modo seleccionado:', mode);
                toggleModal();
              }}
              accessoryRight={<MyIcon name="checkmark" white />}
            >
              Confirmar
            </Button>
          </Layout>
        </Card>
      </Modal>

      {/* Modal de llamadas */}
      <Modal
        backdropStyle={styles.backdrop}
        visible={isModalVisible2}
        style={styles.modalContent}
        animationType="fade"
        onBackdropPress={() => toggleModal2()}
      >
        <Card style={styles.card} disabled={true}>
          <Layout style={styles.headerContainer}>
            <Text style={{ textAlign: 'center' }} category="s1">
              Por favor, selecciona el número a llamar:
            </Text>
            <Button
              // size="tiny"
              appearance="ghost"
              status="primary"
              onPress={toggleAddContactModal}
            >
              + Añadir Contacto
            </Button>
          </Layout>
          <Drawer
            selectedIndex={selectedIndex2}
            onSelect={(index) => setSelectedIndex2(index)}
          >
            {contacts.map((contact, index) => (
              <DrawerItem
                key={index}
                title={contact.name}
                accessoryLeft={
                  contact.isPredefined ? (
                    <MyRIcon name="ambulance" />
                  ) : (
                    <MyRIcon name="account" />
                  )
                }
                accessoryRight={
                  contact.isPredefined ? (
                    <TouchableOpacity>

                    </TouchableOpacity>
                  ) : (
                    <Button
                      accessoryRight={<MyIcon name="more-vertical-outline" />}
                      size="tiny"
                      appearance="ghost"
                      onPress={() => {
                        setEditContactIndex(index);
                        setNewContactName(contact.name);
                        setNewContactNumber(contact.number);
                        toggleEditContactModal();
                      }}
                    >
                    </Button>
                  )
                }
              />
            ))}
          </Drawer>
          <Layout style={styles.buttonContainer}>
            <Button
              style={styles.closeButton}
              status="danger"
              onPress={toggleModal2}
              accessoryRight={<MyIcon name="close" white />}
            >
              Cancelar
            </Button>
            <Button
              style={styles.closeButton}
              onPress={() => {
                const selectedContact = contacts[selectedIndex2.row];
                handleCalls(selectedContact ? selectedContact.number : '911');
                toggleModal2();
              }}
              status="success"
              accessoryRight={<MyIcon name="phone-call-outline" white />}
            >
              Llamar
            </Button>
          </Layout>
        </Card>
      </Modal>

      {/* Modal para añadir contacto */}
      <Modal
        backdropStyle={styles.backdrop}
        visible={isAddContactModalVisible}
        style={styles.modalContent}
        animationType="fade"
      >
        <Card style={styles.card} disabled={true}>
          <Text style={{ textAlign: 'center' }} category="s1">
            Añadir nuevo contacto
          </Text>
          <Input
            style={styles.input}
            placeholder="Nombre"
            value={newContactName}
            onChangeText={setNewContactName}
          />
          <Input
            style={styles.input}
            placeholder="Número"
            value={newContactNumber}
            onChangeText={setNewContactNumber}
            keyboardType="phone-pad"
          />
          <Layout style={styles.buttonContainer}>
            <Button
              style={styles.closeButton}
              status="danger"
              onPress={toggleAddContactModal}
              accessoryRight={<MyIcon name="close" white />}
            >
              Cancelar
            </Button>
            <Button
              style={styles.closeButton}
              onPress={handleAddContact}
              status="success"
              accessoryRight={<MyIcon name="checkmark" white />}
            >
              Guardar
            </Button>
          </Layout>
        </Card>
      </Modal>

      {/* Modal para editar/eliminar contacto */}
      <Modal
        backdropStyle={styles.backdrop}
        visible={isEditContactModalVisible}
        style={styles.modalContent}
        animationType="fade"
      >
        <Card style={styles.card} disabled={true}>
          <Text style={{ textAlign: 'center' }} category="s1">
            Editar contacto
          </Text>
          <Input
            style={styles.input}
            placeholder="Nombre"
            value={newContactName}
            onChangeText={setNewContactName}
          />
          <Input
            style={styles.input}
            placeholder="Número"
            value={newContactNumber}
            onChangeText={setNewContactNumber}
            keyboardType="phone-pad"
          />
          <Layout style={styles.buttonContainer}>
            <Button
              style={styles.closeButton}
              status="danger"
              onPress={handleDeleteContact}
              accessoryRight={<MyIcon name="trash" white />}
            >
              Eliminar
            </Button>
            <Button
              style={styles.closeButton}
              status="success"
              onPress={handleEditContact}
              accessoryRight={<MyIcon name="checkmark" white />}
            >
              Editar
            </Button>
          </Layout>
        </Card>
      </Modal>

      {/* Modal para mostrar alerta de sirena*/}
      <Modal
        backdropStyle={styles.backdrop}
        visible={isAlertModalVisible}
        animationType="fade"
      >
        <Card disabled={true} style={styles.card}>
          <Text category="h6" style={styles.modalTitle}>
            {estado}
          </Text>
          <Text style={styles.modalSubtitle}>¿Qué deseas realizar?</Text>
          <Layout style={styles.modalButtons}>
            <Button
              style={styles.modalButton}
              status="danger"
              onPress={handleAlertaSirena}
            >
              Apagar sirena
            </Button>
            <Button
              style={styles.modalButton}
              status="success"
              onPress={toggleModal2}
            >
              Contactos
            </Button>
          </Layout>
        </Card>
      </Modal>
      
      {/* Modal de desconexion de sensores */}
      <Modal
        backdropStyle={styles.backdrop}
        visible={isDisconnectedModalVisible}
        animationType="fade"
      >
        <Card disabled={true} style={styles.card}>
          <Text category="h6" style={styles.modalTitle}>
            {disconnectedMessage}
          </Text>
          <Text style={styles.modalSubtitle}>
            Asegúrate de que el sensor esté encendido y tenga buena señal Wi-Fi. Revisa su estado en la lista de sensores.
          </Text>
          <Layout style={styles.modalButtons}>
            <Button
              style={styles.modalButton}
              status="warning"
              onPress={() =>
                handleOmitirDisconection()

              }
            >
              Omitir
            </Button>
          </Layout>
        </Card>
      </Modal>
    </Layout >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconButton: {
    flexDirection: 'row',
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  iconButton2: {
    flexDirection: 'row-reverse',
    position: 'absolute',
    left: 10,
    top: 10,
    zIndex: 1,
  },
  tooltip: {
    position: 'absolute',
    top: 30,
    padding: 6,
    borderRadius: 10,
    color: 'black',
    fontSize: 12,
    backgroundColor: 'white',
    right: -10,
  },
  tooltip2: {
    position: 'absolute',
    top: 30,
    padding: 6,
    borderRadius: 10,
    color: 'black',
    fontSize: 12,
    backgroundColor: 'white',
    right: 0,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 20,
  },
  estadoBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 2, height: 2 },
    shadowRadius: 5,
    padding: 10,
  },
  estadoText: {
    // fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modeText: {
    // fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  configBox: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  configBox2: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',

  },
  newBox: {
    height: 150,
    width: 150,
    alignContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 2, height: 2 },
    shadowRadius: 5,
    padding: 10,
    marginVertical: 5,
  },
  box1: {
    backgroundColor: '#ff8f00',
    borderBlockColor: 'Black',
  },
  box2: {
    backgroundColor: '#0288d1',
  },
  newBox2: {
    height: 150,
    width: 150,
    alignContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 2, height: 2 },
    shadowRadius: 5,
    padding: 10,
    marginVertical: 5, 
  },
  box3: {
    backgroundColor: '#aab7b8',
    borderBlockColor: 'Black',
  },
  box4: {
    backgroundColor: '#239b56',
  },
  boxText: {
    color: 'white',
    fontWeight: 'bold',
    paddingTop: 10,
    textAlign: 'center',
  },
  circleBox: {
    flex: 1,
    position: 'absolute',
    top: '60%',
    left: '35%',
  },
  centerCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#b71c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    color: 'white',
    fontWeight: 'bold',
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
  card: {
    width: '100%',
    height: '100%',
    padding: 20,
    borderRadius: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
  },
  closeButton: {
    marginTop: 10,
    flex: 1,
    marginHorizontal: 2,
  },
  input: {
    marginVertical: 10,
  },
  headerContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
  },
  sensorItem: {
    fontSize: 16,
    paddingVertical: 5,
    textAlign: 'center',
  },
  closeButtonL: {
    marginTop: 10,
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});
export default HomeScreen;