"use strict"

const Eris = require("eris");
const config = require('./util/config.json');
const info = require('./util/package.json');
const tools = require('./util/tools.js');
const firebase = require("firebase");

const bot = new Eris.CommandClient(config.token, {}, {
    description: info.description,
    owner: info.author,
    prefix: config.prefix
});

firebase.initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    databaseURL: config.databaseURL,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId
});

const database = firebase.database();
// ========================== Helper Functions ================================================== //
function getUser(tokenIn) {
    return database.ref('users/' + tokenIn).once('value').then((snapshot) => {
        if (snapshot.val() != null) {
            let user = {
                channelId: snapshot.val().channelId,
                username: snapshot.val().username,
                userNum: snapshot.val().userNum
            }

            return user;
        }
    });
}

function tokenExists(tokenIn, callback) {
    let url = 'users/' + tokenIn;

    database.ref(url).once('value').then((snapshot) => {
        if (snapshot.val() != null) {
            callback(true);
        } else {
            callback(false);
        }
    })
}

function syncNewUser(user) {
    console.log("Synchronizing new user - " + user.username);
    database.ref('users/' + user.userToken).update({
        userId: user.userId,
        username: user.username,
        channelId: user.channelId
    });
};

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function sendMessage(msg) {
    database.ref('messages/send/' + msg.userToken + '/' + msg.msgToken).set({
        content: msg.content,
        userToken: msg.userToken
    });
}

// ========================== Ping Command ====================================================== //
bot.registerCommand('ping', (msg, args) => {
    return 'Pong!'
}, {
    description: 'Pong!',
    fullDescription: 'Used to check if the bot is up.'
});

// ========================== onReady Event Handler ============================================= //
bot.on("ready", () => {
    console.log('Hermes is ready!')
    if (!isNaN(config.notificationChannel)) {
        bot.createMessage(config.notificationChannel, config.notificationMessage + ' > ' + tools.getFormattedTimestamp())
    }

    bot.editStatus('busy', {
        name: config.defaultgame,
        type: 1,
        url: ''
    });
});

// ========================== Synchronize New User ================================================= //
/**
 * Possibly want to verify the user doesn't already exist or the token isn't in use already, then
 * from there, initiate some sort of wait sequence while it asks the user for their from name, number,
 * etc. Although.. On second thought, most of this info can be retrieved from the Android app and just stored
 * in Firebase.2
 */
bot.registerCommand('sync', (msg, args) => {
    if (msg.guild == undefined) {
        let tokenIn = args[0];
        let userIdIn = msg.author.id;

        if (tokenIn.length == 10) {
            tokenExists(tokenIn, function (exists) {
                if (exists == true) {
                    let user = {
                        userId: userIdIn,
                        userToken: tokenIn,
                        username: msg.author.username,
                        channelId: msg.channel.id
                    }

                    syncNewUser(user);

                    bot.createMessage(msg.channel.id, "You've successfully been added!");
                } else {
                    bot.createMessage(msg.channel.id, "Your token doesn't seem to exist, please generate a new one and try again.");
                }
            });
        } else {
            bot.createMessage(msg.channel.id, 'Please input a valid token, it should be 10 characters long.');
        }
    } else {
        bot.createMessage(msg.channel.id, 'This command can only be executed in PMs.');
    }
}, {
    description: 'Synchronize a new Discord Direct user.',
    fullDescription: 'Create a new association for a Discord Direct user. ' +
        'Must have an initiation token to use the command.'
});

// ========================== Send Message ====================================================== //
bot.registerCommand('send', (msg, args) => {
    if (msg.guild == undefined) {
        if (args.length > 0) {
            let newToken = guid();

            return database.ref('intermediate/' + msg.author.id).once('value').then(function (snapshot) {
                if (snapshot.val() != null) {
                    let idIn = msg.author.id;
                    let msgOut = {
                        content: args.join(' '),
                        msgToken: newToken,
                        userToken: snapshot.val().userToken
                    }

                    sendMessage(msgOut);

                    return "Your message has been sent.\n\n" +
                        "Thank you for using Hermes' message delivery service! :incoming_envelope:";
                } else {
                    return "You're currently not in the system, please create an account and try again.";
                }
            });
        } else {
            return "Please provide a message to send."
        }
    } else {
        return 'This command can only be executed in PMs.';
    }
});

// ========================== Initiate bot connection =========================================== //
bot.connect();