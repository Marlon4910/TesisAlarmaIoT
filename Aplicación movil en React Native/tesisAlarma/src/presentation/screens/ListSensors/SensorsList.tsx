import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ref, get } from 'firebase/database';
import { database } from '../../../actions/authFirebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon, Layout, Text, } from '@ui-kitten/components';
import { MyIcon } from '../../components/ui/MyIcon';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const SensorsList = () => {
    const navigation = useNavigation();
    const [sensors, setSensors] = useState<any[]>([]);
    // Siempre que es ten primer plano actualiza la lista de sensores
    useFocusEffect(
        useCallback(() => {
            const fetchSensors = async () => {
                const uid = await AsyncStorage.getItem('UserUID');
                if (!uid) {
                    console.warn('UID no encontrado en AsyncStorage');
                    return;
                }

                const sensorsRef = ref(database, `${uid}/Sensores`);
                const snapshot = await get(sensorsRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const formattedSensors = Object.entries(data).flatMap(
                        ([location, sensors]: [string, any]) =>
                            Object.entries(sensors).map(([sensorId, sensorData]: any) => {
                                let tipo = 'Desconocido';
                                if (sensorData.topic && typeof sensorData.topic === 'string') {
                                    const partes = sensorData.topic.split('/');
                                    if (partes.length === 3) {
                                        tipo = partes[2].charAt(0).toUpperCase() + partes[2].slice(1);
                                    }
                                }

                                return {
                                    id: sensorId,
                                    location,
                                    tipo,
                                    estado: sensorData.estado || 'Desconocido',
                                };
                            })
                    );

                    const sorted = formattedSensors.sort((a, b) => a.id.localeCompare(b.id));
                    setSensors(sorted);
                } else {
                    console.warn('No se encontraron sensores.');
                    setSensors([]);
                }
            };

            fetchSensors();
        }, [])
    );

    //Coloca colores dependiendo el caso
    const renderSensorItem = ({ item }: { item: any }) => {
        const isOnline = item.estado.toLowerCase() === 'online';
        const estadoColor = isOnline ? '#2ecc71' : '#e74c3c';

        return (
            <Layout style={styles.row}>
                <Text style={styles.cell}>{item.id}</Text>
                <Text style={styles.cell}>{item.location}</Text>
                <Layout style={[styles.cell, { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                    <TipoIcon tipo={item.tipo} />
                    <Text style={{ fontSize: 12 }} numberOfLines={1} ellipsizeMode="tail">{item.tipo}</Text>
                </Layout>
                <Layout style={[styles.cell, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}>
                    <EstadoIcon estado={item.estado} />
                    <Text style={{ color: estadoColor, fontWeight: 'bold' }}>{item.estado}</Text>
                </Layout>
            </Layout>
        );
    };

    // Coloca iconos si esta el sensor online o no
    const EstadoIcon = ({ estado }: { estado: string }) => {
        const isOnline = estado.toLowerCase() === 'online';
        return (
            <Icon
                name={isOnline ? 'checkmark-circle-2' : 'close-circle'}
                fill={isOnline ? '#2ecc71' : '#e74c3c'}
                style={{ width: 20, height: 20, marginRight: 4 }}
            />
        );
    };

    // Iconos dependiendo el tipo de sensor
    const TipoIcon = ({ tipo }: { tipo: string }) => {
        let icon = '❓';
        switch (tipo.toLowerCase()) {
            case 'humo':
                icon = '🔥';
                break;
            case 'apertura':
                icon = '🚪';
                break;
            case 'vibracion':
                icon = '💥';
                break;
            case 'movimiento':
                icon = '👁️';
                break;
        }

        return <Text style={{ marginRight: 4 }}>{icon}</Text>;
    };




    return (
        <Layout style={styles.container}>
            {/* Boton de regreso de pantalla */}
            <TouchableOpacity style={{ flexDirection: 'row-reverse', position: 'absolute', left: 10, top: 15, zIndex: 1, }} onPress={() => navigation.goBack()} >
                <MyIcon name="arrow-back-outline" />
            </TouchableOpacity>
            {/* Titulo */}
            <Text style={styles.header} category='h1'>Lista de Sensores</Text>
            {/* Tabla */}
            <Layout style={styles.table}>
                <Layout style={styles.row}>
                    <Text style={[styles.headerCell, { backgroundColor: '#3bcd6b' }]} category='h7'>ID</Text>
                    <Text style={[styles.headerCell, { backgroundColor: '#3bcd6b' }]} category='h7'>Ubicación</Text>
                    <Text style={[styles.headerCell, { backgroundColor: '#3bcd6b' }]} category='h7'>Tipo</Text>
                    <Text style={[styles.headerCell, { backgroundColor: '#3bcd6b' }]} category='h7'>Estado</Text>
                </Layout>

                <FlatList
                    data={sensors}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSensorItem}
                />
            </Layout>
        </Layout>
    );
};
// Estilos
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        // backgroundColor: '#fff',
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        // color:'#fff'
    },
    table: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    cell: {
        flex: 1,
        padding: 2,
        textAlign: 'center',
        // color:'#fff'
    },
    headerCell: {
        flex: 1,
        padding: 8,
        textAlign: 'center',
        fontWeight: 'bold',
        // backgroundColor: '#fff',
    },
});

export default SensorsList;
