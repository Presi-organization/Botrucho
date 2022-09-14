const { Message, EmbedBuilder, Guild, CommandInteraction, } = require("discord.js");
const lang = require('../languages/lang.json')
const translate = require("@vitalets/google-translate-api");
const { prefix, lang: langJson } = require('../config');

/**
 * Add a guild in the database
 * @param {GuildData} guildData
 * @param {{}} guildID The ID of the guild
 */
Guild.prototype.addDB = async function (guildData, guildID = {}) {
    if (!guildID || isNaN(guildID)) {
        guildID = this.id
    }
    return guildData.addGuild({
        serverID: guildID,
        prefix: prefix,
        lang: langJson,
        premium: null,
        premiumUserID: null,
        color: 0X3A871F,
        backlist: null
    });
};

/**
 * Fetches a guild in the database
 * @param {GuildData} guildData
 * @param {{}} guildID The ID of the guild to fetch
 */
Guild.prototype.fetchDB = async function (guildData, guildID = {}) {
    if (!guildID || isNaN(guildID)) {
        guildID = this.id
    }
    let data = (await guildData.showGuild(guildID)).shift()
    if (!data) data = await this.addDB(guildData)
    return data
};

/**
 * Add a guild in the database
 * @param {EventData} event
 * @param {string} messageID
 * @param {string} eventName
 * @param {string} calendarLink
 * @param {{}} guildID The ID of the guild
 */
