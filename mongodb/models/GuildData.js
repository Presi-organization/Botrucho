const mongoose = require('mongoose');
const { Color, defaultLanguage } = require('../../config.js');

const channeldb = new mongoose.Schema({
    serverID: { type: String, required: true },
    lang: { type: String, required: false, default: defaultLanguage.toLowerCase() },
    defaultVolume: { type: Number, required: false, default: 60 },
    loopMode: { type: Number, required: false, default: 0 },
    color: { type: String, required: false, default: Color },

    plugins: {
        type: Object,
        default: {
            welcome: {
                status: false,
                message: null,
                channel: null,
                image: false
            },
            goodbye: {
                status: false,
                message: null,
                channel: null,
                image: false
            },
            autoping: {
                status: false,
                message: null,
                channel: null,
                image: false
            },
        }
    },
    protections: {
        type: Object,
        default: {
            anti_maj: {
                status: false,
                message: null,
                channel: null,
                image: false
            },
            anti_spam: {
                status: false,
                message: null,
                channel: null,
                image: false
            },
            anti_mentions: {
                status: false,
                message: null,
                channel: null,
                image: false
            },
            anti_dc: {
                status: false,
                message: null,
                channel: null,
                image: false
            },
            anti_pub: null,
            antiraid_logs: null
        }
    },
})
module.exports = mongoose.model('GuildData', channeldb)
