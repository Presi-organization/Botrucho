import cron from "node-cron";
import mongoose from "mongoose";
import {
    GatewayIntentBits as Intents,
    WebhookClient,
    ClientOptions,
    ActivityType,
    GuildMember,
    TextChannel,
    Partials,
    Role
} from "discord.js";
import { DefaultExtractors } from '@discord-player/extractor';
import { GuildQueue } from "discord-player";
import Botrucho from "@mongodb/base/Botrucho";
import CommandLoader from "@commands/CommandLoader";
import { sendAMessageAndThread } from "@services/webhooks/ultimateThread";
import '@util/extenders';

const client: Botrucho = new Botrucho({
    intents: [
        Intents.Guilds,
        Intents.GuildMembers,
        Intents.GuildMessages,
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
} as ClientOptions);

if (!client.config.isProduction) {
    client.player.on('debug', (message: string): void => console.log(`[Player] ${ message }`));
    client.player.events.on('debug', (queue: GuildQueue<any>, message: string): void =>
        console.log(`[${ queue.guild.name }: ${ queue.guild.id }] ${ message }`)
    );
}

const loadExtractors = async () => {
    const extractorsToExclude = [
        'SoundCloudExtractor',
        'VimeoExtractor',
        'ReverbnationExtractor'
    ];
    const extractors = DefaultExtractors.filter(extractor => !extractorsToExclude.includes(extractor.name));
    await client.player.extractors.loadMulti(extractors);
};

const connectToDatabase = async () => {
    try {
        await mongoose.connect(client.config.database.MongoURL);
        console.log('Connected to MongoDB Atlas');
    } catch (error) {
        console.error('Failed to connect to MongoDB Atlas', error);
        process.exit(1);
    }
};

const loadCommands = async () => {
    const commandLoader = new CommandLoader(client);
    await commandLoader.loadCommands();
};

const setupCronJobs = () => {
    cron.schedule('30 19 * * 4', async (): Promise<void> => {
        const webhook = new WebhookClient(client.config.frisbeeHook);

        const channel = await client.channels.fetch('1231030584680251432') as TextChannel | null;
        if (channel?.isTextBased()) {
            const users = channel.guild.roles.cache.find((role: Role) => role.id === '540708709945311243')?.members
                .reduce((acc: string[], m: GuildMember) => !m.user.bot ? [...acc, m.user.displayName] : acc, []);
            console.log(users);
            return sendAMessageAndThread(channel, webhook);
        }
    }, {
        scheduled: true,
        timezone: 'America/Bogota'
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
};

const setupClientEvents = () => {
    client.once('ready', async () => {
        client.user?.setPresence({
            status: 'dnd',
            activities: [{ name: client.config.game, type: ActivityType.Competing }]
        });
        console.log('Ready!');
        setupCronJobs();
    });

    client.once('reconnecting', (): void => {
        console.log('Reconnecting!');
    });

    client.once('disconnect', (): void => {
        console.log('Disconnect!');
    });

    client.on('guildMemberSpeaking', async (member, speaking): Promise<void> => {
        console.log(member.displayName || member.user.username, 'is talking?', speaking);
    });

    client.on('error', (e: Error): void => console.error(e));
};

const startBot = async () => {
    await loadExtractors();
    await connectToDatabase();
    await loadCommands();
    setupClientEvents();
    client.login(client.config.token).catch(e => {
        console.log('[Discord login]: Please provide a valid discord bot token\n' + e);
    });
};

startBot().catch(e => {
    console.error('Failed to start the bot:', e);
});
