import { Platform, TextInput, KeyboardAvoidingView, View, TouchableOpacity, Text, Image } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/core';
import { getI18n } from '../../i18n/translationService';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { theme } from '../../css/theme';
import { moderateVerticalScale } from 'react-native-size-matters';
import { showMessage } from "react-native-flash-message";
import { getLocales } from 'expo-localization';

const LoginScreen = () => {

    const i18n = getI18n();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState('');
    const navigation = useNavigation();
    const deviceLanguage = getLocales()[0].languageCode;

    useEffect(() => {
        const unsubscribe = firebase.auth().onAuthStateChanged(user => {
            if (user) {
                firebase.auth().currentUser.reload().then(() => {
                    if (firebase.auth().currentUser.emailVerified) {
                        navigation.navigate("Main");
                    } else {
                        navigation.replace("Verify")
                    }
                });
            } else {
                firebase.auth().signOut();
            }
        })

        return unsubscribe
    }, [])

    const handleSignUp = () => {
        navigation.navigate("Register")
    }

    const resetPassword = () => {
        if (email) {
            firebase.auth().languageCode = deviceLanguage;
            firebase.auth().sendPasswordResetEmail(email)
                .then(function (user) {
                    showMessage({
                        message: i18n.get('checkYourEmail'),
                        type: "success",
                        icon: { icon: "success", position: "left" },
                    });
                }).catch((error) =>
                    handleError(error)
                )
        } else {
            setFormError(i18n.t('email') + i18n.t('error.mandatory'));
        }
    }

    const handleError = (error) => {
        switch (error.code) {
            case 'auth/invalid-email':
                setFormError(i18n.t('error.invalidEmail'))
                break;
            case 'auth/user-not-found':
                setFormError(i18n.t('error.userNotFound'))
                break;
            case 'auth/wrong-password':
                setFormError(i18n.t('error.wrongPassword'))
                break;
            case 'auth/missing-password':
                setFormError(i18n.t('error.missingPassword'))
                break;
            default:
                setFormError(error.message)
        }
    }

    const handleLogin = () => {
        firebase.auth()
            .signInWithEmailAndPassword(email, password)
            .then(userCredentials => {
                const user = userCredentials.user;
                console.log('Logged in with:', user.email);
            })
            .catch(error => handleError(error))
    }

    return (
        <KeyboardAvoidingView
            style={[theme.flex1, theme.container, { justifyContent: "flex-end" }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={theme.flex1} />
            <View style={theme.logo}>
                <Image style={theme.imageLogoSplash} source={require('../../assets/minilogo.png')} />
            </View>
            <View style={theme.loginContent}>
                <View style={theme.inputContainer}>
                    <TextInput
                        placeholder={i18n.t('email')}
                        placeholderTextColor={theme.inputPlaceholderColor.color}
                        autoCorrect={false}
                        autoComplete="off"
                        autoFocus={false}
                        value={email}
                        onBlur={() =>
                            setFormError("")
                        }
                        onChangeText={text => {
                            setEmail(text)
                            setFormError("")
                        }}
                        style={theme.input}
                    />
                    <TextInput
                        placeholder={i18n.t('password')}
                        placeholderTextColor={theme.inputPlaceholderColor.color}
                        autoCorrect={false}
                        autoComplete="off"
                        autoFocus={false}
                        value={password}
                        onBlur={() =>
                            setFormError("")
                        }
                        onChangeText={text => {
                            setPassword(text)
                            setFormError("")
                        }}
                        style={theme.input}
                        secureTextEntry
                    />
                    {formError.length > 0 &&
                        <Text style={theme.errorMessage}>{formError}</Text>
                    }
                    <View style={[theme.boxText, { marginTop: moderateVerticalScale(10) }]}>
                        <Text style={[theme.titleText, { textDecorationLine: 'underline' }]} onPress={(resetPassword)}>
                            {i18n.t('resetPassword')}
                        </Text>
                    </View>
                </View>
                <View style={[theme.loginButtonContainer, theme.buttonContainer]}>
                    <TouchableOpacity
                        onPress={handleLogin}
                        style={theme.button}
                    >
                        <Text style={theme.buttonText}>{i18n.t('login')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleSignUp}
                        style={[theme.button, theme.buttonOutline]}
                    >
                        <Text style={theme.buttonOutlineText}>{i18n.t('register')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView >
    )
}

export default LoginScreen;