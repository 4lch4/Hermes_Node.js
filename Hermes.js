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
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId
});

const database = firebase.database();

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

function getUser(userIdIn) {
    console.log("Retrieving user - " + userIdIn);

    return database.ref('users/' + userIdIn).once('value').then((snapshot) => {
        if (snapshot.val() != null) {
            let user = {
                channelId: snapshot.val().channelId,
                userToken: snapshot.val().userToken,
                username: snapshot.val().username,
                userNum: snapshot.val().userNum
            }

            return user;
        }
    });
}

function addNewUser(tokenIn, msg) {
    console.log("Adding new user - " + msg.author.username);
    database.ref('users/' + tokenIn).set({
        userId: msg.author.id,
        username: msg.author.username,
        channelId: msg.channel.id
    });
};

// ========================== Initiate New User ================================================= //
bot.registerCommand('initiate', (msg, args) => {
    if (msg.guild == undefined) {
        let tokenIn = args[0];
        let channel = msg.channel.id;

        if (tokenIn.length == 10) {
            return database.ref('users/' + tokenIn).once('value').then(function (snapshot) {
                if (snapshot.val() == null) {
                    addNewUser(tokenIn, msg);

                    return "You've successfully been added!";

                } else if (snapshot.val().userId == msg.author.id) {
                    return "You've already been added to the system, what you tryin' to pull? :stuck_out_tongue:";
                } else {
                    console.log("addNewUser failed, user token already exists.");
                    console.log("userTokenIn = " + tokenIn);

                    return "Sorry, this key is already in use. Please generate a new one and try again.";
                }
            });
        } else {
            return 'Please input a valid token, it should be 10 characters long.';
        }
    } else {
        return 'This command can only be executed in PMs.';
    }
}, {
    description: 'Initiate a new Discord Direct user.',
    fullDescription: 'Create a new association for a Discord Direct user. ' +
        'Must have an initiation token to use the command.'
});

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}
// ========================== Send Message ====================================================== //
bot.registerCommand('send', (msg, args) => {
    if (msg.guild == undefined) {
        if (args.length != 0) {
            /**
             * /mesages/send/<userToken>/<message>
             * 
             * message: {
             *  content: "String",
             *  fromName: "String",
             *  fromNum: "String",
             *  userToken: "String"
             * }
             */
            let msgToken = guid();
            let tokenIn = "User Token";
            let msgStr = '/messages/send/' + tokenIn + '/' + msgToken;

            database.ref(msgStr).set({
                content: args.join(' '),
                fromName: 'From Name',
                fromNum: 'From Number',
                userToken: tokenIn
            });
        } else {
            return "Please provide a message to send."
        }
    } else {
        return 'This command can only be executed in PMs.';
    }
})

// ========================== Initiate bot connection =========================================== //
bot.connect();