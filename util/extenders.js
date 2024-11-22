const { Message, Guild, CommandInteraction } = require("discord.js");
const { lang: langJson } = require('../config');
const lang = require('../languages/lang.json')
const EventData = require('../mongodb/controllers/EventData');
const GuildData = require('../mongodb/controllers/GuildData');

/**
 * Add a guild in the database
 * @arg {GuildData} guildData The GuildData controller
 * @param {String} guildID The ID of the guild
 */
Guild.prototype.addDB = async function (guildData, guildID = '') {
    if (!guildID || isNaN(parseInt(guildID))) {
        guildID = this.id;
    }
    return guildData.addGuild({
        serverID: guildID,
        lang: langJson,
        color: 0X3A871F,
    });
};

/**
 * Fetches a guild in the database
 * @param {GuildData} guildData The GuildData controller
 * @param {String} guildID The ID of the guild to fetch
 */
Guild.prototype.fetchDB = async function (guildData, guildID = '') {
    if (!guildID || isNaN(parseInt(guildID))) {
        guildID = this.id;
    }
    let data = await guildData.showGuild(guildID);
    if (!data) data = await this.addDB(guildData);
    return data;
};

/**
 * Add a guild in the database
 * @param {EventData} event The EventData controller
 * @param {String} messageID The messageID
 * @param {String} eventName The event's name
 * @param {String} calendarLink The generated google calendar link
 * @param {String} guildID The ID of the guild
 */
Guild.prototype.addEventDB = async function (event, messageID, eventName, calendarLink, guildID = '') {
    if (!guildID || isNaN(parseInt(guildID))) {
        guildID = this.id
    }

    return event.addEvent({
        serverID: guildID,
        messageID: messageID,
        eventName: eventName,
        calendarLink: calendarLink
    });
};

/**
 * Fetches a guild in the database
 * @param {EventData} eventData The EventData controller
 * @param {Number} messageID The messageID
 * @param {String} guildID The ID of the guild to fetch
 */
Guild.prototype.fetchEventDB = async function (eventData, messageID, guildID = '') {
    if (!guildID || isNaN(parseInt(guildID))) {
        guildID = this.id
    }
    return eventData.showEvent(guildID, messageID);
};

/**
 * Translate a text based on lang json for an Interaction
 * @param {String} text The text to translate
 * @param {String} guildDBLang The language from DB
 */
CommandInteraction.prototype.translate = function (text, guildDBLang = "en") {
    if (!text || !lang.translations[text]) {
        throw new Error(`Translate: Params error: Unknow text ID or missing text ${ text }`)
    }
    if (!guildDBLang) return console.log("Missing guildDBLang")
    return lang.translations[text][guildDBLang]
};

/**
 * Translate a text based on lang json for a Message
 * @param {String} text The text to translate
 * @param {String} guildDBLang The language from DB
 */
Message.prototype.translate = function (text, guildDBLang = 'en') {
    if (!text || !lang.translations[text]) {
        throw new Error(`Translate: Params error: Unknow text ID or missing text ${ text }`)
    }
    if (!guildDBLang) return console.log("Missing guildDBLang")
    return lang.translations[text][guildDBLang]
};

/***
 * Translate a text based on lang json for a Guild with search in DB
 * @param {GuildData} guildData
 * @param {string} text The text to translate
 */
Guild.prototype.translate = async function (text, guildData) {
    if (text) {
        if (!lang.translations[text]) {
            throw new Error(`Unknown text ID "${ text }"`);
        }
    } else {
        throw new Error(`Not text Provided`);
    }
    const { langDB } = await guildData.showGuild(this.id);
    let target;
    if (langDB) {
        target = langDB;
    } else {
        target = 'en';
    }
    return lang.translations[text][target]
};
