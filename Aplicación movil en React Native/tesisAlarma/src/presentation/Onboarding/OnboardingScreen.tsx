import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Button, Input, Layout, Text } from '@ui-kitten/components';
import { useRef, useState } from 'react';
import * as eva from '@eva-design/eva';
import { Alert, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import {
    Image,
    ImageSourcePropType,
    NativeScrollEvent,
    NativeSyntheticEvent,
    useWindowDimensions,
} from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { MyIcon } from '../components/ui/MyIcon';
import { database, register } from '../../actions/authFirebase'
import { ref, set } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParams } from "../navigation/StackNavigator";
import messaging from '@react-native-firebase/messaging';

interface Props extends StackScreenProps<RootStackParams, 'OnboardingScreen'> { }
type OnboardingScreenRouteProp = RouteProp<RootStackParams, 'OnboardingScreen'>;

interface Slide {
    title: string;
    desc: string| JSX.Element;
    img: ImageSourcePropType;
}

const items: Slide[] = [
    {
        title: 'Bienvenido a tu alarma de seguridad inteligente',
        desc: 'Protege tu residencia con un sistema de alarma IoT fácil de configurar y controlar desde tu dispositivo móvil.',
        img: require('../../assets/images/onboarding_1.png'),
    },
    {
        title: 'Configura tu sistema en minutos',
        desc: 'Como primer paso configura la red de la central de procesamiento en el la pantalla de configuración',
        img: require('../../assets/images/onboarding_2.png'),
    },
    {
        title: 'Agrega nuevos sensores y selecciona el modo de alarma',
        desc: 'Vincula tus sensores en la pantalla de configuración selecciónando su ubicación y personaliza las opciones de seguridad según tus necesidades.',
        img: require('../../assets/images_reset/reset3.png'),
    },
    {
        title: 'Selecciona el modo de alarma',
        desc: (
            <>
                Existen <Text style={{ fontWeight: 'bold' }}>3 modos de alarma:</Text> 
                El modo de <Text style={{ fontWeight: 'bold' }}>Configuración</Text>, modo <Text style={{ fontWeight: 'bold' }}>Exteriores</Text>, modo <Text style={{fontWeight:'bold'}}>Armado Completo</Text>.
            </>
        ),
        img: require('../../assets/images/onboarding_4.png'),
    },
    {
        title: 'Accede a las diferentes funciones',
        desc: (
            <>
                En la pantalla principal, puedes acceder al <Text style={{ fontWeight: 'bold' }}>botón de pánico</Text>, 
                el cual activará la alarma mientras lo mantengas presionado y la desactivará al soltarlo.  
                También encontrarás el <Text style={{ fontWeight: 'bold' }}>botón de lista de sensores</Text>,  
                el <Text style={{ fontWeight: 'bold' }}>botón de historial de alertas</Text> y el  
                <Text style={{ fontWeight: 'bold' }}> botón de contactos de emergencia</Text>.
            </>
        ),        
        img: require('../../assets/images/onboarding_5.png'),
    },
    {
        title: 'Recibe alertas en tiempo real',
        desc: 'Mantente informado con notificaciones instantáneas cuando se detecte una intrusión o un evento importante.',
        img: require('../../assets/images/onboarding_6.png'),
    },
];

