import * as ImageManipulator from 'expo-image-manipulator';
import firebase from 'firebase/compat/app';
import React, { useEffect } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { theme } from '../../css/theme';
import { showMessage } from "react-native-flash-message";
import { getI18n } from '../../i18n/translationService';
require("firebase/compat/firestore");
require("firebase/compat/storage");

export default function Save(props, { navigation }) {

    const imageType = props.route.params.imageType;
    const productKey = props.route.params?.productKey;
    const kitchenId = props.route.params?.kitchenId;
    const instancesStatus = props.route.params?.instancesStatus;
    const listToConsider = props.route.params?.listToConsider;
    const instancesToAdd = props.route.params?.instancesToAdd;
    const language = props.route.params?.language;
    const i18n = language ? getI18n(language) : getI18n();

    useEffect(() => {
        (() => {
            if (imageType === 'productPicture') {
                uploadProductPicture();
            } else {
                uploadImage();
            }
        })();
    }, [])

    const uploadProductPicture = async () => {
        const uri = props.route.params.image;
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 200 } }],
            { format: 'jpeg' }
        );

        const childPath = `productPictures/${firebase.auth().currentUser.uid}/${productKey}/${new Date().getTime()}`;
        const uploadedURL = await saveStorage(manipResult.uri, childPath);
        showMessage({
            message: i18n.get('addedImageWithSuccess'),
            type: "success",
            icon: { icon: "success", position: "left" },
        });
        props.navigation.replace('ScanProduct', { kitchenId, productKey, instancesStatus, uploadedURL, instancesToAdd });
    }


    const uploadImage = async () => {
        const uri = props.route.params.image;
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 200 } }],
            { format: 'jpeg' }
        );

        const childPath = `profileImages/${firebase.auth().currentUser.uid}/${Math.random().toString(36)}`;
        const uploadedURL = await saveStorage(manipResult.uri, childPath);
        saveProfileData(uploadedURL);
    }

    const saveStorage = async (image, path) => {

        const fileRef = firebase.storage().ref()
            .child(path);

        const response = await fetch(image);
        const blob = await response.blob();

        const task = await fileRef.put(blob);

        const downloadURL = await task.ref.getDownloadURL();

        return downloadURL;
    }

    const saveProfileData = (profileImageUrl) => {
        firebase
            .firestore()
            .collection('users')
            .doc(firebase.auth().currentUser.uid)
            .update({
                profileImageUrl,
                profileImageCreation: firebase.firestore.FieldValue.serverTimestamp()
            }).then((function () {
                showMessage({
                    message: i18n.get('addedImageWithSuccess'),
                    type: "success",
                    icon: { icon: "success", position: "left" },
                });
                props.navigation.replace("User");
            })).catch((err) => {
                console.log(err)
            })
    }
    return (
        <View style={[theme.flex1, theme.container]}>
            <Image source={{ uri: props.route.params.image }}></Image>
            <ActivityIndicator size="large" />
        </View>
    )
}
