import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from './authFirebase';
import { ref, set } from 'firebase/database';

// Se modifico para cambiar el modo y no una variable sirena
// Se coloco un almacenamiento de la variable mode para saber cuando retorna al monitoreo normal
// Se creo un nodo de configuración para manejar variables

// Función para actualiza el modo en este caso para accionamiento de la sirena si se envia updateSirenStatusIn(10)
export const updateSirenStatusIn = async (status:number) => {
  try {

    const uid = await AsyncStorage.getItem('UserUID');
    if (!uid) {
      console.warn('UID no encontrado');
      return;
    }

    await set(ref(database, `${uid}/Configuracion/modo`), status);
    console.log(`Sirena actualizada a ${status}`);
  } catch (error) {
    console.error("Error al actualizar Sirena:", error);
  }
};
// Función que actuliza el modo de alarma como modo= 0 , 1, 2 
export const updateAlarmMode = async (mode:number) => {
  try {
    await AsyncStorage.setItem('Mode', mode.toString());
    const uid = await AsyncStorage.getItem('UserUID');
    if (!uid) {
      console.warn('UID no encontrado');
      return;
    }
    await set(ref(database, `${uid}/Configuracion/modo`), mode);
    console.log(`Modo de alarma actualizado a ${mode}`);
  } catch (error) {
    console.error("Error al actualizar el modo de alarma:", error);
  }
};