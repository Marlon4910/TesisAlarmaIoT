import { Button, Icon, IconElement, Input, Layout, Text } from "@ui-kitten/components"
import { Alert, StyleSheet, TouchableWithoutFeedback, useWindowDimensions } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { MyIcon } from "../../components/ui/MyIcon";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParams } from "../../navigation/StackNavigator";
import { useState } from "react";

interface Props extends StackScreenProps<RootStackParams, 'RegisterScreen'> { }

const AlertIcon = (props: any): IconElement => (
  <Icon
    {...props}
    name='alert-circle-outline'
  />
);

export const RegisterScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Alternar para mostrar contraseña escrita
  const toggleSecureEntry = (): void => {
    setSecureTextEntry(!secureTextEntry);
  };

  // Manejo del registro
  const handleCreateAccount = () => {
    // Función para validar el formato del correo
    const validateEmail = (email: string) => {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(email);
    };
    // Validar si el correo tiene un formato válido
    if (!validateEmail(email)) {
      Alert.alert('Error', 'El correo electrónico no es válido');
      return;
    }

    // Verificar que la contraseña tenga al menos 6 caracteres
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    // Si ambos son válidos, proceder con el registro

    navigation.navigate('OnboardingScreen',{Email:email , Password:password});
    

  };
  const renderIcon = (props: any): React.ReactElement => (
    <TouchableWithoutFeedback onPress={toggleSecureEntry}>
      <Icon
        {...props}
        name={secureTextEntry ? 'eye-off' : 'eye'}
      />
    </TouchableWithoutFeedback>
  );

  const renderCaption = (): React.ReactElement => {
    return (
      <Layout style={styles.captionContainer}>
        {AlertIcon(styles.captionIcon)}
        <Text style={styles.captionText}>
          Contraseña de minimo 6 caracteres
        </Text>
      </Layout>
    );
  };

  const { height } = useWindowDimensions();
  return (
    <Layout style={{ flex: 1 }}>
      <ScrollView style={{ marginHorizontal: 40 }}>
        <Layout style={{ paddingTop: height * 0.29 }}>
          <Text category="h1">Crear cuenta</Text>
          <Text category="p2">Por favor,crea una cuenta para continuar</Text>
        </Layout>

        {/* Inputs */}
        <Layout style={{ marginTop: 20 }}>
          <Input
            placeholder="Nombre completo"
            accessoryLeft={<MyIcon name="person-outline" />}
            style={{ marginBottom: 10 }}
          />
          <Input

            placeholder="Correo electronico"
            keyboardType="email-address"
            autoCapitalize="none"
            accessoryLeft={<MyIcon name="email-outline" />}
            style={{ marginBottom: 10 }}
            onChangeText={(text) => setEmail(text)}
          />
          <Input
            value={password}
            placeholder="Contraseña"
            autoCapitalize="none"
            secureTextEntry={secureTextEntry}
            accessoryRight={renderIcon}
            caption={renderCaption}
            accessoryLeft={<MyIcon name="lock-outline" />}
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
            onPress={handleCreateAccount}
          // appearance="fille"
          >
            Crear
          </Button>
        </Layout>

        {/* Informacion para crear cuenta */}
        <Layout style={{ height: 50 }} />

        <Layout style={{
          justifyContent: 'center',
          alignItems: 'flex-end',
          flexDirection: 'row',

        }}>
          <Text>¿Ya tienes cuenta?</Text>
          <Text
            status="primary"
            category="s1"
            onPress={() => navigation.goBack()}
          > Ingresar</Text>
        </Layout>

      </ScrollView>
    </Layout>
  )
}

const styles = StyleSheet.create({
  captionContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  captionIcon: {
    width: 10,
    height: 10,
    marginRight: 5,
  },
  captionText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'opensans-regular',
    color: '#8F9BB3',
  },
});