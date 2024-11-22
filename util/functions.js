const { Client } = require("discord.js");
const mongoose = require("mongoose");

/**
 * Returns an object of the guilds
 * @param {object} client The discord client instance
 */
const getServersList = async client => {
    const results = await client.shard.broadcastEval((c) => {
        return c.guilds.cache.array();
    });
    let guilds = [];
    results.forEach((a) => guilds = [...guilds, ...a]);
    return guilds
};
/**
 * Create the client variables
 * @param {Botrucho || Client} client The discord client instance
 */
const createClientVars = (client) => {
    const config = require("../config")
    client.config = config
    client.color = config.color
    client.owners = ["429375441267195924", "219637158162464768"]
    client.footer = config.footer.slice(0, 32)
    client.defaultLanguage = config.defaultLanguage
    client.log = config.logAll
    client.devMode = {
        enabled: config.devMode,
        serverID: config.devServer
    }
};

/**
 * Check the configuration
 * @param {object} config The config.json file
 */
const checkConfig = async config => {
    if (!config) return console.error('✗ The provided config is not an object.');
    if (config.logAll) console.log("Starting the verification of the configuration...");
    let error = false;
    if (process.version.slice(1).split('.')[0] < 22) {
        console.error('✗ NodeJs 22 or higher is required.');
        error = true;
    } else if (!config.ownerID || config.ownerID.length !== 18) {
        console.error('✗ The ownerID is missing or is not a real Discord ID.');
        error = true;
    } else if (!config.footer) {
        console.error('✗ Please provide a footer.');
        error = true;
    } else if (!config.color) {
        console.error('✗ Please provide the embeds color.');
        error = true;
    }
    if (!config.defaultLanguage || (config.defaultLanguage.toLowerCase() !== "en" && config.defaultLanguage.toLowerCase() !== "es")) {
        console.error('✗ The default Language parameter is missing or is not supported. Languages: en, es');
        error = true;
    }
    if (!config.devMode || typeof config.devMode !== Boolean) {
        console.error('✗ The devMode parameter is missing or is not a boolean value');
        error = true;
    }
    if (!config.devServer || config.devServer.length !== 18) {
        if (!config.devMode) {
            console.error('✗ The devServer parameter is missing or is not a valid discord ID');
            error = true;
        }
    }
    if (!config.logAll || typeof config.logAll !== Boolean) {
        console.error('✗ The logAll parameter is missing or is not a bolean value');
        error = true;
    }
    if (!config.database) {
        console.error('✗ Your config.js file looks broken. Please reinstall it');
        error = true;
    } else if (!config.database.cached || typeof config.database.cached !== Boolean) {
        console.error('✗ The database.cache parameter is missing or is not a bolean value');
        error = true;
    } else if (!config.database.delay || isNaN(config.database.delay)) {
        console.error('✗ The database.delay parameter is missing or is not a number');
        error = true;
    }
    if (!config.token) {
        console.error('✗ Please provide a discord bot token.get it at https://discord.com/developers/bots');
        error = true;
    } else {
        const Discord = require('discord.js');
        const client = new Discord.Client({
            partials: ["MESSAGE"],
            intents: ["GUILDS"],
        });
        await client.login(config.token).catch(e => {
            console.error("✗ Your token is invalid" + e + "")
            error = true;
        });
    }
    if (!config.database.MongoURL) {
        console.error('✗ Please provide the url of your mongodb database.Your can get it at https://mongodb.org');
        error = true;
    } else {
        await mongoose.connect(config.database.MongoURL).catch(() => {
            console.error('✗ Your mongodb url isn\'t correct');
            error = true;
        });
    }
    if (error && config.logAll) {
        console.log("Your config verification has failed. Please fix errors and try again\n\nIf you need more help, join our support server here: https://green-bot.app/discord")
        process.exit(0);
    } else if (config.logAll) console.log("Your config is correct. Good game 🥳");
    return error;

};
module.exports = { getServersList, checkConfig, createClientVars }
