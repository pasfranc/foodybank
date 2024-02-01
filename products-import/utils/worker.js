const fetch = require("node-fetch");
const firebase = require("firebase");

module.exports = async ({ modelJson }) => {
    const code = modelJson.code;
    const imageUrl = modelJson.frontImage;

    const firebaseConfig = {
        apiKey: process.env.API_KEY,
        authDomain: process.env.AUTH_DOMAIN,
        projectId: process.env.PROJECT_ID,
        storageBucket: process.env.STORAGE_BUCKET,
        messagingSenderId: process.env.MESSAGING_SENDER_ID,
        appId: process.env.APP_ID
    }

    if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
    }

    let downloadURL = null;

    if (imageUrl) {
        const path = `products/${code}`;
        const fileRef = firebase.storage().ref().child(path);
        const response = await fetch(imageUrl);

        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();

            const task = await fileRef.put(arrayBuffer, { contentType: 'image/jpeg' });
            downloadURL = await task.ref.getDownloadURL();
        }
    }

    modelJson.image = downloadURL;

    await firebase.firestore().collection("products").doc(modelJson.code).set(modelJson);
    
    return { code, downloadURL };
};