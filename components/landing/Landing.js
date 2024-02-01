import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useRef } from 'react';
import { Dimensions, Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-elements';
import { ScaledSheet } from 'react-native-size-matters';
import { theme } from '../../css/theme';
import { getI18n } from '../../i18n/translationService';
import LottieView from 'lottie-react-native';
import { moderateVerticalScale, moderateScale } from 'react-native-size-matters';

export default function LandingScreen({ navigation }) {

    const landing1animation = useRef(null);
    const landing2animation = useRef(null);
    const landing3animation = useRef(null);
    const landing4animation = useRef(null);

    const i18n = getI18n();
    const { width } = Dimensions.get('window');
    const [currentScreenIndex, setCurrentScreenIndex] = useState(null);

    useEffect(() => {
        setCurrentScreenIndex(0);
        landing1animation.current?.reset();
        landing1animation.current?.play();
    }, []);

    useEffect(() => {
        if (currentScreenIndex === 0) {
            landing1animation.current?.reset();
            landing1animation.current?.play();
        } else if (currentScreenIndex === 1) {
            landing2animation.current?.reset();
            landing2animation.current?.play();
        } else if (currentScreenIndex === 2) {
            landing3animation.current?.reset();
            landing3animation.current?.play();
        } else {
            landing4animation.current?.reset();
            landing4animation.current?.play();
        }
    }, [currentScreenIndex]);

    const getContentOffset = (event) => {
        return parseInt(event.nativeEvent.contentOffset.x);
    }

    const handleScroll = (event) => {
        /* This is needed for Android */
        if (getContentOffset(event) === 0) {
            setCurrentScreenIndex(0);
        } else {
            setCurrentScreenIndex(parseInt(getContentOffset(event) / (~~Dimensions.get('window').width)));
        }
    }

    const storeAlreadyVisitedLanding = async () => {
        try {
            await AsyncStorage.setItem('@landingVisited', "true");
        } catch (error) {
            console.error(error);
        }
    }

    const navigateLogin = async () => {
        await storeAlreadyVisitedLanding();
        navigation.navigate("Login");
    }

    return (
        <View style={[theme.flex1, theme.container]}>
            <View style={styles(width).landingImageContainer}>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    <View style={styles(width).imageContainer}>
                        <View style={theme.flex1} />
                        <View style={styles(width).boxImage}>
                            <LottieView
                                ref={landing1animation}
                                style={{
                                    width: width,
                                }}
                                source={require('../../assets/images/landing/landing1.json')}
                            />
                        </View>
                        <View style={styles(width).boxText}>
                            <Text style={styles(width).titleText} h2>{i18n.t('landing1')}</Text>
                        </View>
                    </View>
                    <View style={styles(width).imageContainer}>
                        <View style={theme.flex1} />
                        <View style={styles(width).boxImage}>
                            <LottieView
                                ref={landing2animation}
                                style={{
                                    width: width,
                                }}
                                source={require('../../assets/images/landing/landing2.json')}
                            />
                        </View>
                        <View style={styles(width).boxText}>
                            <Text style={styles(width).titleText} h2>{i18n.t('landing2')}</Text>
                        </View>
                    </View>
                    <View style={styles(width).imageContainer}>
                        <View style={theme.flex1} />
                        <View style={styles(width).boxImage}>
                            <LottieView
                                ref={landing3animation}
                                style={{
                                    width: width - 100
                                }}
                                source={require('../../assets/images/landing/landing3.json')}
                            />
                        </View>
                        <View style={styles(width).boxText}>
                            <Text style={styles(width).titleText} h2>{i18n.t('landing3')}</Text>
                        </View>
                    </View>
                    <View style={styles(width).imageContainer}>
                        <View style={theme.flex1} />
                        <View style={styles(width).boxImage}>
                            <LottieView
                                ref={landing4animation}
                                style={{
                                    width: width,
                                    backgroundColor: 'white'
                                }}
                                source={require('../../assets/images/landing/landing4.json')}
                            />
                        </View>
                        <View style={styles(width).boxText}>
                            <Text style={styles(width).titleText} h2>{i18n.t('landing4')}</Text>
                        </View>
                    </View>
                </ScrollView>
            </View >


            <View style={styles(width).circlesContainer}>
                <View style={styles(width).circlesBox}>
                    <View style={styles(width).circlesPadding}>
                        <TouchableOpacity
                            style={currentScreenIndex === 0 ? styles(width).blueCircle : styles(width).circle}
                        />
                    </View>
                    <View style={styles(width).circlesPadding}>
                        <TouchableOpacity
                            style={currentScreenIndex === 1 ? styles(width).blueCircle : styles(width).circle}
                        />
                    </View>
                    <View style={styles(width).circlesPadding}>
                        <TouchableOpacity
                            style={currentScreenIndex === 2 ? styles(width).blueCircle : styles(width).circle}
                        />
                    </View>
                    <View style={styles(width).circlesPadding}>
                        <TouchableOpacity
                            style={currentScreenIndex === 3 ? styles(width).blueCircle : styles(width).circle}
                        />
                    </View>
                </View>
                {currentScreenIndex == 3 &&
                    <View style={theme.buttonContainer}>
                        <TouchableOpacity
                            onPress={navigateLogin}
                            style={theme.button}
                        >
                            <Text style={theme.buttonText}>{i18n.t('signInWithEmail')}</Text>
                        </TouchableOpacity>
                    </View>
                }
            </View>

        </View >
    )
}
const styles = (width) => ScaledSheet.create({
    landingImageContainer: {
        flex: 3,
        flexDirection: 'row'
    },
    titleText: {
        textAlign: 'center',
        fontWeight: 'bold',
        color: 'white'
    },
    boxText: {
        flex: 1,
        justifyContent: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    imageContainer: {
        flex: 1,
        width: width
    },
    boxImage: {
        flex: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '90%',
        height: '90%',
        resizeMode: 'cover'
    },
    circlesContainer: {
        flex: 1,
        alignItems: 'center'
    },
    circlesBox: {
        flexDirection: 'row',
        paddingTop: '20@s',
        paddingBottom: '20@s'
    },
    circlesPadding: {
        padding: '10@s'
    },
    circle: {
        width: '20@ms',
        height: '20@ms',
        borderRadius: '10@ms',
        backgroundColor: 'white'
    },
    blueCircle: {
        width: '20@ms',
        height: '20@ms',
        borderRadius: '10@ms',
        backgroundColor: '#0782F9'
    }
})