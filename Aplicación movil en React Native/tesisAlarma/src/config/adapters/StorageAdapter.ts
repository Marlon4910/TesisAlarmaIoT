import AsyncStorage from '@react-native-async-storage/async-storage';

//Obtiene un valor almacenado en AsyncStorage.
export class StorageAdapter {
  static async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error obteniendo el item: "${key}":`, error);
      return null;
    }
  }
 //Almacena un valor en AsyncStorage con una clave específica.
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error configurando item: "${key}" con valor: "${value}":`, error);
      throw new Error(`Error configurando item ${key} ${value}`);
    }
  }
// Elimina un valor almacenado en AsyncStorage por su clave.
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error eliminando el item con: "${key}":`, error);
      throw new Error(`Error eliminando el item ${key}`);
    }
  }
}
