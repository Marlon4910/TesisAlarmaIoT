import { Icon, useTheme } from '@ui-kitten/components';
import { StyleSheet} from 'react-native'
import Ricon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props{
    name:   string;
    color?: string;
    white?: boolean;
}
                                           
export const MyIcon  = ({name,color,white = false}: Props) => {
  
const theme = useTheme();

    if ( white ){
        color = theme['color-info-100'];
    }else if (!color){
        color=theme['text-basic-color'];
    }else{
        color = theme[color] ?? theme['text-basic-color'];
    }

    return <Icon style={styles.icon} fill={color} name={name}/>;
}

export const MyRIcon  = ({name,color,white = false}: Props) => {
  
const theme = useTheme();

    if ( white ){
        color = theme['color-info-100'];
    }else if (!color){
        color=theme['text-basic-color'];
    }else{
        color = theme[color] ?? theme['text-basic-color'];
    }

    return <Ricon style={styles.icon2} size={32} color={color} name={name}/>;
}

const styles = StyleSheet.create({
    icon:{
        width:32,
        height:32,
    },
    icon2:{
        
        width:32,
        height:32,
    },

})