Guild.prototype.addEventDB = async function (event, messageID, eventName, calendarLink, guildID = {}) {
    if (!guildID || isNaN(guildID)) {
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
 * @param {EventData} event
 * @param {string} messageID
 * @param {{}} guildID The ID of the guild to fetch
 */
Guild.prototype.fetchEventDB = async function (eventData, messageID, guildID = {}) {
    if (!guildID || isNaN(guildID)) {
        guildID = this.id
    }
    return (await eventData.showEvent(guildID, messageID)).shift();
};

/**
 * Translate a text based on lang json for an Interaction
 * @param {string} text The text to translate
 * @param {string} guildDBLang The language
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
 * @param {string} text The text to translate
 * @param {string} guildDBLang The language
 */
Message.prototype.translate = function (text, guildDBLang = {}) {
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
Guild.prototype.translate = async function (guildData, text = "en") {
    if (text) {
        if (!lang.translations[text]) {
            throw new Error(`Unknown text ID "${ text }"`)
        }
    } else {
        throw new Error(`Not text Provided`)
    }
    const langDB = (await guildData.showGuild(this.id)).shift();
    let target;
    if (langDB) {
        target = langDB.lang;
    } else {
        target = 'en';
    }
    return lang.translations[text][target]
};

Message.prototype.gg = async function (text, args, options = {}) {
    if (!text) {
        this.errorOccurred("No text provided", "en")
        throw new Error(`Aucun texte indiqué `)
    }
    let target = this.guild.lang
    const texttoreturn = await translate(text, { to: target }).then((res) => res.text).catch((error) => text);
    return texttoreturn.replace("show", "channel").replace("living room", "channel").replace("room", "channel");
};

/**
 * Sends an Error Message
 * @param {string} text Text to send
 * @return {*}
 */
Message.prototype.errorMessage = function (text) {
    if (text) {
        return this.channel.send({
            embeds: [ {
                description: text,
                color: 0XC73829,
                author: {
                    name: this.guild.name,
                    icon_url: this.guild.icon ? this.guild.iconURL({ dynamic: true }) : "https://cdn.discordapp.com/attachments/748897191879245834/782271474450825226/0.png?size=128"
                },
            } ]
        })
    } else {
        this.errorOccurred("No text provided", "en")
        throw new Error(`Error: No text provided`)
    }
};

/**
 * Sends an Interaction Error Message
 * @param {string} text Text to send
 * @return {*}
 */
CommandInteraction.prototype.errorMessage = function (text) {
    if (text) {
        return this.channel.reply({
            embeds: [ {
                description: text,
                color: 0XC73829,
                author: {
                    name: this.guild.name,
                    icon_url: this.guild.icon ? this.guild.iconURL({ dynamic: true }) : "https://cdn.discordapp.com/attachments/748897191879245834/782271474450825226/0.png?size=128"
                },
            } ]
        })
    } else {
        this.errorOccurred("No text provided", "en")
        throw new Error(`Error: No text provided`)
    }
};

/**
 * Sends a success Message
 * @param {string} text text to send as a Message
 */
Message.prototype.succesMessage = function (text) {
    if (text) {
        this.channel.send({
            embeds: [ {
                description: text,
                color: 0X2ED457,
            } ]
        })
    } else {
        this.errorOccurred("No text provided", "en")
        throw new Error(`Error: No text provided`)
    }
};

/**
 * Sends an Interaction success Message
 * @param {string} text text to send as a reply
 */
CommandInteraction.prototype.succesMessage = function (text) {
    if (text) {
        this.channel.reply({
            embeds: [ {
                description: text,
                color: 0X2ED457,
            } ]
        });
    } else {
        this.errorOccurred("No text provided", "en")
        throw new Error(`Error: No text provided`)
    }
};

Message.prototype.usage = async function (guildDB, cmd = {}) {
    let langUsage;
    if (cmd.usages) {
        langUsage = await this.translate("USES", guildDB.lang)
    } else {
        langUsage = await this.translate("USES_SING", guildDB.lang)
    }
    const read = await this.translate("READ", guildDB.lang)
    let u = await this.translate("ARGS_REQUIRED", guildDB.lang);
    this.channel.send({
        embeds: [ {
            description: `${ u.replace("{command}", cmd.name) }\n${ read }\n\n**${ langUsage }**\n${ cmd.usages ? `${ cmd.usages.map(x => `\`${ guildDB.prefix }${ x }\``).join("\n") }` : ` \`${ guildDB.prefix }${ cmd.name } ${ cmd.usage } \`` }`,
            color: 0XC73829,
            author: { name: this.author.username, icon_url: this.author.displayAvatarURL({ dynamic: !0, size: 512 }) },
        } ]
    })
};

Message.prototype.mainMessage = function (text, args, options = {}) {
    if (text) {
        let embed1 = new EmbedBuilder()
            .setAuthor(this.author.tag, this.author.displayAvatarURL())
            .setDescription(`${ text }`)
            .setColor(0X3A871F)
            .setFooter(this.client.footer, this.client.user.displayAvatarURL({ dynamic: true, size: 512 }))
        this.channel.send({ embeds: [ embed1 ], allowedMentions: { repliedUser: false } }).then(m => {
            m.react("<:delete:830790543659368448>")
            const filter = (reaction, user) => reaction.emoji.id === '830790543659368448' && user.id === this.member.id;
            const collector = m.createReactionCollector({ filter, time: 11000, max: 1 });
            collector.on('collect', async r => {
                m.delete()
            });
            collector.on('end', collected => m.reactions.removeAll());
        });
    } else {
        throw new Error(`Error: No text provided`)
    }
};

/**
 * Send an error message in the current channel
 * @param err
 * @param guildDB
 */
Message.prototype.errorOccurred = async function (err, guildDB = {}) {
    console.log("[32m%s[0m", "ERROR", "[0m", `${ cmd ? `Command ${ cmd.name }` : "System" } has error: \n\n${ err }`)
    const lang = await this.translate("ERROR", guildDB.lang)
    const r = new EmbedBuilder()
        .setColor(0XF0B02F)
        .setTitle(lang.title)
        .setDescription(lang.desc)
        .setFooter("Error code: " + err + "", this.client.user.displayAvatarURL({ dynamic: !0, size: 512 }));
    return this.channel.send({ embeds: [ r ] })
};

/**
 * Send an error message in the current channel as reply
 * @param err
 * @param guildDB
 */
CommandInteraction.prototype.errorOccurred = async function (err, guildDB = {}) {
    console.log("[32m%s[0m", "ERROR", "[0m", `${ cmd ? `Command ${ cmd.name }` : "System" } has error: \n\n${ err }`)
    const lang = await this.translate("ERROR", guildDB.lang)
    const r = new EmbedBuilder()
        .setColor(0XF0B02F)
        .setTitle(lang.title)
        .setDescription(lang.desc)
        .setFooter("Error code: " + err + "", this.client.user.displayAvatarURL({ dynamic: !0, size: 512 }));
    return this.channel.send({ embeds: [ r ] })
};
