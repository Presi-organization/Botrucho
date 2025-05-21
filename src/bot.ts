import cron from "node-cron";
import mongoose from "mongoose";
import {
  ClientOptions,
  GatewayIntentBits as Intents,
  GuildMember,
  Message,
  Partials,
  Role,
  TextChannel,
  WebhookClient
} from "discord.js";
import { GuildQueue } from "discord-player";
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeiExtractor } from "discord-player-youtubei";
import Botrucho from "@/mongodb/base/Botrucho";
import CommandLoader from "@/commands/CommandLoader";
import { deleteNonBotMessages, handleReactions, sendAMessageAndThread } from "@/services/webhooks/ultimateThread";
import { ActivityPresence } from "@/types/Config";
import { logger } from '@/util/Logger';
import '@/util/extenders';

const client: Botrucho = new Botrucho({
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
} as ClientOptions);

if (!client.config.isProduction) {
  client.player.on('debug', (message: string): void => logger.log(`[Player] ${message}`));
  client.player.events.on('debug', (queue: GuildQueue<any>, message: string): void =>
    logger.log(`[${queue.guild.name}: ${queue.guild.id}] ${message}`)
  );
} else {
  console.warn = () => {
  };
}

const loadExtractors: () => Promise<void> = async (): Promise<void> => {
  const extractorsToExclude = [
    'SoundCloudExtractor',
    'VimeoExtractor',
    'ReverbnationExtractor'
  ];
  const extractors = DefaultExtractors.filter(extractor => !extractorsToExclude.includes(extractor.name));
  await client.player.extractors.loadMulti(extractors);
  await client.player.extractors.register(YoutubeiExtractor, {})
};

const connectToDatabase: () => Promise<void> = async (): Promise<void> => {
  try {
    await mongoose.connect(client.config.database.MongoURL);
    logger.log('Connected to MongoDB Atlas');
  } catch (error) {
    logger.error('Failed to connect to MongoDB Atlas', error);
    process.exit(1);
  }
};

const loadCommands: () => Promise<void> = async (): Promise<void> => {
  const commandLoader = new CommandLoader(client);
  await commandLoader.loadCommands();
};

const setupCronJobs: () => void = (): void => {
  cron.schedule('00 19 * * 4', async (): Promise<void> => {
    const webhook = new WebhookClient(client.config.frisbeeHook);

    const channel = await client.channels.fetch('1231030584680251432') as TextChannel | null;
    if (channel?.isTextBased()) {
      const users = channel.guild.roles.cache.find((role: Role) => role.id === '540708709945311243')?.members
        .reduce((acc: string[], m: GuildMember) => !m.user.bot ? [...acc, m.user.displayName] : acc, []);
      logger.log(users);
      return sendAMessageAndThread(channel, webhook, client.eventAttendanceData);
    }
  }, {
    timezone: 'America/Bogota'
  });

  cron.schedule('*/10 * * * * *', async (): Promise<void> => {
    for (const interaction of client.deleted_messages) {
      try {
        client.deleted_messages.delete(interaction) && await interaction.deleteReply();
      } catch {
      }
    }
  });
};

const cleanUnreadAttendance = async (): Promise<void> => {
  try {
    const { messageId, thread: { threadId } } = await client.eventAttendanceData.getEventAttendance({});
    const channel = await client.channels.fetch('1231030584680251432') as TextChannel | null;
    if (channel?.isTextBased()) {
      const message: Message<true> = await channel.messages.fetch(messageId);

      await handleReactions(client, message);
      await deleteNonBotMessages(client, channel, threadId);
    }
  } catch (e) {
    logger.error('Error during client ready event:', e);
  }
}

const setupClientEvents: () => void = (): void => {
  client.once('ready', async () => {
    cleanUnreadAttendance().catch(error => logger.error('Error cleaning unread attendance:', error));
    const statusArray: ActivityPresence[] = client.config.presence;
    const pickPresence = async (): Promise<void> => {
      const option: number = Math.floor(Math.random() * statusArray.length);
      try {
        client.user?.setPresence({
          status: statusArray[option].status,
          activities: [{ name: statusArray[option].content, type: statusArray[option].type }]
        });
      } catch (error: unknown) {
        logger.error(error);
      }
    };
    setInterval(pickPresence, 5000);
    logger.log('Ready!');
    setupCronJobs();
  });

  client.once('reconnecting', (): void => {
    logger.log('Reconnecting!');
  });

  client.once('disconnect', (): void => {
    logger.log('Disconnect!');
  });

  client.on('guildMemberSpeaking', async (member: any, speaking: any): Promise<void> => {
    logger.log(member.displayName || member.user.username, 'is talking?', speaking);
  });

  client.on('error', (e: Error): void => logger.error(e));
};

const startBot: () => Promise<void> = async (): Promise<void> => {
  await loadExtractors();
  await connectToDatabase();
  await loadCommands();
  setupClientEvents();
  client.login(client.config.token).catch(e => {
    logger.log('[Discord login]: Please provide a valid discord bot token\n' + e);
  });
};

startBot().catch((e: any): void => {
  logger.error('Failed to start the bot:', e);
});
