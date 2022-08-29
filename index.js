const {
    Client: Client,
    GatewayIntentBits: Intents,
    Collection: Collection,
    MessageEmbed: MessageEmbed,
    Message
} = require("discord.js");
const { getFreeClientID: getFreeClientID, setToken: setToken } = require("play-dl");
const { Routes } = require("discord-api-types/v10");
const { Player } = require("discord-player");
const { REST } = require("@discordjs/rest");
const mongoose = require("mongoose");
const fs = require('node:fs');
const util = require("util");
require("./util/extenders.js");

require('dotenv').config()

const readdir = util.promisify(fs.readdir);
client = new Client({
    intents: [
        Intents.Guilds,
        Intents.GuildMessages,
        Intents.GuildVoiceStates,
        Intents.GuildMessageReactions,
    ]
});

client.config = require("./config.js");
client.footer = client.config.footer;
client.owners = client.config.owners;
client.commands = new Collection;
client.deleted_messages = new WeakSet();
client.player = new Player(client, client.config.player);

getFreeClientID().then(client_id => {
    setToken({
        soundcloud: {
            client_id: client_id,
        },
    }).then();
});

mongoose.connect(client.config.database.MongoURL).then(() => {
    console.log("[MongoDB]: Database is ready!");
}).catch(e => {
    console.log("[MongoDB]: Error\n" + e)
});

const init = async function () {
    fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
    const categories = await readdir("./commands/");
    console.log(`[Commands] ${ categories.length } Categories loaded.`, categories)
    const commands = [];
    for (const category of categories) {
        for (const command_file of (await readdir("./commands/" + category + "/")).filter(e => "js" === e.split(".").pop())) {
            const command = require(`./commands/${ category }/${ command_file }`);
            client.commands.set(command.name, command);
            commands.push(command.data.toJSON());
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
        .then(() => console.log('Successfully registered application commands.'))
        .catch(console.error);

    const discord_events = await readdir("./events/discord");
    // console.log(`[Discord Events] ${ discord_events.length } events loaded.`, discord_events);
    discord_events.forEach(discord_event => {
        const event_name = discord_event.split(".")[0], event_file = require(`./events/discord/${ discord_event }`);
        client.on(event_name, (...e) => event_file.execute(...e, client));
        delete require.cache[require.resolve(`./events/discord/${ discord_event }`)];
    });

    const player_events = await readdir("./events/player");
    // console.log(`[Player Events] ${ player_events.length } events loaded.`, player_events);
    player_events.forEach(player_event => {
        const player_event_name = player_event.split(".")[0],
            player_event_file = require(`./events/player/${ player_event }`)
        client.player.on(player_event_name, (...e) => player_event_file.execute(...e, client));
        delete require.cache[require.resolve(`./events/player/${ player_event }`)]
    })
};

init().then();

client.login(client.config.token).catch(e => {
    console.log("[Discord login]: Please provide a valid discord bot token\n" + e)
});

client.once("ready", () => {
    console.log("Ready!");
});

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});

client.on("guildMemberSpeaking", (member, speaking) => {
    console.log(member.displayName || member.username, "is talking?", speaking);
});

client.on("error", (e) => console.error(e));
