import firebase from "firebase/compat/app";
import "firebase/compat/auth";
require("firebase/compat/firestore");
require("firebase/compat/storage");

export async function updateUserExpoTokens(device) {
    if (firebase.auth().currentUser.uid) {
        firebase.firestore().collection("users")
            .doc(firebase.auth().currentUser.uid)
            .set({ devices: firebase.firestore.FieldValue.arrayUnion(device) }, { merge: true })
            .then((result) => {
            })
    }
}

