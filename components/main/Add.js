import { Camera, CameraType } from 'expo-camera';
import { FlipType, manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { moderateVerticalScale } from 'react-native-size-matters';
import { theme } from '../../css/theme';
import { getI18n } from '../../i18n/translationService';
import PermissionScreen from '../common/Permission';
import HeaderComponent from '../common/Header';

export default function Add(props, { navigation }) {
    const [type, setType] = useState(CameraType.back);
    const [camera, setCamera] = useState(null);
    const [image, setImage] = useState(null);
    const [permission, requestPermission] = Camera.useCameraPermissions();
    const [hasGalleryPermission, setHasGalleryPermission] = useState(null);
    const place = null;

    const imageType = props.route.params.imageType;
    const productKey = props.route.params?.productKey;
    const kitchenId = props.route.params?.kitchenId;
    const instancesStatus = props.route.params?.instancesStatus;
    const language = props.route.params?.language;
    const listToConsider = props.route.params?.listToConsider;
    const instancesToAdd = props.route.params?.instancesToAdd;
    const i18n = language ? getI18n(language) : getI18n();

    useEffect(() => {
        (async () => {
            const hasGalleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            setHasGalleryPermission(hasGalleryPermission.status === 'granted');
        })();
    }, [])

    const takePicture = async () => {
        if (camera) {
            let photo = await camera.takePictureAsync();
            if (type === 'front') {
                photo = await manipulateAsync(
                    photo.localUri || photo.uri,
                    [
                        { rotate: 180 },
                        { flip: FlipType.Vertical },
                    ]
                );
            }
            setImage(photo.uri);
        }
    }

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    if (!permission && !hasGalleryPermission) {
        return <View />;
    }

    if (!permission?.granted && !hasGalleryPermission?.granted) {
        return (
            <PermissionScreen />
        );
    }

    function toggleCameraType() {
        setType((current) => (
            current === CameraType.back ? CameraType.front : CameraType.back
        ));
    }

    return (
        <View style={[theme.flex1, theme.container]}>

            <HeaderComponent place={place} parentScreen="Add" navigation={props.navigation} currentUser={null} />


            <View style={{ flex: 3 }}>
                {!image && <Camera
                    ref={ref => setCamera(ref)}
                    style={styles.fixedRatio}
                    type={type}
                    mirrorImage={true}
                    fixOrientation={true}
                //ratio={'1:1'}
                />}
                {image && <Image source={{ uri: image }} style={{ flex: 1 }} />}
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={theme.buttonContainer}>
                    {!image &&
                        <TouchableOpacity
                            onPress={toggleCameraType}
                            style={[theme.button, { marginTop: moderateVerticalScale(10), marginBottom: moderateVerticalScale(10) }]}
                        >
                            <Text style={theme.buttonText}>{i18n.t('flipImage')}</Text>
                        </TouchableOpacity>
                    }
                    {!image &&
                        <TouchableOpacity
                            onPress={() => takePicture()}
                            style={[theme.button, { marginBottom: moderateVerticalScale(10) }]}
                        >
                            <Text style={theme.buttonText}>{i18n.t('takePicture')}</Text>
                        </TouchableOpacity>
                    }
                    {!image &&
                        <TouchableOpacity
                            onPress={() => pickImage()}
                            style={[theme.button, { marginBottom: moderateVerticalScale(10) }]}
                        >
                            <Text style={theme.buttonText}>{i18n.t('pickImage')}</Text>
                        </TouchableOpacity>
                    }
                    {image &&
                        <TouchableOpacity
                            onPress={() => setImage(null)}
                            style={[theme.button, { marginTop: moderateVerticalScale(10), marginBottom: moderateVerticalScale(10) }]}
                        >
                            <Text style={theme.buttonText}>{i18n.t('discard')}</Text>
                        </TouchableOpacity>
                    }
                    {image &&
                        <TouchableOpacity
                            onPress={() => props.navigation.navigate("Save", { image, imageType, productKey, listToConsider, kitchenId, instancesStatus, instancesToAdd })}
                            style={[theme.button, { marginBottom: moderateVerticalScale(10) }]}
                        >
                            <Text style={theme.buttonText}>{i18n.t('save')}</Text>
                        </TouchableOpacity>
                    }
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cameraContainer: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
    },
    fixedRatio: {
        flex: 1,
        //aspectRatio: 1,
    }
});
