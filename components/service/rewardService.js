import firebase from "firebase/compat/app";
import "firebase/compat/auth";
require("firebase/compat/firestore");
require("firebase/compat/storage");

export const DAILY_REWARD = "DAILY_REWARD";
export const KITCHEN_TUTORIAL = "KITCHEN_TUTORIAL";

export async function addReward(rewardType, rewardAmount) {

    const date = new Date();
    date.setHours(0, 0, 0, 0); // Set to 00:00:00
    const startingDateTimestamp = date.getTime();
    const timestamp = new Date().getTime();

    const reward = {
        type: rewardType,
        amount: rewardAmount,
        timestamp
    }
    let rewards = {};
    rewards[startingDateTimestamp] = {};
    rewards[startingDateTimestamp][timestamp] = reward;

    firebase.firestore().collection("rewards")
        .doc(firebase.auth().currentUser.uid)
        .set({ rewards }, { merge: true })
        .then((result) => {
            firebase.firestore().collection("users")
                .doc(firebase.auth().currentUser.uid)
                .update("foodPrintPercentage", firebase.firestore.FieldValue.increment(reward.amount))
                .then((result) => {

                })
        })

}

export async function getDailyRewards() {
    const date = new Date();
    date.setHours(0, 0, 0, 0); // Set to 00:00:00
    const startDayTimestamp = date.getTime();
    let response = 0;

    await firebase.firestore()
        .collection("rewards")
        .doc(firebase.auth().currentUser.uid)
        .get()
        .then((res) => {
            const data = res.data();

            if (data && data.rewards) {
                const allRewardsByDate = data.rewards[startDayTimestamp];
                if (allRewardsByDate) {
                    const dailyReward = Object.values(allRewardsByDate).filter((o) => o.type === DAILY_REWARD)[0];
                    if (dailyReward) {
                        response = dailyReward.amount;
                    }
                }
            }
        })
        .catch((error) => {
            console.error("Error fetching rewards:", error);
        });

    return response;
}

export async function getUserTutorial(tutorialName) {
    let response = [];
    await firebase.firestore().collection("rewards")
        .doc(firebase.auth().currentUser.uid)
        .get()
        .then((result) => {
            const data = result.data();
            if (data && data[tutorialName]) {
                response = data[tutorialName]
            }
        })
    return response;
}

export async function updateUserTutorial(tutorialName, action) {
    let tutorial = {};
    tutorial[tutorialName] = await getUserTutorial(tutorialName);
    tutorial[tutorialName].push(action);
    //remove duplicates from tutorial
    tutorial[tutorialName] = [...new Set(tutorial[tutorialName])]

    await firebase.firestore().collection("rewards")
        .doc(firebase.auth().currentUser.uid)
        .update(tutorial, { merge: true })
        .then((result) => {

        })
}
