const cron = require("node-cron");
const { Routes } = require("discord-api-types/v10");
const { REST } = require("@discordjs/rest");
const {
    GatewayIntentBits: Intents,
    Partials,
    WebhookClient
} = require("discord.js");
const EventData = require("./mongodb/controllers/EventData");
const GuildData = require("./mongodb/controllers/GuildData");
const Botrucho = require("./mongodb/base/Botrucho");
const { sendAMessageAndThread } = require("./services/webhooks/ultimateThread");
const mongoose = require("mongoose");
const fs = require('node:fs');
const util = require("util");

require("./util/extenders.js");
require('dotenv').config()

const readdir = util.promisify(fs.readdir);

client = new Botrucho({
    intents: [
        Intents.Guilds,
        Intents.GuildMembers,
        Intents.GuildMessages,
        Intents.GuildPresences,
        Intents.GuildVoiceStates,
        Intents.GuildMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ],
});

if (process.env.NODE_ENV !== 'production') {
    client.player.on('debug', (message) => console.log(`[Player] ${ message }`));
    client.player.events.on('debug', (queue, message) =>
        console.log(`[${ queue.guild.name }: ${ queue.guild.id }] ${ message }`)
    );
}

(async () => {
    await client.player.extractors.loadDefault((ext) => {
        return !["SoundCloudExtractor", "VimeoExtractor", "ReverbnationExtractor"].includes(ext);
    }, {
        YouTubeExtractor: {},
        SoundCloudExtractor: {},
        AppleMusicExtractor: {},
        SpotifyExtractor: {},
        VimeoExtractor: {},
        ReverbnationExtractor: {},
        AttachmentExtractor: {},
    })
})();

(async () => {
    try {
        await mongoose.connect(client.config.database.MongoURL);
        console.log("Connected to MongoDB Atlas");
    } catch (error) {
        console.error("Failed to connect to MongoDB Atlas", error);
        process.exit(1);
    }
})();

const guild = new GuildData();
const event = new EventData();
client.guildData = guild;
client.eventData = event;

(async function () {
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
    discord_events.forEach(discord_event => {
        const event_name = discord_event.split(".")[0],
            event_file = require(`./discord/events/discord/${ discord_event }`);
        client.on(event_name, (...e) => event_file.execute(client, ...e));
        delete require.cache[require.resolve(`./discord/events/discord/${ discord_event }`)];
    });

    const player_events = await readdir("./discord/events/player");
    player_events.forEach(player_event => {
        const player_event_name = player_event.split(".")[0],
            player_event_file = require(`./discord/events/player/${ player_event }`);
        client.player.events.on(player_event_name, (...e) => player_event_file.execute(client, ...e));
        delete require.cache[require.resolve(`./discord/events/player/${ player_event }`)]
    });

})();

client.login(client.config.token).catch(e => {
    console.log("[Discord login]: Please provide a valid discord bot token\n" + e)
});

client.once("ready", async () => {
    client.user.setPresence({ status: "dnd", activities: [{ name: client.config.game, type: 5 }] });
    console.log("Ready!");

    cron.schedule('0 15 * * 4', async () => {
        const webhook = new WebhookClient({ id: process.env.WEBHOOK_ID, token: process.env.WEBOOK_TOKEN });
        client.channels.fetch('1231030584680251432').then(channel => {
            let users = channel.guild.roles.cache.find(role => role.id === '540708709945311243').members
                .reduce((acc, m) => !m.user.bot ? [...acc, m.user.displayName] : acc, []);
            console.log(users);
            return sendAMessageAndThread(channel, webhook);
        });
    }, {
        scheduled: true,
        timezone: "America/Bogota"
    });

    cron.schedule('*/10 * * * * *', async () => {
        for (const interaction of client.deleted_messages) {
            try {
                client.deleted_messages.delete(interaction) && await interaction.deleteReply();
            } catch {
            }
        }
    });
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
