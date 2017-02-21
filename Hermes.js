"use strict"

const Eris = require("eris");
const config = require('./util/config.json');
const info = require('./util/package.json');
const tools = require('./util/tools.js');

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
    })
});

bot.connect();