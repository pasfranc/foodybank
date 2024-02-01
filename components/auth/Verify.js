import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import React, { useEffect } from 'react';
import { Image, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { showMessage } from "react-native-flash-message";
import { theme } from '../../css/theme';
import { getI18n } from '../../i18n/translationService';
import { getLocales } from 'expo-localization';
import { useNavigation } from '@react-navigation/core';

const VerifyScreen = () => {

    const i18n = getI18n();
    const deviceLanguage = getLocales()[0].languageCode;

    const navigation = useNavigation();

    useEffect(() => {
        const unsubscribe = firebase.auth().onAuthStateChanged(user => {
            if (user) {
                firebase.auth().currentUser.reload().then(() => {
                    if (firebase.auth().currentUser.emailVerified) {
                        navigation.navigate("Main");
                    }
                });
            } else {
                firebase.auth().signOut();
            }
        })

        return unsubscribe
    }, []);


    const handleBack = () => {
        if (firebase.auth().currentUser) {
            firebase.auth().currentUser.reload().then(() => {
                if (firebase.auth().currentUser.emailVerified) {
                    navigation.navigate("Main");
                } else {
                    firebase.auth().signOut();
                }
            });
        } else {
            firebase.auth().signOut();
        }
    }

    const sendVerification = () => {
        firebase.auth().languageCode = deviceLanguage;
        firebase.auth().currentUser.sendEmailVerification();

        showMessage({
            message: i18n.get('verificationEmailSent'),
            type: "success",
            icon: { icon: "success", position: "left" },
        });
    }

    return (
        <KeyboardAvoidingView
            style={[theme.flex1, theme.container, { justifyContent: "flex-end" }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={{ flex: 1 }}></View>
            <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                <Image style={theme.imageLogoSplash} source={require('../../assets/minilogo.png')} />
            </View>
            <View style={{ flex: 2, alignItems: 'center', marginTop: 0 }}>
                <View style={[theme.loginButtonContainer, theme.buttonContainer]}>
                    <Text style={theme.whiteFont} h5>{i18n.t("emailNotVerified")}</Text>
                </View>
            </View>
            <View style={{ flex: 2, alignItems: 'center', marginTop: 0 }}>
                <View style={[{ width: '90%' }]}>
                    <TouchableOpacity
                        onPress={sendVerification}
                        style={[theme.button]}
                    >
                        <Text style={theme.buttonText}>{i18n.t('resendVerificationEmail')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={[theme.button, theme.buttonOutline]}
                    >
                        <Text style={theme.buttonOutlineText}>{i18n.t('continue')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView >
    )
}

export default VerifyScreen;