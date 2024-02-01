import { View, Image } from 'react-native';
import React, { useEffect } from 'react';
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { theme } from '../../css/theme';
import { LinearProgress } from 'react-native-elements';

const SplashScreen = () => {

    useEffect(() => {
    }, []);

    return (
        <View style={[theme.flex1, theme.container]}>
            <View style={{ alignItems: 'center' }}>
                <Image
                    style={theme.imageLogoSplash}
                    source={require('../../assets/minilogo.png')}
                />
                <View style={{ width: '60%' }}>
                    <LinearProgress
                        value={100}
                        variant="determinate"
                        color={theme.logoGreen.backgroundColor}
                    />
                </View>
            </View>
        </View>
    )
}

export default SplashScreen;