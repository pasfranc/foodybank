require('dotenv').config();

const firebase = require("firebase");

const express = require('express');
const routes = require('./routes/routes');

const app = express();

app.use(express.json());
app.use('/api', routes);

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID
}

/*if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}*/

/*firebase.firestore().settings({
    ignoreUndefinedProperties: true,
    merge: true
});*/

app.listen(3000, () => {
    console.log(`Server Started at ${3000}`)
});