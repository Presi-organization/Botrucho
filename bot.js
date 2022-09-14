const {
    GatewayIntentBits: Intents,
    Collection: Collection,
    Client: Client,
    Partials
} = require("discord.js");
const { getFreeClientID: getFreeClientID, setToken: setToken } = require("play-dl");
const GuildDataDAO = require("./cosmos/models/GuildDataDAO");
const GuildData = require("./cosmos/controllers/GuildData");
const { createAudioPlayer } = require("@discordjs/voice");
const { Routes } = require("discord-api-types/v10");
const { CosmosClient } = require("@azure/cosmos");
const { Player } = require("discord-player");
const { REST } = require("@discordjs/rest");
const fs = require('node:fs');
const util = require("util");
require("./util/extenders.js");
const EventData = require("./cosmos/controllers/EventData");
const EventDataDAO = require("./cosmos/models/EventDataDAO");

require('dotenv').config()

const readdir = util.promisify(fs.readdir);

const options = {
    endpoint: process.env.COSMOS_URL,
    key: process.env.COSMOS_KEY,
    userAgentSuffix: 'CosmosDBJavascriptQuickstart'
};

const cosmosClient = new CosmosClient(options);
const database = "DiscordBotCluster";
const guild_container = "guilddatas";
const event_container = "eventdatas";

const guildDAO = new GuildDataDAO(cosmosClient, database, guild_container);
const eventDAO = new EventDataDAO(cosmosClient, database, event_container);
const guild = new GuildData(guildDAO);
const event = new EventData(eventDAO);

guildDAO
    .init(err => {
        console.error(err)
    })
    .catch(err => {
        console.error(err)
        console.error(
            'Shutting down because there was an error setting up the database.'
        )
        process.exit(1)
    });

eventDAO
    .init(err => {
        console.error(err)
    })
    .catch(err => {
        console.error(err)
        console.error(
            'Shutting down because there was an error setting up the database.'
        )
        process.exit(1)
    });

client = new Client({
    intents: [
        Intents.Guilds,
        Intents.GuildMembers,
        Intents.GuildMessages,
        Intents.GuildVoiceStates,
        Intents.GuildMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ],
});

client.config = require("./config.js");
client.footer = client.config.footer;
client.owners = client.config.owners;
client.commands = new Collection;
client.deleted_messages = new WeakSet();
client.player = new Player(client, client.config.player);
client.playerSay = createAudioPlayer();
client.guildData = guild;
client.eventData = event;

getFreeClientID().then(client_id => {
    setToken({
        soundcloud: {
            client_id: client_id,
        },
    }).then();
});

const init = async function () {
    fs.readdirSync("./discord/commands").filter(file => file.endsWith(".js"));
    const categories = await readdir("./discord/commands/");
    console.log(`[Commands] ${ categories.length } Categories loaded.`, categories)
    const commands = [];
    for (const category of categories) {
        for (const command_file of (await readdir("./discord/commands/" + category + "/")).filter(e => "js" === e.split(".").pop())) {
            const command = require(`./discord/commands/${ category }/${ command_file }`);
            client.commands.set(command.name, command);
            commands.push(command.data.toJSON());
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
        .then(() => console.log('[Commands] Successfully registered application commands.'))
        .catch(console.error);

    const discord_events = await readdir("./discord/events/discord");
    // console.log(`[Discord Events] ${ discord_events.length } events loaded.`, discord_events);
    discord_events.forEach(discord_event => {
        const event_name = discord_event.split(".")[0],
            event_file = require(`./discord/events/discord/${ discord_event }`);
        client.on(event_name, (...e) => event_file.execute(...e, client));
        delete require.cache[require.resolve(`./discord/events/discord/${ discord_event }`)];
    });

    const player_events = await readdir("./discord/events/player");
    // console.log(`[Player Events] ${ player_events.length } events loaded.`, player_events);
    player_events.forEach(player_event => {
        const player_event_name = player_event.split(".")[0],
            player_event_file = require(`./discord/events/player/${ player_event }`);
        client.player.on(player_event_name, (...e) => player_event_file.execute(...e, client));
        delete require.cache[require.resolve(`./discord/events/player/${ player_event }`)]
    });

    const say_events = await readdir("./discord/events/say");
    // console.log(`[Say Events] ${ say_events.length } events loaded.`, say_events);
    say_events.forEach(say_event => {
        const say_event_name = say_event.split(".")[0],
            say_event_file = require(`./discord/events/say/${ say_event }`);
        client.playerSay.on(say_event_name, (...e) => say_event_file.execute(...e, client));
        delete require.cache[require.resolve(`./discord/events/say/${ say_event }`)]
    });

};

init().then();

client.login(client.config.token).catch(e => {
    console.log("[Discord login]: Please provide a valid discord bot token\n" + e)
});

client.once("ready", () => {
    client.user.setPresence({ status: "dnd", activities: [ { name: "nada importante", type: 5 } ] });
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
