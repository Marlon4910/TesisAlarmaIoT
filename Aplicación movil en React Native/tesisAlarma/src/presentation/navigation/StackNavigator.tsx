import { createStackNavigator, StackCardStyleInterpolator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/home/HomeScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ConfigScreen } from '../screens/config/ConfigScreen';
import { ConfigCpuScreen } from '../screens/config/ConfigCpuScreen';
import { HelpScreen } from '../Onboarding/HelpScreen';
import { OnboardingScreen } from '../Onboarding/OnboardingScreen';
import { HistorialScreen } from '../screens/history/HistorialScreen';
import { useColorScheme } from 'react-native';
import { ResetScreen } from '../Onboarding/ResetScreen';
import SensorsList from '../screens/ListSensors/SensorsList';
import { ConfigRedScreen } from '../screens/config/ConfigRedScreen';

export type RootStackParams = {
  LoginScreen: undefined;
  RegisterScreen: undefined;
  ConfigScreen: undefined;
  ConfigCpuScreen: undefined;
  ConfigRedScreen: undefined;
  HelpScreen: undefined;
  OnboardingScreen: { Email: string, Password: string };
  HistorialScreen: undefined;
  ResetScreen:undefined;
  SensorsList:undefined
  HomeScreen: undefined;
}
const Stack = createStackNavigator<RootStackParams>();

const fadeAnimation: StackCardStyleInterpolator = ({ current }) => {
  return {
    cardStyle: {
      opacity: current.progress,
    }
  }

}
const slideAnimation: StackCardStyleInterpolator = ({ current, layouts }) => { return { cardStyle: { transform: [{ translateX: current.progress.interpolate({ inputRange: [0, 1], outputRange: [layouts.screen.width, 0], }), },], }, }; };

const fadeAndSlideAnimation: StackCardStyleInterpolator = ({ current, layouts }) => {
  return {
    cardStyle: {
      opacity: current.progress,
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
    },
  };
};




export const StackNavigator = () => {
  const scheme = useColorScheme();
  return (
    <Stack.Navigator
      initialRouteName='LoginScreen'
      screenOptions={{
        headerShown: false, headerStyle: {
          backgroundColor: scheme === 'dark' ? '#1F1F1F' : '#FFFFFF', // Color del header para temas claros y oscuros
        },
        headerTintColor: scheme === 'dark' ? '#FFFFFF' : '#000000', // Color del texto y los íconos del header
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',

      }}>
      <Stack.Screen options={{ cardStyleInterpolator: fadeAnimation }} name="LoginScreen" component={LoginScreen} />
      <Stack.Screen options={{ cardStyleInterpolator: fadeAnimation }} name="RegisterScreen" component={RegisterScreen} />
      <Stack.Screen options={{ cardStyleInterpolator: fadeAnimation }} name="HomeScreen" component={HomeScreen} />
      <Stack.Screen options={{ cardStyleInterpolator: fadeAnimation }} name="HelpScreen" component={HelpScreen} />
      <Stack.Screen options={{ cardStyleInterpolator: fadeAnimation }} name="OnboardingScreen" component={OnboardingScreen} />
      <Stack.Screen options={{ cardStyleInterpolator: slideAnimation }} name="HistorialScreen" component={HistorialScreen} />
      <Stack.Screen options={{ cardStyleInterpolator: slideAnimation }} name="ResetScreen" component={ResetScreen} />
      <Stack.Screen options={{ cardStyleInterpolator: slideAnimation }} name="SensorsList" component={SensorsList} />
      <Stack.Screen options={{ cardStyleInterpolator: slideAnimation, headerShown: true, title: 'Configuración de red' }} name="ConfigCpuScreen" component={ConfigCpuScreen} />
      <Stack.Screen options={{ cardStyleInterpolator: fadeAndSlideAnimation, headerShown: true, title: "Configuración" }} name="ConfigScreen" component={ConfigScreen} />
      <Stack.Screen options={{ cardStyleInterpolator: fadeAndSlideAnimation, headerShown: true, title: "Configuración" }} name="ConfigRedScreen" component={ConfigRedScreen} />
    </Stack.Navigator>
  );
}