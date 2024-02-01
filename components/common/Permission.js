import { Platform, KeyboardAvoidingView, View, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-elements';
import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/core';
import { getI18n } from '../../i18n/translationService';
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { theme } from '../../css/theme';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Linking } from "react-native";
import { moderateVerticalScale } from 'react-native-size-matters';
import LottieView from 'lottie-react-native';

const PermissionScreen = () => {

    const i18n = getI18n();
    const [hasPermission, setHasPermission] = useState(null);
    const navigation = useNavigation();

    useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getBarCodeScannerPermissions();
    }, []);

    const requestPermissionAgain = () => {
        Linking.openSettings();
    }

    const goBack = () => {
        navigation.goBack();
    }

    return (
        <KeyboardAvoidingView
            style={[theme.flex1, theme.container, { justifyContent: "flex-end" }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={{ flex: 1 }}></View>
            <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                <LottieView
                    style={theme.imageLogoSplash}

                    autoPlay
                    source={require('../../assets/cameraPermission.json')}
                />
            </View>
            <View style={{ marginTop: moderateVerticalScale(5), alignItems: 'center' }}>
                <Text style={theme.whiteTitle} h4>{i18n.t("noCameraPermissionsTitle")}</Text>
            </View>
            <View style={{ flex: 4, alignItems: 'center', marginTop: 0 }}>
                <View style={[theme.loginButtonContainer, theme.buttonContainer]}>
                    <Text style={theme.whiteFont} h5>{i18n.t("noCameraPermissions")}</Text>
                    <TouchableOpacity
                        onPress={requestPermissionAgain}
                        style={[theme.button, { marginTop: moderateVerticalScale(30) }]}
                    >
                        <Text style={theme.buttonText}>{i18n.t("openSettings")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={goBack}
                        style={[theme.button, theme.buttonOutline]}
                    >
                        <Text style={theme.buttonOutlineText}>{i18n.t("back")}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView >
    )
}

export default PermissionScreen;