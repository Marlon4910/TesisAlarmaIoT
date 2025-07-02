import { useNavigation } from '@react-navigation/native';
import { Button, Layout, Text } from '@ui-kitten/components';
import { useRef, useState } from 'react';
import * as eva from '@eva-design/eva';
import { useColorScheme } from 'react-native';
import {
    Image,
    ImageSourcePropType,
    NativeScrollEvent,
    NativeSyntheticEvent,
    useWindowDimensions,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { MyIcon } from '../components/ui/MyIcon';

interface Slide {
    title: string;
    desc: string;
    img: ImageSourcePropType;
}

const items: Slide[] = [
    {
        title: 'Navegación en la aplicación',
        desc:'En la parte superior, encontrarás dos botones: el botón de ayuda (izquierda) y el botón de configuración (derecha). Desde la configuración puedes gestionar tu sistema de alarma.',
        img: require('../../assets/images_help/help-1.png'),
    },
    {
        title: 'Estado de la alarma',
        desc: 'Justo debajo, verás un cuadro que indica el estado actual de la alarma. Aquí podrás saber el modo de alarma seleccionado y si ha ocurrido un evento.',
        img: require('../../assets/images_help/help-2.png'),
    },
    {
        title: 'Control de la alarma',
        desc: 'Debajo del estado de la alarma, tienes botones para cambiar el modo de alarma, ver la lista de sensores, activar el botón de pánico, revisar el historial de alertas y gestionar los contactos de emergencia.',
        img: require('../../assets/images_help/help-3.png'),
    },
    {
        title: 'Configuración del sistema',
        desc: 'Desde la pantalla de configuración puedes acceder a la configuración de la central de procesamiento, agregar sensores, reiniciar el dispositivo y cerrar sesión.',
        img: require('../../assets/images_help/help-4.png'),
    },
    {
        title: 'Agregar sensores y configurar la central',
        desc: 'Para agregar sensores o configurar la central de procesamiento, primero activa el "Modo Configuración" y luego conéctate a la red que genera el dispositivo correspondiente.',
        img: require('../../assets/images_help/help-5.png'),
    },
];
export const HelpScreen = () => {

    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const navigation = useNavigation();

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
        <Layout style={{
            flex: 1,
            // backgroundColor: backgroundColor
        }}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.title}
                ref={ flatListRef }
                renderItem={({ item }) => <SlideItem item={item} />}
                horizontal
                pagingEnabled
                decelerationRate='fast'
                onScroll={onScroll}
            >

            </FlatList>
            {currentSlideIndex === items.length - 1 ? (
                <Button
                    onPress={() => navigation.goBack()}
                    style={{ position: 'absolute', bottom: 60, right: 30, width: 120 }}>
                    Finalizar
                </Button>
            ) : (
                <Button style={{
                    position: 'absolute',
                    bottom:60,
                    right: 30,}}
                    appearance='ghost'
                    accessoryRight={<MyIcon name="arrow-forward" color='white' />}
                    onPress={() => scrollToSlide(currentSlideIndex + 1)}
                >
                    Siguiente
                </Button>
            )
            }

        </Layout>
    )
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
            <Text category='s1'> {desc}</Text>

        </Layout>
    )

}