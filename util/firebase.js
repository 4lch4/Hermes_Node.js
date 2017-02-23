const firebase = require("firebase");
const config = require("./config.js");

firebase.initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    databaseURL: config.databaseURL,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId
});

const database = firebase.database();

// ========================== Local functions =================================================== //
function addNewUser(userTokenIn, msg) {
    if (!userExists(userTokenIn)) {
        console.log("Adding new user - " + msg.author.username);
        database.ref('users/' + userTokenIn).set({
            userId: msg.author.id,
            username: msg.author.username,
            channelId: msg.channel.id
        })
    } else {
        console.log("addNewUser failed, user token already exists.");
        console.log("userTokenIn = " + userTokenIn);
        return "There was an error adding your token, please generate a new one and try again."
    }
}

function userExists(userTokenIn) {
    database.ref('users/' + userTokenIn).once('value').then(function(snapshot) {
        return snapshot.val() != null;
    });
}

// ========================== Exported functions ================================================ //
module.exports = {
    addNewUser: function (userTokenIn, msg) {
        addNewUser(userTokenIn, msg);
    },
    userExists: function (userTokenIn) {
        userExists(userTokenIn);
    }
}