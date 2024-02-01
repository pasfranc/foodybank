import "firebase/compat/auth";
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Avatar, Card, Text } from 'react-native-elements';
import { showMessage } from "react-native-flash-message";
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { moderateScale, moderateVerticalScale } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { theme } from '../../css/theme';
import { getI18n } from '../../i18n/translationService';
import HeaderComponent from '../common/Header';
import SplashScreen from '../common/Splash';
import { checkPushNotificationStatus, registerForPushNotificationsAsync } from '../service/notificationService';
import { DAILY_REWARD, addReward, getDailyRewards, getUserTutorial, KITCHEN_TUTORIAL } from '../service/rewardService';
import { ListItem, Icon } from 'react-native-elements';
import { Linking } from "react-native";


require("firebase/compat/storage");

const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-5503995443773859/1817896047';
const iosAdUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-5503995443773859/8548135558';

const androidRewarded = RewardedAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
    keywords: ['kitchen', 'grocery', 'shopping'],
});

const iosRewarded = RewardedAd.createForAdRequest(iosAdUnitId, {
    requestNonPersonalizedAdsOnly: true,
    keywords: ['kitchen', 'grocery', 'shopping'],
});

function AchievementScreen(props, { navigation }) {

    const [pageIsReady, setPageIsReady] = useState(false);
    const [rewardVisible, setRewardVisible] = useState(true);
    const [pushNotifcationStatus, setPushNotificationStatus] = useState("undetermined");
    const [reward, setReward] = useState(0);

    const [expandedKey, setExpandedKey] = useState(null);
    const [expandedArray, setExpandedArray] = useState([]);
    const [userTutorialList, setUserTutorialList] = useState([]);

    const currentUser = props.currentUser;
    const isAndroid = Platform.OS === 'android' ? true : false;
    const language = props.currentUser.language;

    const i18n = language ? getI18n(language) : getI18n();
    const place = i18n.t('achievementsHub');
    const tutorialList = i18n.t('tutorial.KITCHEN_TUTORIAL');
    let unsubscribeLoaded;
    let unsubscribeEarned;

    const expandKey = (tutorialKey) => {
        let updatedExpandedArray = expandedArray;
        if (expandedArray.includes(tutorialKey)) {
            setExpandedKey(null);
            updatedExpandedArray = expandedArray.filter(i => i != tutorialKey);
        } else {
            setExpandedKey(tutorialKey);
            updatedExpandedArray.push(tutorialKey);
        }
        setExpandedArray(updatedExpandedArray);
    }

    const assignRewards = async () => {
        let todayRewardedAmount = await getDailyRewards();

        if (todayRewardedAmount == 0) {
            const rew = getRandomReward();
            setReward(rew);
            setRewardVisible(false);
            await addReward(DAILY_REWARD, rew);
            showMessage({
                message: i18n.t('dailyRewardAmountText', { reward: rew }),
                type: "success",
                icon: { icon: "success", position: "left" },
            });
        } else {
            setReward(todayRewardedAmount);
            setRewardVisible(false);
        }
    }

    const getRandomReward = () => {
        const randomValue = Math.random(); // Generates a random value between 0 and 1

        if (randomValue < 0.6) {
            return 10; // 60% chance to receive 10
        } else if (randomValue < 0.9) {
            return 20; // 30% chance to receive 20
        } else {
            return 50; // 10% chance to receive 50
        }
    }

    const handleAndroidAds = () => {
        if (androidRewarded.loaded) {
            setPageIsReady(true);
        }
        unsubscribeLoaded = androidRewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
            console.log("MERDA CARICATA")
            setPageIsReady(true);
        });
        unsubscribeEarned = androidRewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            async () => {
                await assignRewards();
            },
        );

        // Start loading the rewarded ad straight away
        androidRewarded.load();
    }

    const handleIosAds = () => {
        if (iosRewarded.loaded) {
            setPageIsReady(true);
        }
        unsubscribeLoaded = iosRewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
            setPageIsReady(true);
        });
        unsubscribeEarned = iosRewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            async () => {
                await assignRewards();
            },
        );

        // Start loading the rewarded ad straight away
        iosRewarded.load();
    }

    useEffect(() => {

        const loadData = async () => {
            const status = await checkPushNotificationStatus()
            setPushNotificationStatus(status);

            const rewardedAmount = await getDailyRewards();

            if (rewardedAmount > 0) {
                setRewardVisible(false);
                setReward(rewardedAmount);
                setPageIsReady(true);
            } else {
                if (isAndroid) {
                    handleAndroidAds();
                } else {
                    handleIosAds();
                }
            }
            setUserTutorialList(await getUserTutorial(KITCHEN_TUTORIAL));
        };

        loadData();



        // Unsubscribe from events on unmount
        return () => {
            if (unsubscribeLoaded) {
                unsubscribeLoaded();
                unsubscribeEarned();
            }
        };
    }, []);

    if (!pageIsReady) {
        return (
            <SplashScreen />
        )
    } else {
        return (
            <View style={[theme.flex1, theme.container]}>
                <HeaderComponent place={place} navigation={props.navigation} currentUser={currentUser} />
                <View style={{ flex: 8 }}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View>
                            {pushNotifcationStatus != 'granted' && pushNotifcationStatus != 'expo-device' ? <Card containerStyle={{
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
                            </Card> :
                                <Card containerStyle={{
                                    marginTop: moderateScale(15),
                                    backgroundColor: theme.cardContainer.backgroundColor,
                                    color: theme.whiteFont.color,
                                    borderRadius: moderateScale(12),
                                    borderWidth: 0
                                }}>
                                    {rewardVisible ? <TouchableOpacity style={theme.cardIconTextContainer}
                                        onPress={() => {
                                            if (isAndroid) {
                                                androidRewarded.show();
                                            } else {
                                                iosRewarded.show();
                                            }
                                        }}
                                    >
                                        <View style={theme.cardTextContainer}>
                                            <Text style={theme.whiteTitle} h4>{i18n.t(`dailyReward`)}</Text>
                                            <Text style={[theme.greyFont, {
                                                marginTop: moderateScale(10)
                                            }]} h5>{i18n.t('dailyRewardText')}</Text>
                                        </View>
                                        <LottieView
                                            style={{ width: moderateScale(120) }}
                                            autoPlay
                                            source={require('../../assets/closedGift.json')}
                                        />
                                    </TouchableOpacity> :
                                        <View style={theme.cardIconTextContainer}>
                                            <View style={theme.cardTextContainer}>
                                                <Text style={theme.whiteTitle} h4>{i18n.t(`dailyReward`)}</Text>
                                                <Text style={[theme.whiteTitle, {
                                                    marginTop: moderateScale(10)
                                                }]} h5>{i18n.t('dailyRewardAmountText', { reward })}</Text>
                                                <Text style={[theme.greyFont, {
                                                    marginTop: moderateScale(10)
                                                }]} h5>{i18n.t('dailyRewardTakenText')}</Text>
                                            </View>
                                            <LottieView
                                                style={{ width: moderateScale(120) }}
                                                autoPlay
                                                source={require('../../assets/money.json')}
                                            />
                                        </View>
                                    }
                                </Card>
                            }
                            <View style={{ flex: 2, marginLeft: moderateScale(20), marginTop: moderateVerticalScale(10) }}>
                                <Text style={theme.whiteTitle} h4>{i18n.t('tutorial.kitchenTutorial')}</Text>
                            </View>
                            <Card containerStyle={{
                                marginTop: moderateVerticalScale(5),
                                backgroundColor: theme.cardContainer.backgroundColor,
                                color: theme.whiteFont.color,
                                borderRadius: moderateScale(12),
                                borderWidth: 0
                            }}>
                                <View style={theme.cardIconTextContainer}>
                                    <View style={theme.cardTextContainer}>
                                        <Text style={[theme.whiteTitle, {
                                            marginTop: -10
                                        }]} h5>{i18n.t('tutorial.kitchenTutorialText')}</Text>
                                        {tutorialList && Object.keys(tutorialList).map((tutorialKey) => {
                                            return (
                                                <ListItem.Accordion
                                                    containerStyle={{
                                                        marginTop: moderateVerticalScale(5),
                                                        padding: moderateScale(3)
                                                    }}
                                                    content={
                                                        <>
                                                            {userTutorialList.includes(tutorialKey) ? <Icon name="check-circle" size={20} color="green" />
                                                                :
                                                                <Icon name="checkbox-blank-circle-outline" type="material-community" size={20} color="green" />

                                                            }
                                                            <ListItem.Content>
                                                                <ListItem.Title>{i18n.t('tutorial.KITCHEN_TUTORIAL.' + tutorialKey)}</ListItem.Title>
                                                            </ListItem.Content>
                                                        </>
                                                    }
                                                    isExpanded={expandedArray.includes(tutorialKey)}
                                                    onPress={() => expandKey(tutorialKey)}
                                                    key={tutorialKey}
                                                >
                                                    <ListItem>
                                                        {<Avatar
                                                            size={moderateScale(50)}
                                                            rounded
                                                            source={{ uri: 'https://' }} //added to remove ReactImageView: Image source "null" doesn't exist
                                                            icon={{ name: 'youtube-square', type: 'font-awesome', color: 'red' }}
                                                            onPress={() => {
                                                                props.navigation.replace("Video", { language, videoUri: 'https://youtube.com/shorts/p8TpMHCyQ9o' });
                                                            }}
                                                        />}
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                props.navigation.replace("Video", { language, videoUri: 'https://youtube.com/shorts/p8TpMHCyQ9o' });
                                                            }}
                                                        >
                                                            <ListItem.Content>
                                                                <ListItem.Subtitle>{i18n.t('tutorial.kitchenTutorialLine')}</ListItem.Subtitle>
                                                            </ListItem.Content>
                                                        </TouchableOpacity>
                                                    </ListItem>
                                                </ListItem.Accordion>);
                                        })
                                        }
                                    </View>
                                </View>

                            </Card>
                        </View>
                    </ScrollView>
                </View>
            </View>
        );
    }
}

const mapStateToProps = (store) => ({
    currentUser: store.userState.currentUser
})

const mapDispatchToProps = (dispatch) => bindActionCreators({}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(AchievementScreen);