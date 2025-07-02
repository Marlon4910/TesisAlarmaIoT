import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Layout, Text, } from '@ui-kitten/components';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../../actions/authFirebase';
import { MyIcon } from '../../components/ui/MyIcon';
import { useNavigation } from '@react-navigation/native';

type HistorialItem = {
  fecha: string;
  hora: string;
  mensaje: string;
};

export const HistorialScreen: React.FC = () => {
  const navigation = useNavigation();
  const [historial, setHistorial] = useState<HistorialItem[]>([]);

  //Efecto que carga el historial desde firebase
  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        // Cargar historial local
        const historialLocal = await AsyncStorage.getItem('HistorialEventos');
        if (historialLocal) {
          setHistorial(JSON.parse(historialLocal));
        }

        // Intentar sincronizar con Firebase
        const uid = await AsyncStorage.getItem('UserUID');
        if (!uid) {
          console.warn('UID no encontrado');
          return;
        }

        const historialRef = ref(database, `${uid}/Historial`);
        console.log(`este es el uid de historial${uid}`)
        const unsubscribe = onValue(historialRef, async (snapshot) => {
          const firebaseHistorial = snapshot.val();
          if (firebaseHistorial) {
            const historialArray = Object.entries(firebaseHistorial).flatMap(([fecha, eventos]) =>
              Object.entries(eventos as Record<string, string>).map(([hora, mensaje]) => ({
                fecha,
                hora,
                mensaje,
              }))
            );

            historialArray.sort(
              (a, b) =>
                new Date(`${a.fecha} ${a.hora}`).getTime() -
                new Date(`${b.fecha} ${b.hora}`).getTime()
            );

            setHistorial(historialArray);

            // Almacenar localmente
            await AsyncStorage.setItem('HistorialEventos', JSON.stringify(historialArray));
          }
        });

        // Limpia la suscripción al desmontar el componente
        return () => unsubscribe();
      } catch (error) {
        console.error('Error al cargar el historial:', error);
      }
    };

    cargarHistorial();
  }, []);


// Elimina el historial de firebase
  const limpiarHistorial = async () => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de que deseas borrar todo el historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          onPress: async () => {
            try {
              // Obtener UID del usuario
              const uid = await AsyncStorage.getItem('UserUID');
              if (!uid) return;

              // Eliminar historial en Firebase
              const historialRef = ref(database, `${uid}/Historial`);
              await set(historialRef, null);

              // Eliminar historial local
              await AsyncStorage.removeItem('HistorialEventos');
              setHistorial([]);
              console.log('Historial borrado en Firebase y localmente');
            } catch (error) {
              console.error('Error al limpiar historial:', error);
            }
          },
        },
      ]
    );
  };

  //Colores para cada mensaje
  const getEventColor = (mensaje: string) => {
    const lowerMsg = mensaje.toLowerCase();
    if (lowerMsg.includes('activado')) {
      return '#ff4d4d'; // Rojo para eventos de activación
    } else if (lowerMsg.includes('desconectado')) {
      return '#999'; // Gris para desconexión
    } else {
      return '#000'; // Color por defecto
    }
  };

  return (
    <Layout style={styles.wrapper}>
      {/* Boton de limpieza de historial */}
      <TouchableOpacity style={{ flexDirection: 'row', position: 'absolute', top: 25, right: 10, zIndex: 1, }} onPress={limpiarHistorial}>
        <MyIcon name="trash-2-outline" />
      </TouchableOpacity>
      {/* boton de regreso a pantalla anterior */}
      <TouchableOpacity style={{ flexDirection: 'row-reverse', position: 'absolute', left: 10, top: 25, zIndex: 1, }} onPress={() => navigation.goBack()} >
        <MyIcon name="arrow-back-outline" />
      </TouchableOpacity>
      {/* titulo */}
      <Layout style={{ alignItems: 'center', marginBottom: 0, }}>
        <Text category='h1'>
          Historial
        </Text>
      </Layout>
      {/* contruccion de tabla de historial */}
      <Layout style={styles.table}>
        <Layout style={styles.table_head}>
          <Layout style={{ width: '25%' }}>
            <Text style={styles.table_caption}>Fecha</Text>
          </Layout>
          <Layout style={{ width: '35%' }}>
            <Text style={styles.table_caption}>Hora</Text>
          </Layout>
          <Layout style={{ width: '35%' }}>
            <Text style={styles.table_caption}>Evento</Text>
          </Layout>
        </Layout>
        <FlatList
          data={historial}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <Layout style={styles.table_body}>
              <Layout style={styles.col_fecha}>
                <Text style={styles.table_data}>{item.fecha}</Text>
              </Layout>
              <Layout style={styles.col_hora}>
                <Text style={styles.table_data}>{item.hora}</Text>
              </Layout>
              <Layout style={styles.col_mensaje}>
                <Layout style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.text_mensaje, { color: getEventColor(item.mensaje) }]}>
                    {item.mensaje}
                  </Text>
                </Layout>
              </Layout>
            </Layout>
          )}
        />
      </Layout>
    </Layout>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 40,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  table: {
    margin: 5,
    // paddingTop: 100,
  },
  table_head: {
    flexDirection: 'row',
    backgroundColor: '#3bcd6b',
    padding: 10,
  },
  table_caption: {
    // color: 'white',
    fontWeight: 'bold',
    backgroundColor: '#3bcd6b',
  },
  table_body: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-start',
  },
  table_data: {
    fontSize: 11,
  },
  buttonContainer: {
    marginVertical: 10,
    width: '90%',
    paddingBottom: 50,
  },
  col_fecha: {
    flex: 1,
    paddingRight: 4,
  },
  col_hora: {
    flex: 1,
    paddingRight: 4,
  },
  col_mensaje: {
    flex: 2,
    paddingRight: 4,
  },
  text_mensaje: {
    fontSize: 11,
    flexWrap: 'wrap',
    alignSelf: 'stretch',
    lineHeight: 20,
    paddingBottom: 20,
  },


});
