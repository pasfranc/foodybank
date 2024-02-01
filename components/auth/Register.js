
import { useNavigation } from '@react-navigation/core';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { showMessage } from "react-native-flash-message";
import { ScaledSheet } from 'react-native-size-matters';
import { theme } from '../../css/theme';
import { getI18n } from '../../i18n/translationService';
import { getLocales } from 'expo-localization';

const RegisterScreen = () => {

    const i18n = getI18n();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [formError, setFormError] = useState('');
    const navigation = useNavigation();
    const deviceLanguage = getLocales()[0].languageCode;

    const backToLogin = () => {
        navigation.navigate("Login");
    }

    const validateFields = () => {
        if (!firstName) {
            setFormError(i18n.t('firstName') + i18n.t('error.mandatory'));
            return false;
        }
        if (!lastName) {
            setFormError(i18n.t('lastName') + i18n.t('error.mandatory'));
            return false;
        }
        if (!phoneNumber) {
            setFormError(i18n.t('phoneNumber') + i18n.t('error.mandatory'));
            return false;
        }
        return true;
    }

    const handleError = (error) => {
        switch (error.code) {
            case 'auth/invalid-email':
                setFormError(i18n.t('error.invalidEmail'))
                break;
            case 'auth/user-not-found':
                setFormError(i18n.t('error.userNotFound'))
                break;
            case 'auth/email-already-in-use':
                setFormError(i18n.t('error.emailAlreadyInUse'))
                break;
            default:
                setFormError(error.message)
        }
    }

    const onSignUp = () => {
        if (validateFields()) {
            firebase.auth()
                .createUserWithEmailAndPassword(email, password)
                .then(userCredentials => {
                    const user = userCredentials.user;

                    showMessage({
                        message: i18n.get('userRegistered'),
                        type: "success",
                        icon: { icon: "success", position: "left" },
                    });

                    firebase.firestore().collection("users")
                        .doc(user.uid)
                        .set({
                            email,
                            firstName,
                            lastName,
                            phoneNumber,
                            foodPrintPercentage: 100,
                            language: deviceLanguage,
                            creationDate: firebase.firestore.FieldValue.serverTimestamp(),
                            kitchens: []
                        }).then(() => {
                            firebase.auth().languageCode = deviceLanguage;
                            user.sendEmailVerification();
                        })
                })
                .catch(error => handleError(error))
        }
    }

    return (
        <KeyboardAvoidingView
            style={[theme.container, theme.flex1, { justifyContent: "flex-end" }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={{ flex: 1 }}></View>
            <View style={styles.logo}>
                <Image style={theme.imageLogoSplash} source={require('../../assets/minilogo.png')} />
            </View>
            <View style={styles.content}>
                <View style={theme.inputContainer}>
                    <TextInput
                        placeholder={i18n.t('email')}
                        placeholderTextColor={theme.inputPlaceholderColor.color}
                        autoCorrect={false}
                        autoComplete="off"
                        autoFocus={false}
                        onBlur={() =>
                            setFormError("")
                        }
                        onChangeText={(email) => {
                            setEmail(email)
                            setFormError("")
                        }}
                        style={theme.input}
                    />
                    <TextInput
                        placeholder={i18n.t('firstName')}
                        placeholderTextColor={theme.inputPlaceholderColor.color}
                        autoCorrect={false}
                        autoComplete="off"
                        autoFocus={false}
                        onBlur={() =>
                            setFormError("")
                        }
                        onChangeText={(firstName) => {
                            setFirstName(firstName)
                            setFormError("")
                        }}
                        style={theme.input}
                    />
                    <TextInput
                        placeholder={i18n.t('lastName')}
                        placeholderTextColor={theme.inputPlaceholderColor.color}
                        autoCorrect={false}
                        autoComplete="off"
                        autoFocus={false}
                        onBlur={() =>
                            setFormError("")
                        }
                        onChangeText={(lastName) => {
                            setLastName(lastName)
                            setFormError("")
                        }}
                        style={theme.input}
                    />
                    <TextInput
                        placeholder={i18n.t('phoneNumber')}
                        placeholderTextColor={theme.inputPlaceholderColor.color}
                        autoCorrect={false}
                        autoComplete="off"
                        autoFocus={false}
                        onBlur={() =>
                            setFormError("")
                        }
                        onChangeText={(phoneNumber) => {
                            setPhoneNumber(phoneNumber)
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
                        onBlur={() =>
                            setFormError("")
                        }
                        onChangeText={(password) => {
                            setPassword(password)
                            setFormError("")
                        }}
                        style={theme.input}
                        secureTextEntry
                    />


                    {formError.length > 0 &&
                        <Text style={theme.errorMessage}>{formError}</Text>
                    }
                </View>
                <View style={[styles.buttonContainer, theme.buttonContainer]}>
                    <TouchableOpacity
                        onPress={onSignUp}
                        style={[theme.button, theme.button]}
                    >
                        <Text style={theme.buttonText}>{i18n.t('register')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={backToLogin}
                        style={[theme.button, theme.buttonOutline]}
                    >
                        <Text style={theme.buttonOutlineText}>{i18n.t('back')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    )
}

export default RegisterScreen

const styles = ScaledSheet.create({
    logo: {
        flex: 3,
        justifyContent: 'center',
        alignItems: 'center'
    },
    image: {
        width: '350@ms',
        height: '350@ms'
    },
    header: {
        flex: 1,
        alignItems: 'flex-start'
    },
    content: {
        flex: 5,
        justifyContent: 'center',
        alignItems: 'center'
    },
    buttonContainer: {
        marginTop: '40@mvs'
    },
    headerIcon: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: '20@ms'
    }
})