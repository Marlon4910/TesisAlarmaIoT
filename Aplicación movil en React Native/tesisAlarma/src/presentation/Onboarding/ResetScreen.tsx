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
import { database, register, signOutt } from '../../actions/authFirebase'
import { ref, remove, set } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParams } from "../navigation/StackNavigator";
interface Props extends StackScreenProps<RootStackParams, 'ResetScreen'> { }



interface Slide {
    title: string;
    desc: string | JSX.Element;
    img: ImageSourcePropType;
}

const items: Slide[] = [
    {
        title: 'Reinicio del dispositivo',
        desc: (
            <>
                Estás restableciendo la alarma a su <Text style={{ fontWeight: 'bold' }}>configuración predeterminada</Text>.
                Este proceso eliminará todos los datos almacenados.
            </>
        ),
        img: require('../../assets/images_reset/reset1.png'),
    },
    {
        title: 'Conexión de red',
        desc: 'Tras el reinicio, el dispositivo generará su propia red Wi-Fi. Conéctate a ella para configurar la red nuevamente.',
        img: require('../../assets/images_reset/reset2.png'),
    },
    {
        title: 'Registro de sensores',
        desc: 'Después de la configuración de red, podrás agregar nuevamente los sensores y vincularlos a la alarma.',
        img: require('../../assets/images_reset/reset3.png'),
    },
];

export const ResetScreen = ({ navigation }: Props) => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    // const navigation = useNavigation();
    // const navigation = useNavigation<Props['navigation']>();

    const HandleReinicio = async (ResetMode: number) => {
        try {
            const uid = await AsyncStorage.getItem('UserUID');
            if (!uid) {
                console.warn('UID no encontrado');
                return;
            }

            // 1. Actualizar el modo
            await set(ref(database, `${uid}/Configuracion/modo`), ResetMode);

            // 2. Borrar la lista de sensores
            await remove(ref(database, `${uid}/Sensores`));
            console.log('Lista de sensores eliminada');
            // 3. Se coloca mensaje de configuracion CPU por reinicio
            const mensaje = 'Falta configurar la CPU'
            await set(ref(database, `${uid}/Alerta`), mensaje)
            // 4. Se coloca a numero de sensor como 1
            await set(ref(database, `${uid}/Configuracion/Nsensores`), 1)
            //5. Se limpia almacenamiento
            await AsyncStorage.clear();
            //6. Se cierra sesión
            signOutt();
            navigation.navigate('LoginScreen');

        } catch (error) {
            console.error('Error al reiniciar configuración:', error);
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
                        onPress={() => { HandleReinicio(11) }}
                        style={{ position: 'absolute', bottom: '5%', right: 30, width: 130 }}
                    >
                        Reiniciar dispositivo
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
            <Text category='s1'>{desc}</Text>

        </Layout>

    )

}
