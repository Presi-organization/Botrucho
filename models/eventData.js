const mongoose = require('mongoose');
const { Schema } = require("mongoose");

const eventDB = new Schema({
    serverID: { type: String, required: true },
    messageID: { type: String, required: true },
    eventName: { type: String, required: true },
    calendarLink: { type: String, required: true },
    userAssisting: { type: [ String ], required: false }
});

const eventData = module.exports = mongoose.model('eventData', eventDB)

