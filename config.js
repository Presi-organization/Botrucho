require('dotenv').config();

module.exports = {
    // Your discord bot token. https://discord.com/developpers/bots
    token: process.env.DISCORD_TOKEN,
    // Your ID
    // Your name/tag
    owners: [ "jonathanstrf", '.presi' ],
    //The footer of the embeds that the bot will send
    footer: "Botrucho ",
    // The status of your bot
    game: "nada importante",
    //the color of the embeds
    color: 0XF5B719,
    //the default bot language. en or es.
    defaultLanguage: "en",
    // If dev mod is enabled
    devMode: true,
    // The server where you test the commands
    devServer: "775108414560534588",
    // If you want to log every command,event etc. Usefull for debuging
    logAll: true,
    // If you want to test your configuration before starting the bot
    checkConfig: null,
    //The number of shards. Leave blank for auto
    shards: 1,
    // The categories. Put null to enabled to disable a category
    categories: {
        configuration: { enabled: true, name: "Configuration", desc: "Setup the bot with the configuration commands" },
        utilities: { enabled: true, name: "Utilities", desc: "Some useful commands", aliases: [ "general" ] },
        music: { enabled: true, name: "Music", desc: "Listen music with bot" },
        owner: { hide: true, enabled: true, name: "Owner", desc: "Manage your bot with the owner commands" }
    },
    // some usefull links about your bot, if you don't have an information, put null.
    links: {
        invite: null
    },
    //Database
    database: {
        // The url of your mongodb database. Check mongodb.org
        MongoURL: process.env.MONGO_URI,
        // If you want to cache the database. For big bots
        cached: false,
        delay: 300000 * 4,
    },
}
