import path from 'path';
import cron from 'node-cron';
import mongoose from 'mongoose';
import {
  ClientOptions,
  CommandInteraction,
  GatewayIntentBits as Intents,
  GuildMember,
  Message,
  Partials,
  Role,
  TextChannel,
  WebhookClient
} from 'discord.js';
import { GuildQueue } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { Botrucho } from '@/mongodb';
import CommandLoader from '@/commands/CommandLoader';
import { deleteNonBotMessages, handleReactions, sendAMessageAndThread } from '@/services';
import { ActivityPresence } from '@/types';
import { logger } from '@/utils';
import '@/utils/extenders.util';

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
  client.player.events.on('debug', (queue: GuildQueue, message: string): void =>
    logger.log(`[${queue.guild.name}: ${queue.guild.id}] ${message}`)
  );
} else {
  // eslint-disable-next-line no-console
  console.warn = () => {/**/
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
  await client.player.extractors.register(YoutubeiExtractor, {
    streamOptions: { useClient: 'WEB_EMBEDDED', },
    overrideDownloadOptions: { client: 'WEB_EMBEDDED', },
    generateWithPoToken: true,
  })
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
        if (client.deleted_messages.delete(interaction)) {
          if (interaction instanceof Message) {
            await interaction.delete();
          } else if (interaction instanceof CommandInteraction) {
            await interaction.deleteReply();
          }
        }
      } catch (error: unknown) {
        logger.error('Error deleting interaction reply:', error);
      }
    }
  });

  cron.schedule('*/3 * * * *', async (): Promise<void> => {
    try {
      // Run the radar check in a separate process to prevent blocking
      const { spawn } = (await import('child_process'));
      const radarProcess = spawn('node', ['-e', `
        require('${path.join(process.cwd(), 'src/services/siata-radar.service.js')}')
          .checkAndSaveRadarImage()
          .catch(console.error);
      `], {
        detached: true,
        stdio: 'ignore'
      });

      // Detach the process so it runs independently
      radarProcess.unref();
    } catch (error) {
      logger.error('Error spawning radar image process:', error);
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

  client.on('guildMemberSpeaking', async (member: GuildMember, speaking: boolean): Promise<void> => {
    logger.debug(member.displayName || member.user.username, 'is talking?', speaking);
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

startBot().catch((e: Error): void => {
  logger.error('Failed to start the bot:', e);
});
