import intervalToDuration from 'date-fns/intervalToDuration';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, TouchableOpacity, View, Image } from 'react-native';
import { Badge, Button, Card, Icon, LinearProgress, Text, Header, Avatar } from 'react-native-elements';
import { moderateScale, moderateVerticalScale, ScaledSheet } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { theme } from '../../css/theme';
import { getI18n } from '../../i18n/translationService';
import { fetchUser } from '../../redux/actions/index';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import SplashScreen from '../common/Splash';
import { checkPushNotificationStatus, registerForPushNotificationsAsync, updateNotifications, scheduleDailyPushNotification, USER_RECEIVED_AND_APP_WAS_OPEN, USER_ENTER_APP_CLICKING_NOTIFICATION } from '../service/notificationService';
import { Linking } from "react-native";
import * as Notifications from 'expo-notifications';

function HomeScreen(props, { navigation }) {
    const insets = useSafeAreaInsets();
    const [kitchensInfo, setKitchensInfo] = useState({});
    const [pageIsReady, setPageIsReady] = useState(false);
    const [kitchenNumber, setKitchenNumber] = useState(0);
    const [pushNotifcationStatus, setPushNotificationStatus] = useState("undetermined");

    const langCode = props.currentUser?.language;
    const i18n = props.currentUser?.language ? getI18n(props.currentUser.language) : getI18n();
    const place = 'Home';
    const currentUser = props.currentUser;
    const foodPrintPercentageValue = currentUser?.foodPrintPercentage ?
        currentUser?.foodPrintPercentage === 100 ? 1 : (('0.' + currentUser?.foodPrintPercentage) / 1)
        : 0;

    const navigateToAddKitchen = () => {
        props.navigation.replace("AddKitchen");
    }
    const navigateToKitchen = (kitchenId) => {
        props.navigation.replace('Main', { screen: 'Kitchen', params: { kitchenId } });
    }
    const navigateToShoppingList = (kitchenId) => {
        props.navigation.replace('Main', { screen: 'ShoppingList', params: { kitchenId } });
    }

    const notificationListener = useRef();
    const responseListener = useRef();

    const getKitchenInfo = async (kitchensArray) => {
        let internalKitchensInfo = {};
        if (kitchensArray.length > 0) {
            await firebase.firestore()
                .collection('kitchens')
                .where(firebase.firestore.FieldPath.documentId(), 'in', kitchensArray)
                .get()
                .then(kitchens => kitchens.forEach(singleKitchen => {
                    const singleKitchenData = singleKitchen.data();
                    const allProductsInKitchen = singleKitchenData.productsList;
                    const allProductsInShoppingList = singleKitchenData.shoppingList;
                    let totalInstancesInKitchen = 0;
                    let totalExpiredInstancesInKitchen = 0;
                    let totalInstancesInShoppingList = 0;
                    let totalExpiredInstancesInShoppingList = 0;

                    for (let key in allProductsInKitchen) {
                        const product = allProductsInKitchen[key];
                        totalInstancesInKitchen = totalInstancesInKitchen + product.instances.length;
                        const now = new Date().getTime();
                        product.instances.forEach(instance => {
                            const expirationDate = instance.statusExpirationDate ? instance.statusExpirationDate : instance.expirationDate;
                            if (expirationDate) {
                                const duration = intervalToDuration({ start: now, end: expirationDate });
                                if (expirationDate < now || (duration.days < 3 && duration.years === 0 && duration.months === 0 && duration.years === 0)) {
                                    totalExpiredInstancesInKitchen = totalExpiredInstancesInKitchen + 1;
                                }
                            }
                        })
                    }

                    for (let key in allProductsInShoppingList) {
                        const product = allProductsInShoppingList[key];
                        totalInstancesInShoppingList = totalInstancesInShoppingList + product.instances.length;
                        const now = new Date().getTime();
                        product.instances.forEach(instance => {
                            const expirationDate = instance.statusExpirationDate ? instance.statusExpirationDate : instance.expirationDate;
                            if (expirationDate) {
                                const duration = intervalToDuration({ start: now, end: expirationDate });
                                if (expirationDate < now || (duration.days < 3 && duration.years === 0 && duration.months === 0 && duration.years === 0)) {
                                    totalExpiredInstancesInShoppingList = totalExpiredInstancesInShoppingList + 1;
                                }
                            }
                        })
                    }

                    internalKitchensInfo[singleKitchen.id] = {
                        totalInstancesInKitchen,
                        totalExpiredInstancesInKitchen,
                        totalInstancesInShoppingList,
                        totalExpiredInstancesInShoppingList,
                        name: singleKitchenData.name
                    }
                }));

            setKitchensInfo(internalKitchensInfo);
        }
    }

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });

    useEffect(() => {
        const loadData = async () => {
            const status = await checkPushNotificationStatus()
            setPushNotificationStatus(status);
            if (status == 'granted') {
                await registerForPushNotificationsAsync();
                await scheduleDailyPushNotification(langCode);

                if (!notificationListener.current) {
                    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                        updateNotifications(notification, USER_RECEIVED_AND_APP_WAS_OPEN)
                    });
                }

                if (!responseListener.current) {
                    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                        updateNotifications(response, USER_ENTER_APP_CLICKING_NOTIFICATION)
                    });
                }
            }
        };

        if (props.currentUser && !props.currentUser.firstName) {
            props.fetchUser();
        }

        if (props.currentUser) {
            console.log("MI CHIAMA")
            let userKitchensArray = [];
            props.currentUser?.kitchens?.forEach(kitchen => {
                userKitchensArray.push(kitchen.UIDKitchen)
            })

            setKitchenNumber(props.currentUser?.kitchens ? props.currentUser?.kitchens?.length : 0);
            getKitchenInfo(userKitchensArray)
                .then(() => {
                    setPageIsReady(true);
                })

            loadData();
        }
        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [currentUser, pushNotifcationStatus, navigation]);

    if (!pageIsReady) {
        return (
            <SplashScreen />
        )
    } else {
        return (
            <View style={[theme.flex1, theme.container]}>
                <View style={{
                    flex: 1,
                    marginTop: insets.top,
                    marginBottom: 0,
                    marginLeft: insets.left,
                    marginRight: insets.right
                }}>
                    <View style={[{
                        flexDirection: 'row',
                        alignItems: 'center',
                        height: moderateScale(60)
                    }]}>
                        <TouchableOpacity style={[
                            theme.flex1,
                            {
                                alignItems: 'flex-start',
                                marginLeft: moderateScale(10)
                            }]}>
                            <Icon
                                size={moderateScale(30)}
                                name='bell'
                                type='material-community'
                                color='#fff'
                                onPress={() => props.navigation.navigate("Notification")}
                                activeOpacity={0.7}
                                imageProps={{ transition: false }}
                            />
                        </TouchableOpacity>
                        <View style={{ flex: 3, alignItems: 'center' }}>
                            <Image
                                style={theme.title}
                                imageProps={{ transition: false }}
                                source={require('../../assets/foodybank_title.png')} />
                        </View>
                        <TouchableOpacity
                            onPress={() => props.navigation.navigate("User")}
                            style={[theme.flex1,
                            {
                                alignItems: 'flex-end',
                                marginRight: moderateScale(10)
                            }]}>
                            {currentUser?.profileImageUrl ? <Avatar
                                size={moderateScale(30)}
                                rounded
                                imageProps={{ transition: false }}
                                source={{ uri: currentUser.profileImageUrl }}
                                activeOpacity={0.7} />
                                : <Avatar
                                    size={moderateScale(30)}
                                    rounded
                                    icon={{ name: 'user', type: 'font-awesome', color: theme.container.backgroundColor }}
                                    source={{ uri: 'https://' }} //added to remove ReactImageView: Image source "null" doesn't exist
                                    onPress={() => props.navigation.navigate("User")}
                                    activeOpacity={0.7}
                                    containerStyle={{ backgroundColor: 'white' }}
                                />}

                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={{ marginLeft: moderateScale(20), marginRight: moderateScale(20) }}>
                            <Text style={theme.whiteTitle} h2>{i18n.t('hello')} {currentUser?.firstName}</Text>
                        </View>
                        {kitchenNumber > 0 && pushNotifcationStatus != 'granted' && pushNotifcationStatus != 'expo-device' && <Card containerStyle={{
                            marginTop: moderateScale(15),
                            backgroundColor: theme.cardContainer.backgroundColor,
                            color: theme.whiteFont.color,
                            borderRadius: moderateScale(12),
                            borderWidth: 0
                        }}>
                            <TouchableOpacity style={theme.cardIconTextContainer}
                                onPress={async () => {
                                    const status = await checkPushNotificationStatus();
                                    if (status == 'denied') {
                                        Linking.openSettings();
                                    } else if (status == 'undetermined') {
                                        await registerForPushNotificationsAsync();
                                        setPushNotificationStatus(status);
                                    } else {
                                        setPushNotificationStatus(status);
                                    }
                                }}
                            >
                                <View style={theme.cardTextContainer}>
                                    <Text style={theme.whiteTitle} h4>{i18n.t(`pushNotifications.${pushNotifcationStatus}.title`)}</Text>
                                    <Text style={[theme.greyFont, {
                                        marginTop: moderateScale(10)
                                    }]} h5>{i18n.t('pushNotifications.' + pushNotifcationStatus + ".subTitle")}</Text>
                                </View>
                                <LottieView
                                    style={{ width: moderateScale(80) }}
                                    autoPlay
                                    source={require('../../assets/turnon.json')}
                                />
                            </TouchableOpacity>
                        </Card>}
                        <Card containerStyle={{
                            marginTop: moderateScale(15),
                            backgroundColor: theme.cardContainer.backgroundColor,
                            color: theme.whiteFont.color,
                            borderRadius: moderateScale(12),
                            borderWidth: 0
                        }}>
                            <TouchableOpacity style={theme.cardIconTextContainer}
                                onPress={() => props.navigation.navigate("Achievement")}
                            >
                                <View style={theme.cardTextContainer}>
                                    <Text style={theme.whiteTitle} h4>{i18n.t('foodCheck')}</Text>
                                    <Text style={[theme.greyFont, {
                                        marginTop: moderateScale(10)
                                    }]} h5>{i18n.t('foodPrint')}</Text>
                                    <Text style={[theme.whiteTitle, {
                                        marginTop: moderateScale(10)
                                    }]} h5>🌕 {currentUser?.foodPrintPercentage} FOODY</Text>
                                </View>
                                <LottieView
                                    style={styles.image}
                                    autoPlay
                                    source={require('../../assets/foodprint.json')}
                                />
                            </TouchableOpacity>
                        </Card>
                        {currentUser?.kitchens?.map((kitchen, i) => {
                            const kitchenInfo = kitchensInfo ? kitchensInfo[kitchen.UIDKitchen] : {};

                            const productPercentageValue = kitchenInfo ? (kitchenInfo.totalInstancesInKitchen - kitchenInfo.totalExpiredInstancesInKitchen) / kitchenInfo.totalInstancesInKitchen : 0;
                            const productBadgeLabel = kitchenInfo ? ' ' + (kitchenInfo.totalInstancesInKitchen - kitchenInfo.totalExpiredInstancesInKitchen) + '/' + kitchenInfo.totalInstancesInKitchen + ' ' : ' ';
                            const shoppingListPercentageValue = kitchenInfo ? (kitchenInfo.totalInstancesInShoppingList - kitchenInfo.totalExpiredInstancesInShoppingList) / kitchenInfo.totalInstancesInShoppingList : 0;
                            const shoppingListBadgeValue = kitchenInfo ? ' ' + kitchenInfo.totalInstancesInShoppingList + '/' + kitchenInfo.totalInstancesInShoppingList + ' ' : ' ';

                            return (
                                <View key={i}>
                                    <View style={{ marginTop: moderateScale(20), flexDirection: 'row' }}>
                                        <View style={{ flex: 2, marginLeft: moderateScale(20) }}>
                                            <Text key={i} style={theme.whiteTitle} h4>{kitchenInfo?.name}</Text>
                                        </View>
                                        <View style={{ flex: 1, marginRight: moderateScale(20) }}>
                                            {kitchen?.isOwner === true && <Button
                                                onPress={() => props.navigation.navigate("EditKitchen", kitchen.UIDKitchen)}
                                                title={i18n.t('edit')}
                                                icon={{
                                                    name: 'edit',
                                                    type: 'font-awesome',
                                                    size: moderateScale(15),
                                                    color: 'white'
                                                }}
                                                iconRight
                                                titleStyle={{
                                                    fontWeight: '700',
                                                    fontSize: moderateScale(15)
                                                }}
                                                buttonStyle={{
                                                    backgroundColor: theme.button.backgroundColor,
                                                    borderColor: 'transparent',
                                                    borderWidth: 0,
                                                    borderRadius: moderateScale(8),
                                                    padding: moderateVerticalScale(3),
                                                }}
                                                type="solid"
                                            />}
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row' }}>
                                        <View style={{ flex: 1 }}>
                                            <Card containerStyle={{
                                                backgroundColor: theme.cardContainer.backgroundColor,
                                                color: theme.whiteFont.color,
                                                borderRadius: moderateScale(12),
                                                borderWidth: 0
                                            }}>
                                                <TouchableOpacity
                                                    style={{
                                                        alignItems: 'flex-start',
                                                    }}
                                                    onPress={() => navigateToKitchen(kitchen.UIDKitchen)}
                                                >
                                                    <View style={{ width: moderateScale(50) }}>
                                                        <LottieView
                                                            style={styles.kitchen}
                                                            autoPlay
                                                            source={require('../../assets/kitchen.json')}
                                                        />
                                                    </View>
                                                    <View style={theme.cardIconTextContainer}>
                                                        <View style={theme.cardTextContainer}>
                                                            <Text style={[theme.whiteTitle, {
                                                                marginTop: moderateScale(10)
                                                            }]} h5>{i18n.t('products')}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={{ flexDirection: 'row' }}>
                                                        <View style={{ flex: 1 }}>
                                                            <LinearProgress
                                                                style={{ marginVertical: 10 }}
                                                                value={productPercentageValue}
                                                                variant="determinate"
                                                                color={theme.kitchen.backgroundColor}
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1, alignItems: 'flex-start', marginLeft: moderateScale(5) }}>
                                                            <Badge value={productBadgeLabel}
                                                                textStyle={{
                                                                    color: theme.whiteFont.color,
                                                                    fontWeight: '700'
                                                                }}
                                                                badgeStyle={{
                                                                    backgroundColor: theme.kitchen.color,
                                                                    borderWidth: 0
                                                                }} />
                                                        </View>
                                                    </View>

                                                </TouchableOpacity>

                                            </Card>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Card containerStyle={{
                                                backgroundColor: theme.cardContainer.backgroundColor,
                                                color: theme.whiteFont.color,
                                                borderRadius: moderateScale(12),
                                                borderWidth: 0
                                            }}>
                                                <TouchableOpacity
                                                    style={{
                                                        alignItems: 'flex-start'

                                                    }}
                                                    onPress={() => navigateToShoppingList(kitchen.UIDKitchen)}
                                                >
                                                    <View style={{ width: moderateScale(50) }}>
                                                        <LottieView
                                                            style={styles.shoppingList}
                                                            autoPlay
                                                            source={require('../../assets/shoppingList.json')}
                                                        />
                                                    </View>
                                                    <View style={theme.cardIconTextContainer}>
                                                        <View style={theme.cardTextContainer}>
                                                            <Text style={[theme.whiteTitle, {
                                                                marginTop: moderateScale(10)
                                                            }]} h5>{i18n.t('shoppingList')}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={{ flexDirection: 'row' }}>
                                                        <View style={{ flex: 1 }}>
                                                            <LinearProgress
                                                                style={{ marginVertical: 10 }}
                                                                value={shoppingListPercentageValue}
                                                                variant="determinate"
                                                                color={theme.orange.backgroundColor}
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1, alignItems: 'flex-start', marginLeft: moderateScale(5) }}>
                                                            <Badge value={shoppingListBadgeValue}
                                                                textStyle={{
                                                                    color: theme.whiteFont.color,
                                                                    fontWeight: '700'
                                                                }}
                                                                badgeStyle={{
                                                                    backgroundColor: theme.shoppingList.color,
                                                                    borderWidth: 0
                                                                }} />
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            </Card>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                        }
                        <Card containerStyle={{
                            backgroundColor: theme.cardContainer.backgroundColor,
                            color: theme.whiteFont.color,
                            borderRadius: moderateScale(12),
                            borderWidth: 0,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            marginTop: moderateScale(25)
                        }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                }}
                                onPress={navigateToAddKitchen}
                            >
                                <Icon
                                    name='plus-circle'
                                    type='font-awesome-5'
                                    color={theme.whiteFont.color}
                                    size={moderateScale(25)}
                                    iconStyle={{
                                        padding: moderateScale(15),
                                        borderRadius: moderateScale(10),
                                    }}
                                    backgroundColor={theme.button.backgroundColor}
                                />
                                <Text style={[theme.whiteTitle, {
                                    marginTop: moderateScale(10),
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    textAlign: 'center',
                                }]} h3>{i18n.t('addNewKitchen')}</Text>
                            </TouchableOpacity>
                        </Card>
                    </ScrollView >
                </View >
            </View>
        );
    }
}


const styles = ScaledSheet.create({
    image: {
        width: '100@ms',
        height: '100@ms',
    },
    icon: {
        width: '50@ms',
        height: '50@ms',
    },
    kitchen: {
        height: '80@mvs'
    },
    shoppingList: {
        height: '80@mvs'
    },
    title: {
        width: '180@ms',
        height: '30@mvs',
        resizeMode: 'contain'
    }
});

const mapStateToProps = (store) => ({
    currentUser: store.userState.currentUser
})

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchUser }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(HomeScreen);