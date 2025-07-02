// authService.ts
import { initializeAuth, getReactNativePersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, Auth, UserCredential, signOut, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { firebaseConfig } from '../config/Firebase/firebaseConfig';
import { StorageAdapter } from '../config/adapters/StorageAdapter'; // Asegúrate de ajustar la ruta si es necesario
import { getDatabase } from 'firebase/database';

// Claves para AsyncStorage
const AUTH_STATUS_KEY = 'auth_status';
const USER_DATA_KEY = 'user_data';

// Inicializa Firebase y autenticación
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app) || initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
// Inicializa la base de datos en tiempo real
const database = getDatabase(app);

export { app, auth, database };
// Función para iniciar sesión
export const signIn = async (email: string, password: string): Promise<UserCredential> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await persistAuthStatus('authenticated', userCredential.user.uid);
  await AsyncStorage.setItem('UserUID', userCredential.user.uid);
  return userCredential;
};

// Función para crear una cuenta
export const register = async (email: string, password: string): Promise<UserCredential> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await persistAuthStatus('authenticated', userCredential.user.uid);
  await AsyncStorage.setItem('UserUID', userCredential.user.uid);
  return userCredential;
};

// Función para cerrar sesión
export const signOutt = async () => {
  await auth.signOut();
  // await signOut(auth);
  await persistAuthStatus('unauthenticated');
};

// Función para persistir el estado de autenticación
const persistAuthStatus = async (status: 'authenticated' | 'unauthenticated', userId?: string) => {
  await StorageAdapter.setItem(AUTH_STATUS_KEY, status);
  if (status === 'authenticated' && userId) {
    await StorageAdapter.setItem(USER_DATA_KEY, userId);
  } else {
    await StorageAdapter.removeItem(USER_DATA_KEY);
  }
};

// Obtener estado de autenticación desde AsyncStorage
export const getAuthStatus = async (): Promise<'authenticated' | 'unauthenticated' | null> => {
  return await StorageAdapter.getItem(AUTH_STATUS_KEY) as 'authenticated' | 'unauthenticated' | null;
};

// Obtener datos del usuario desde AsyncStorage
export const getUserData = async (): Promise<string | null> => {
  return await StorageAdapter.getItem(USER_DATA_KEY);
};
