import { Button, Icon, Input, Layout, Text } from "@ui-kitten/components"
import { Alert, TouchableWithoutFeedback, useWindowDimensions } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { MyIcon } from "../../components/ui/MyIcon";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParams } from "../../navigation/StackNavigator";
import { signIn, getAuthStatus } from '../../../actions/authFirebase';
import React, { useState, useEffect } from 'react';
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Props extends StackScreenProps<RootStackParams, 'LoginScreen'> { }

export const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

// Alternar para mostrar contraseña escrita
  const toggleSecureEntry = (): void => {
    setSecureTextEntry(!secureTextEntry);
  };

// Efecto para revision si el usuario ya está autenticado al cargar la pantalla
  useEffect(() => {
    const checkAuthStatus = async () => {
      const authStatus = await getAuthStatus();
      if (authStatus === 'authenticated') {
        console.log('Ya esta autentificado')
        navigation.navigate('HomeScreen');
      }
    };

    checkAuthStatus();
  }, []);


// Manejo de inicio de sesion
  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      console.log('Haciendo singIn')
      const uid = await AsyncStorage.getItem('UserUID');
      if (uid) {
        navigation.navigate('HomeScreen');
      }
    } catch (error) {
      console.log('Error al iniciar sesión:', error);
      Alert.alert("Email o Password equivocado");
    }
  };

  // Icono para mostrar contraseña escrita
  const renderIcon = (props: any): React.ReactElement => (
    <TouchableWithoutFeedback onPress={toggleSecureEntry}>
      <Icon
        {...props}
        name={secureTextEntry ? 'eye-off' : 'eye'}
      />
    </TouchableWithoutFeedback>
  );



  const { height } = useWindowDimensions();
  return (
    <Layout style={{ flex: 1 }}>
      <ScrollView style={{ marginHorizontal: 40 }}>
        <Layout style={{ paddingTop: height * 0.35 }}>
          <Text category="h1">Ingresar</Text>
          <Text category="p2">Por favor,ingrese para continuar</Text>
        </Layout>

        {/* Inputs */}
        <Layout style={{ marginTop: 20 }}>
          <Input
            placeholder="Correo electronico"
            keyboardType="email-address"
            autoCapitalize="none"
            accessoryLeft={<MyIcon name="email-outline" />}
            style={{ marginBottom: 10 }}
            onChangeText={(text) => setEmail(text)}
          />
          <Input
            placeholder="Contraseña"
            autoCapitalize="none"
            secureTextEntry={secureTextEntry}
            accessoryLeft={<MyIcon name="lock-outline" />}
            accessoryRight={renderIcon}
            style={{ marginBottom: 10 }}
            onChangeText={(text) => setPassword(text)}
          />
        </Layout>

        {/* space */}
        <Layout style={{ height: 20 }} />

        {/* Button */}
        <Layout>
          <Button
            accessoryRight={<MyIcon name="arrow-forward-outline" white />}
            onPress={handleSignIn}
          // appearance="fille"
          >
            Ingresar
          </Button>
        </Layout>

        {/* Informacion para crear cuenta */}
        <Layout style={{ height: 50 }} />

        <Layout style={{
          justifyContent: 'center',
          alignItems: 'flex-end',
          flexDirection: 'row',

        }}>
          <Text>¿No tienes cuenta?</Text>
          <Text
            status="primary"
            category="s1"
            onPress={() => navigation.navigate('RegisterScreen')}
          > Crea una</Text>
        </Layout>

      </ScrollView>
    </Layout>
  )
}