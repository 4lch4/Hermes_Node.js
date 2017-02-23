"use strict"

const Eris = require("eris");
const config = require('./util/config.json');
const info = require('./util/package.json');
const tools = require('./util/tools.js');
const firebase = require('./util/firebase.js');

const bot = new Eris.CommandClient(config.token, {}, {
    description: info.description,
    owner: info.author,
    prefix: config.prefix
});

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

// ========================== Initiate New User ================================================= //
bot.registerCommand('initiate', (msg, args) => {
    if (msg.guild == undefined) {
        let tokenIn = args[0];
        let channel = msg.channel.id;

        if (tokenIn.length == 10) {
            firebase.addNewUser(tokenIn, msg);
        } else {
            bot.createMessage(channel, 'Please input a valid token, it should be 10 characters long.');
        }
    } else {
        bot.createMessage(channel, 'This command can only be executed in PMs.');
    }
}, {
    description: 'Initiate a new Discord Direct user.',
    fullDescription: 'Create a new association for a Discord Direct user. ' +
        'Must have an initiation token to use the command.'
});

// ========================== Initiate bot connection =========================================== //
bot.connect();