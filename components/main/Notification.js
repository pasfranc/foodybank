import * as Haptics from 'expo-haptics';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar, Badge, BottomSheet, Button, Card, CheckBox, Header, Icon, Image, ListItem, Text } from 'react-native-elements';
import { moderateScale, moderateVerticalScale } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { theme } from '../../css/theme';
import { getI18n } from '../../i18n/translationService';
import HeaderComponent from '../common/Header';
import { generateRandomId } from '../../utils/utilsService';
import { showMessage } from "react-native-flash-message";
require("firebase/compat/firestore");
require("firebase/compat/storage");
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import SplashScreen from '../common/Splash';
import { registerForPushNotificationsAsync, schedulePushNotification, cancelAllNotifications, getAllNotifications } from '../service/notificationService';

function NotificationScreen(props, { navigation }) {

    const [pageIsReady, setPageIsReady] = useState(false);
    const projectId = Constants.expoConfig.extra.eas.projectId;
    const currentUser = props.currentUser;
    const isAndroid = Platform.OS === 'android' ? true : false;
    const kitchenFilterList = ["all", "open", "frozen", "expiring"];
    const paramsFilter = props?.filter ? kitchenFilterList.includes(props.filter) ? props.filter : 'all' : 'all';
    const [search, setSearch] = useState(null);
    const [filter, setFilter] = useState(paramsFilter);

    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(false);
    const notificationListener = useRef();
    const responseListener = useRef();

    const i18n = props.currentUser?.language ? getI18n(props.currentUser.language) : getI18n();
    const place = i18n.t('notification');

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log(response);
        });
        setPageIsReady(true);

        return () => {

            Notifications.removeNotificationSubscription(notificationListener.current);
            Notifications.removeNotificationSubscription(responseListener.current);
        };

    }, []);

    getAllNotifications();

    if (!pageIsReady) {
        return (
            <SplashScreen />
        )
    } else {
        return (
            <View style={[theme.flex1, theme.container]}>
                <HeaderComponent place={place} navigation={props.navigation} currentUser={currentUser} />
                <View style={{ alignItems: 'center' }}>
                    <View style={{ width: '90%' }}>
                        <TextInput
                            placeholder={i18n.t('search')}
                            placeholderTextColor={theme.inputPlaceholderColor.color}
                            autoCorrect={false}
                            autoComplete="off"
                            autoFocus={false}
                            style={theme.inputBlack}
                            value={search}
                            onChangeText={(search) =>
                                changeSearch(search)
                            }
                        />
                    </View>

                    <View style={{ flexDirection: 'row', width: '90%', marginTop: moderateVerticalScale(10) }}>
                        <View style={[theme.flex1, { alignItems: 'center' }]}>
                            <TouchableOpacity
                                onPress={() => {
                                    const filter = 'all';
                                    changeFilter(filter);
                                }}
                                style={filter === 'all' ? [theme.smallBadgeSelectedButton, { marginBottom: moderateVerticalScale(10) }] : [theme.smallBadgeButton, { marginBottom: moderateVerticalScale(10) }]}
                            >
                                <Text style={filter === 'all' ? theme.smallBadgeSelectedButtonText : theme.smallBadgeButtonText}>{i18n.t('filter.all')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[theme.flex1, { alignItems: 'center' }]}>
                            <TouchableOpacity
                                onPress={() => {
                                    const filter = 'open';
                                    changeFilter(filter);
                                }}
                                style={filter === 'open' ? [theme.smallBadgeSelectedButton, { marginBottom: moderateVerticalScale(10) }] : [theme.smallBadgeButton, { marginBottom: moderateVerticalScale(10) }]}
                            >
                                <Text style={filter === 'open' ? theme.smallBadgeSelectedButtonText : theme.smallBadgeButtonText}>{i18n.t('filter.open')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[theme.flex1, { alignItems: 'center' }]}>
                            <TouchableOpacity
                                onPress={() => {
                                    const filter = 'frozen';
                                    changeFilter(filter);
                                }}
                                style={filter === 'frozen' ? [theme.smallBadgeSelectedButton, { marginBottom: moderateVerticalScale(10) }] : [theme.smallBadgeButton, { marginBottom: moderateVerticalScale(10) }]}
                            >
                                <Text style={filter === 'frozen' ? theme.smallBadgeSelectedButtonText : theme.smallBadgeButtonText}>{i18n.t('filter.frozen')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[theme.flex1, { alignItems: 'center' }]}>
                            <TouchableOpacity
                                onPress={() => {
                                    const filter = 'expiring';
                                    changeFilter(filter);
                                }}
                                style={filter === 'expiring' ? [theme.smallBadgeSelectedButton, { marginBottom: moderateVerticalScale(10) }] : [theme.smallBadgeButton, { marginBottom: moderateVerticalScale(10) }]}
                            >
                                <Text style={filter === 'expiring' ? theme.smallBadgeSelectedButtonText : theme.smallBadgeButtonText}>{i18n.t('filter.expiring')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                <View style={{ flex: 8 }}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={theme.whiteFont}>Your expo push token: {expoPushToken}</Text>
                            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={theme.whiteFont}>Title: {notification && notification.request.content.title} </Text>
                                <Text style={theme.whiteFont}>Body: {notification && notification.request.content.body}</Text>
                                <Text style={theme.whiteFont}>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
                            </View>
                            <Button
                                title="Press to schedule a notification"
                                onPress={async () => {
                                    await schedulePushNotification();
                                }}
                            />
                            <Button
                                title="Cancel notification"
                                onPress={async () => {
                                    await cancelAllNotifications();
                                }}
                            />
                        </View>
                    </ScrollView >
                </View>
            </View>
        );
    }
}

const mapStateToProps = (store) => ({
    currentUser: store.userState.currentUser
})

const mapDispatchToProps = (dispatch) => bindActionCreators({}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(NotificationScreen);