import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
require("firebase/compat/firestore");
require("firebase/compat/storage");
import Constants from 'expo-constants';
import { getI18n } from '../../i18n/translationService';
import { groupAllProductByCodeAndStatus } from './filteringService';
import { sortMapByExpirationDate } from './orderingService';
import { updateUserExpoTokens } from './userService';
import intervalToDuration from 'date-fns/intervalToDuration';

const projectId = Constants.expoConfig.extra.eas.projectId;

export const USER_RECEIVED_AND_APP_WAS_OPEN = "USER_RECEIVED_AND_APP_WAS_OPEN";
export const USER_ENTER_APP_CLICKING_NOTIFICATION = "USER_ENTER_APP_CLICKING_NOTIFICATION";

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            return;
        }

        token = (await Notifications.getExpoPushTokenAsync(
            { projectId }
        )).data;
        await updateUserExpoTokens(getDevice(Device, token));
    }

    return token;
}

export async function checkPushNotificationStatus() {

    let finalStatus = 'expo-device';

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        finalStatus = existingStatus;
    }

    return finalStatus;
}

const allProductsFromKitchenData = (productsList) => {
    const allProducts = [];

    for (let product in productsList) {
        for (let instance in productsList[product].instances) {
            const singleProduct = productsList[product].instances[instance];
            singleProduct.code = product;
            singleProduct.productName = productsList[product].productName;
            singleProduct.image = productsList[product].image;
            singleProduct.productType = productsList[product].productType;
            allProducts.push(singleProduct);
        }
    }
    return allProducts;
}

export async function checkForExpiringProductInKitchenAndSchedulePush(kitchenProducts, kitchenId, langCode) {

    await cancelExpiringProductNotificationsByKitchenId(kitchenId);
    if (kitchenProducts) {
        kitchenProducts = allProductsFromKitchenData(kitchenProducts);
        kitchenProducts = groupAllProductByCodeAndStatus(kitchenProducts);
        kitchenProducts = sortMapByExpirationDate(kitchenProducts);

        //Find expiration date for this product
        let lowestExpirationDateProduct = kitchenProducts[0];
        let newTimestamp = lowestExpirationDateProduct?.statusExpirationDate ? lowestExpirationDateProduct?.statusExpirationDate : lowestExpirationDateProduct?.expirationDate;

        if (newTimestamp) {
            await setNotificationByTimestamp(newTimestamp, langCode, kitchenId);
        }
    }
}

async function setNotificationByTimestamp(timestamp, langCode, kitchenId) {
    //I need to setup a reminder
    const now = new Date().getTime();
    const isAlreadyExpired = now - timestamp > 0 ? true : false;
    const duration = intervalToDuration({ start: now, end: timestamp });
    const expirationSeverity = isAlreadyExpired ? true : duration.days < 3 && duration.years === 0 && duration.months === 0 && duration.years === 0;
    const i18n = getI18n(langCode);

    await cancelExpiringProductNotificationsByKitchenId(kitchenId);
    if (expirationSeverity) {
        //set 3 daily reminders to clean kitchen
        let i = 1;
        let startingDate = new Date();
        while (i < 4) {
            let random = Math.floor(Math.random() * 5);
            random = random + 3;
            startingDate.setDate(startingDate.getDate() + i);
            startingDate.setUTCHours(11, 0, 0, 0);

            const identifier = `${timestamp}_${i}_${kitchenId}`;
            const title = i18n.t('notifications.expiringTitle');
            const body = i18n.t(`notifications.expiring[${random}]`);

            await setExpiringPushNotification(identifier, title, body, startingDate);
            i++;
        }
    } else {
        let i = 0;
        let startingDate = new Date(timestamp);
        startingDate.setDate(startingDate.getDate() - 3);
        while (i < 6) {
            startingDate.setDate(startingDate.getDate() + i);
            startingDate.setUTCHours(11, 0, 0, 0);

            let random = Math.floor(Math.random() * 5);
            if (i < 3) {
                random = i;
            } else {
                random = random + 3;
            }

            const identifier = `${timestamp}_${i}_${kitchenId}`;
            const title = i18n.t('notifications.expiringTitle');
            const body = i18n.t(`notifications.expiring[${random}]`);

            await setExpiringPushNotification(identifier, title, body, startingDate);
            i++;
        }
    }
}

async function setExpiringPushNotification(identifier, title, body, startingDate) {
    return await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body
        },
        identifier,
        trigger: { date: startingDate },
    });
}

async function isIdentifierPresentInNotifications(identifier) {
    let presence = false;

    const notifications = await getAllNotifications();
    if (notifications.length > 0) {
        const filteredNotifications = notifications.filter((o) => o.identifier.includes(identifier))
            .map((o) => o.identifier)
        if (filteredNotifications.length > 0) {
            presence = true;
        }
    }

    return presence;
}

async function cancelExpiringProductNotificationsByKitchenId(kitchenId) {
    const notifications = await getAllNotifications();
    if (notifications.length > 0) {
        const filteredNotifications = notifications.filter((o) => o.identifier.includes("_" + kitchenId));
        if (filteredNotifications) {
            for (let index in filteredNotifications) {
                const identifier = filteredNotifications[index].identifier;
                await Notifications.cancelScheduledNotificationAsync(identifier);
            }
        }
    }
}

export async function schedulePushNotification(langCode) {
    let random = Math.floor(Math.random() * 5);
    const i18n = getI18n(langCode);

    await Notifications.scheduleNotificationAsync({
        content: {
            title: i18n.t('notifications.expiringTitle'),
            body: i18n.t(`notifications.expiring[${random}]`),
        },
        trigger: { seconds: 60, repeats: true },
    });
}

export async function scheduleDailyPushNotification(langCode) {
    const i18n = getI18n(langCode);

    if (!isIdentifierPresentInNotifications("dailyReward")) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: i18n.t('notifications.dailyTitle'),
                body: i18n.t('notifications.dailyReward'),
            },
            identifier: "dailyReward",
            trigger: {
                hour: 10,
                minute: 0,
                repeats: true
            },
        });
    }
}

export async function getAllNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync(projectId);
}

export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function updateNotifications(notification, action) {

    let notificationObject = notification;
    if (!notificationObject.request) {
        notificationObject = notification.notification;
    }

    let token = (await Notifications.getExpoPushTokenAsync(
        { projectId }
    )).data;

    let actionItem = {
        identifier: notificationObject.request.identifier,
        title: notificationObject.request.content.title,
        subtitle: notificationObject.request.content.subtitle,
        body: notificationObject.request.content.body,
        action: action,
        timestamp: new Date().getTime(),
        device: getDevice(Device, token),
        type: notificationObject.request.trigger.type,
        user: firebase.auth().currentUser.uid
    }

    firebase.firestore().collection("notifications")
        .doc(new Date().getTime().toString())
        .set({ actions: firebase.firestore.FieldValue.arrayUnion(actionItem) }, { merge: true })
        .then((result) => {
        })
}

function getDevice(Device, token) {
    return {
        brand: Device.brand,
        designName: Device.designName,
        deviceName: Device.deviceName,
        deviceType: Device.deviceType,
        manufacturer: Device.manufacturer,
        modelId: Device.modelId,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        token: token
    }
}