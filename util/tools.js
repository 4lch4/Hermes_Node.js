"use strict"

const moment = require('moment-timezone')
const config = require('./config.json')

// ============================================================================================== //
var exports = module.exports = {}

exports.getFormattedTimestamp = function () {
    return moment().tz(config.defaultTimezone).format('HH:mm:ss MM/DD/YYYY')
}

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min) + min)
}