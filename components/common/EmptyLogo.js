import { Platform, KeyboardAvoidingView, View, Image } from 'react-native';
import React, { useEffect } from 'react';
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { theme } from '../../css/theme';
import { moderateVerticalScale } from 'react-native-size-matters';

const EmptyLogoScreen = () => {

    useEffect(() => {
    }, []);

    return (
        <KeyboardAvoidingView
            style={[theme.flex1, theme.container, { justifyContent: "flex-end" }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={{ flex: 1 }}></View>
            <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                <Image style={theme.imageLogoSplash} source={require('../../assets/minilogo.png')} />
            </View>
            <View style={{ marginTop: moderateVerticalScale(5), alignItems: 'center' }}>
            </View>
            <View style={{ flex: 4, alignItems: 'center', marginTop: 0 }}>

            </View>
        </KeyboardAvoidingView >
    )
}

export default EmptyLogoScreen;