export const OnboardingScreen = ({ navigation }: Props) => {
    const route = useRoute<OnboardingScreenRouteProp>();
    const { Email, Password } = route.params;
    const [NombreAlarma, setNombreAlarma] = useState('')
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const [SensorId, setSensorId] = useState<number>(1)
    // const navigation = useNavigation();
    // const navigation = useNavigation<Props['navigation']>();

    const saveNombreAlarma = async () => {
        try {
          // Registrar al usuario usando los parámetros obtenidos
          register(Email, Password)
            .then(async () => {
              const uid = await AsyncStorage.getItem('UserUID');
              if (uid) {
                setSensorId(1);
                await set(ref(database,`${uid}/Configuracion/NSensores`),1)
                await AsyncStorage.setItem('SensorId',SensorId.toString());
                await set(ref(database,`${uid}/Configuracion/modo`),0)
                await AsyncStorage.setItem('ModoAlarma',"0")
                const token = await messaging().getToken();
                console.log('Token actualizado:', token);
                // Guarda el nuevo token en Firestore
                await set(ref(database, `${uid}/Configuracion/tokenFCM`), token);
                const mensaje = 'Falta configurar la CPU'
                await set(ref(database,`${uid}/Alerta`),mensaje)
                navigation.navigate('HomeScreen');
              } else {
                console.log('Error al obtener el UID del usuario');
              }
            })
            .catch((error) => {
              console.log('Error al crear cuenta:', error);
              Alert.alert('Error al crear cuenta', 'Ocurrió un error al registrar la cuenta');
            });
        } catch (error) {
          console.error('Error al actualizar NombreAlarma:', error);
        }
      };

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, layoutMeasurement } = event.nativeEvent;
        const currentIndex = Math.floor(contentOffset.x / layoutMeasurement.width);

        setCurrentSlideIndex(currentIndex > 0 ? currentIndex : 0);
    };

    const scrollToSlide = (index: number) => {
        if (!flatListRef.current) return;

        flatListRef.current.scrollToIndex({
            index: index,
            animated: true,
        });

    };
    return (
        <Layout style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

                <FlatList
                    data={items}
                    keyExtractor={(item) => item.title}
                    ref={flatListRef}
                    renderItem={({ item }) => <SlideItem item={item} />}
                    horizontal
                    pagingEnabled
                    decelerationRate="fast"
                    onScroll={onScroll}
                    showsHorizontalScrollIndicator={true}
                    // scrollEnabled={currentSlideIndex === items.length - 1 ? false : true}
                    automaticallyAdjustKeyboardInsets
                    contentContainerStyle={{ paddingBottom: '20%' }}
                />

                {currentSlideIndex === items.length - 1 ? (
                    <Button
                        onPress={() => { saveNombreAlarma() }}
                        style={{ position: 'absolute', bottom: '5%', right: 30, width: 120 }}
                    >
                        Finalizar
                    </Button>
                ) : (
                    <Button
                        style={{
                            position: 'absolute',
                            bottom: 60,
                            right: 30,
                        }}
                        appearance="ghost"
                        accessoryRight={<MyIcon name="arrow-forward" color="white" />}
                        onPress={() => scrollToSlide(currentSlideIndex + 1)}
                    >
                        Siguiente
                    </Button>
                )}
                {currentSlideIndex === items.length - 1 ? (
                    <Layout style={{ position: 'absolute', bottom: '5%', left: '5%', width: '50%', }}>
                        {/* <Input placeholder='AlarmaCasa' accessoryLeft={<MyIcon name="edit-outline" />} onChangeText={(val) => setNombreAlarma(val)} /> */}
                    </Layout>
                ) : (
                    <Layout></Layout>
                )}


            </ ScrollView >
        </Layout>
    );
}

interface SlideItemProps {
    item: Slide;

}
const SlideItem = ({ item }: SlideItemProps) => {
    const colorScheme = useColorScheme();
    const theme = colorScheme === 'dark' ? eva.dark : eva.light;
    const backgroundColor = (colorScheme === 'dark')
        ? theme['color-basic-800']
        : theme['color-basic-100'];
    const { width } = useWindowDimensions();
    const { title, desc, img } = item;
    return (

        <Layout style={{
            flex: 1,
            backgroundColor: backgroundColor,
            borderRadius: 5,
            padding: 40,
            justifyContent: 'center',
            width: width
        }}>
            <Image
                source={img}
                style={{
                    width: width * 0.7,
                    height: width * 0.7,
                    resizeMode: 'center',
                    alignSelf: 'center'
                }}
            />
            <Text category='h4'>{title}</Text>
            <Text category='s1'>{desc} </Text>

        </Layout>

    )

}
