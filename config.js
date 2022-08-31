require('dotenv').config();

module.exports = {
    prefix: "!",
    // Your discord bot token. https://discord.com/developpers/bots
    token: process.env.DISCORD_TOKEN,
    // Your ID
    // Your name/tag
    owners: [ "iJoda#6615" ],
    //The footer of the embeds that the bot will send
    footer: "Botrucho ",
    // The id of the support
    supportID: "729774155037278268",
    // The status of your bot
    game: "Bot... Not so much",
    //the color of the embeds
    color: 0Xf5b719,
    // OPTIONAL: Your top.gg token.
    topgg: "TOPGG_TOKEN",
    // OPTIONAL: The link of your bot's top.gg page.
    topgg_url: "https://top.gg/bot/783708073390112830",
    //the default bot language. fr or en
    defaultLanguage: "en",
    // If dev mod is enabled
    devMode: true,
    // The server where you test the commands
    devServer: "782661233622515772",
    // If you want to log every command,event etc. Usefull for debuging
    logAll: true,
    // If you want to test your configuration before starting the bot
    checkConfig: null,
    //The number of shards. Leave blank for auto
    shards: 1,
    // The categories. Put null to enabled to disable a category
    categories: {
        configuration: { enabled: true, name: "Configuration", desc: "Setup the bot with the configuration commands" },
        utilities: { enabled: true, name: "Utilities", desc: "Some usefull commands", aliases: [ "general" ] },
        music: { enabled: true, name: "Music", desc: "Listen music with bot" },
        owner: { hide: true, enabled: true, name: "Owner", desc: "Manage your bot with the owner commands" }
    },
    // some usefull links about your bot, if you don't have an information, put null.
    links: {
        invite: "https://discord.com/api/oauth2/authorize?client_id=973290665704308756&permissions=8&scope=bot"
    },
    //Database
    database: {
        // The url of your mongodb database. Check mongodb.org
        MongoURL: process.env.MONGO_URL,
        // If you want to cache the database. For big bots
        cached: false,
        delay: 300000 * 4,
    },
}
