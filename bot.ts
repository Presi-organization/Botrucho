import fs from 'node:fs';
import util from "util";
import cron from "node-cron";
import mongoose from "mongoose";
import dotenv from 'dotenv';
import { Routes } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import {
    GatewayIntentBits as Intents,
    WebhookClient,
    ClientOptions,
    ActivityType,
    GuildMember,
    TextChannel,
    Partials,
    Client,
    Role
} from "discord.js";
import { DefaultExtractors } from '@discord-player/extractor';
import { GuildQueue } from "discord-player";
import Botrucho from "./mongodb/base/Botrucho";
import { sendAMessageAndThread } from "./services/webhooks/ultimateThread";
import './util/extenders';

dotenv.config();

const readdir: (arg1: (string | Buffer<ArrayBufferLike> | URL)) => Promise<string[]> = util.promisify(fs.readdir);

interface BotruchoClient extends Client {
    config: any;
    player: any;
    commands: Map<string, any>;
    deleted_messages: Set<any>;
}

const client: BotruchoClient = new Botrucho({
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
} as ClientOptions) as BotruchoClient;

if (true || process.env.NODE_ENV !== 'production') {
    client.player.on('debug', (message: string): void => console.log(`[Player] ${ message }`));
    client.player.events.on('debug', (queue: GuildQueue<any>, message: string): void =>
        console.log(`[${ queue.guild.name }: ${ queue.guild.id }] ${ message }`)
    );
}

// List of extractor names to exclude
const extractorsToExclude = [
    'SoundCloudExtractor',
    'VimeoExtractor',
    'ReverbnationExtractor'
];
// Load all extractors except the ones in the exclude list
(async () => {
    const extractors = DefaultExtractors.filter(extractor => !extractorsToExclude.includes(extractor.name));
    await client.player.extractors.loadMulti(extractors);
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

(async function () {
    const categories: string[] = await readdir("./discord/commands/");
    console.log(`[Commands] ${ categories.length } Categories loaded.`, categories);
    const commands: any[] = [];
    for (const category of categories) {
        for (const command_file of (await readdir(`./discord/commands/${ category }/`)).filter(e => "js" === e.split(".").pop())) {
            const command = require(`./discord/commands/${ category }/${ command_file }`);
            client.commands.set(command.name, command);
            commands.push(command.data.toJSON());
        }
    }

    const rest: REST = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string);

    rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID as string, process.env.GUILD_ID as string), { body: commands })
        .then(() => console.log('[Commands] Successfully registered application commands.'))
        .catch(console.error);

    const discord_events: string[] = await readdir("./discord/events/discord");
    discord_events.forEach((discord_event: string) => {
        const event_name: string = discord_event.split(".")[0];
        const event_file = require(`./discord/events/discord/${ discord_event }`);
        client.on(event_name, (...e: any[]) => event_file.execute(client, ...e));
        delete require.cache[require.resolve(`./discord/events/discord/${ discord_event }`)];
    });

    const player_events: string[] = await readdir("./discord/events/player");
    player_events.forEach((player_event: string) => {
        const player_event_name: string = player_event.split(".")[0];
        const player_event_file = require(`./discord/events/player/${ player_event }`);
        client.player.events.on(player_event_name, (...e: any[]) => player_event_file.execute(client, ...e));
        delete require.cache[require.resolve(`./discord/events/player/${ player_event }`)];
    });

})();

client.login(client.config.token).catch(e => {
    console.log("[Discord login]: Please provide a valid discord bot token\n" + e);
});

client.once("ready", async () => {
    client.user?.setPresence({
        status: "dnd",
        activities: [{ name: client.config.game, type: ActivityType.Competing }]
    });
    console.log("Ready!");

    cron.schedule('30 19 * * 4', async (): Promise<void> => {
        const webhook = new WebhookClient({
            id: process.env.WEBHOOK_ID as string,
            token: process.env.WEBOOK_TOKEN as string
        });

        const channel = await client.channels.fetch('1231030584680251432') as TextChannel | null;
        if (channel?.isTextBased()) {
            let users = channel.guild.roles.cache.find((role: Role) => role.id === '540708709945311243')?.members
                .reduce((acc: String[], m: GuildMember) => !m.user.bot ? [...acc, m.user.displayName] : acc, []);
            console.log(users);
            return sendAMessageAndThread(channel, webhook);
        }
    }, {
        scheduled: true,
        timezone: "America/Bogota"
    });

    cron.schedule('*/10 * * * * *', async (): Promise<void> => {
        for (const interaction of client.deleted_messages) {
            try {
                client.deleted_messages.delete(interaction) && await interaction.deleteReply();
            } catch {
                // Handle error
            }
        }
    });
});

client.once("reconnecting", (): void => {
    console.log("Reconnecting!");
});

client.once("disconnect", (): void => {
    console.log("Disconnect!");
});

client.on("guildMemberSpeaking", (member, speaking): void => {
    console.log(member.displayName || member.user.username, "is talking?", speaking);
});

client.on("error", (e: Error): void => console.error(e));
