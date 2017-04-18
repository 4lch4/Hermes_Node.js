"use strict"

const Eris = require('eris');
const config = require('./util/config.json');
const info = require('./package.json');
const toolsUtil = require('./util/tools');
const tools = new toolsUtil()

const bot = new Eris.CommandClient(config.token, {}, {
    description: info.description,
    owner: info.author,
    prefix: config.prefix
});

// ========================== Firebase Initialization =========================================== //
// Firebase Cloud Messaging
const admin = require('firebase-admin');

const serviceAccount = require('./util/firebase-admin-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.databaseURL
});

// Firebase realtime DB
const firebase = require('firebase');

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
/**
 * Using the provided user token, send a user the provided message.
 * 
 * @param {String} userToken
 * @param {Message} message 
 */
function sendUserMessage(userToken, message) {
    getUserByToken(userToken, (user) => {
        bot.users.forEach((curr, index, values) => {
            if (curr.id == user.userId) {
                curr.getDMChannel().then((channel) => {
                    channel.createMessage({
                        embed: {
                            title: message.from,
                            description: message.content,
                            color: 3447003
                        }
                    });
                }).catch((e) => {
                    console.log('Error:');
                    console.log(e);
                });
            }
        });
    });
}

/**
 * Using the provided user token, get the user object from Firebase and returns it through the 
 * callback.
 * 
 * @param {String} tokenIn - HermesDirect user token of the user you want
 * @param {callback} callback - The callback that contains the user
 */
function getUserByToken(tokenIn, callback) {
    database.ref(`users/${tokenIn}`).once('value').then((snapshot) => {
        if (snapshot.val() != null) {
            let user = {
                channelId: snapshot.val().channelId,
                deviceToken: snapshot.val().deviceToken,
                phoneNum: snapshot.val().phoneNum,
                userId: snapshot.val().userId,
                userTOken: snapshot.val().userToken,
                username: snapshot.val().username
            }

            callback(user);
        }
    });
}

function getUserById(idIn, callback) {
    database.ref(`userIdToToken/${idIn}`).once('value').then((snapshot) => {
        if (snapshot.val() != null) {
            getUserByToken(snapshot.val(), (user) => {
                callback(user);
            });
        } else {
            callback(null);
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

function syncNewUser(userA, callback) {
    // Verify user doesn't already exist
    getUserById(userA.userId, (userB) => {
        if (userB == null) {
            database.ref(`users/${userA.userToken}`).update({
                userId: userA.userId,
                username: userA.username,
                channelId: userA.channelId
            });
            callback(true);
        } else {
            callback(false);
        }
    });
};

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

function sendMessage(msg, user, callback) {
    let payload = {
        data: {
            msgToken: msg.msgToken,
            content: msg.content,
            toField: msg.toField
        }
    }

    admin.messaging().sendToDevice(user.deviceToken, payload)
        .then(function (response) {
            console.log('Successfully sent message:', response);
        })
        .catch(function (error) {
            console.log('Error sending message:', error);
        });
}

function convertArgsToMsg(args) {
    let tempMsg = {
        msgToken: guid(),
        toField: '',
        content: ''
    }

    if (args[0].startsWith("\"")) {
        // Concat args into full string to use substring
        let fullStr = args.join(' ');

        // Offset msgStart by 2 in order to be at the position the content starts
        let msgStart = fullStr.indexOf("\"", 1) + 2;

        // Remove the offset in order to get the content between the quotes
        tempMsg.toField = fullStr.substring(1, msgStart - 2);

        // Set message content to everything after the quotes
        tempMsg.content = fullStr.substring(msgStart);
    } else if (args[0].length == 10) {
        // User provided a valid number, set it as toField
        tempMsg.toField = args[0];

        // Remove the first argument
        args.shift();

        // Set message content to everything in args
        tempMsg.content = args.join(' ');
    }

    return tempMsg;
}

// ========================== Bot Code Begins =================================================== //
/**
 * Ping command
 */
bot.registerCommand('ping', (msg, args) => {
    return 'Pong!'
}, {
    description: 'Pong!',
    fullDescription: 'Used to check if the bot is up.'
});

/**
 * OnReady Event Handler
 */
bot.on('ready', () => {
    console.log('Hermes is ready!')
    if (!isNaN(config.notificationChannel)) {
        bot.createMessage(config.notificationChannel, `${config.notificationMessage} > ${tools.getFormattedTimestamp()}`)
    }

    bot.editStatus('busy', {
        name: config.defaultgame,
        type: 1,
        url: ''
    });
});

/**
 * Synchronize New User
 * 
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

                    syncNewUser(user, (success) => {
                        if (success) {
                            bot.createMessage(msg.channel.id, 'You\'ve successfully been added!');
                        } else {
                            bot.createMessage(msg.channel.id, 'You\'ve already been added, what\'re you tryin\' to pull? :stuck_out_tongue_winking_eye:')
                        }
                    });
                } else {
                    bot.createMessage(msg.channel.id, 'Your token doesn\'t seem to exist, please generate a new one and try again.');
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

/**
 * Send Message Command
 */
bot.registerCommand('send', (msg, args) => {
    if (msg.guild == undefined) {
        if (args.length > 0) {
            let message = convertArgsToMsg(args);

            getUserById(msg.author.id, (user) => {
                // Attempt to send message
                sendMessage(message, user, (sent) => {
                    if (sent) {
                        bot.createMessage(msg.channel.id, 'Your message has successfully been sent!');
                    } else {
                        bot.createMessage(msg.channel.id, 'There was an error sending your message. Please try again.');
                    }
                });
            });
        } else {
            return 'Please provide a message to send.'
        }
    } else {
        return 'This command can only be executed in PMs.';
    }
});

// ========================== Node XCS ========================================================== //
const Sender = require('node-xcs').Sender;

const xcs = new Sender(config.messagingSenderId, config.fcmServerKey);

xcs.on('message', (messageId, from, data, category) => {
    let deviceToken = from;

    convertDataToMessage(data, (message) => {
        console.log('message converted')
        sendUserMessage(data.userToken, message);
    });
});

function convertDataToMessage(data, callback) {
    let message = {
        from: data.messageFrom,
        content: data.messageContent
    }

    callback(message);
}

xcs.on('connected', () => {
    console.log("XCS Connected at " + tools.getFormattedTimestamp());
});

xcs.on('disconnected', console.log);
xcs.on('online', console.log);
xcs.on('error', console.log);
xcs.on('message-error', console.log);



/**
 * Initiate Bot Connection
 */
bot.connect();