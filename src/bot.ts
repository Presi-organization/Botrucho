import mongoose from 'mongoose';
import { ClientOptions, GatewayIntentBits as Intents, GuildMember, Partials, } from 'discord.js';
import { GuildQueue } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeSabrExtractor } from 'discord-player-googlevideo';
import { Botrucho } from '@/mongodb';
import { cleanUnreadAttendance } from '@/services';
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

const connectToDatabase: () => Promise<void> = async (): Promise<void> => {
  try {
    await mongoose.connect(client.config.database.MongoURL);
    logger.log('Connected to MongoDB Atlas');
  } catch (error) {
    logger.error('Failed to connect to MongoDB Atlas', error);
    process.exit(1);
  }
};

const ensureSingleInstance = async (): Promise<void> => {
  const { botInstance } = client;
  const instanceId: string = client.config.instanceId;
  const isRunning: boolean = await botInstance.isAnotherInstanceRunning(instanceId);
  if (isRunning) {
    logger.error('Bot instance is already running on another instance. Exiting...');
    await mongoose.connection.close();
    process.exit(1);
  }
  setInterval(async () => {
    await botInstance.updateHeartbeat(instanceId);
  }, 10 * 1000);
}

const loadExtractors: () => Promise<void> = async (): Promise<void> => {
  const extractorsToExclude = [
    'SoundCloudExtractor',
    'VimeoExtractor',
    'ReverbnationExtractor'
  ];
  const extractors = DefaultExtractors.filter(extractor => !extractorsToExclude.includes(extractor.name));
  await client.player.extractors.loadMulti(extractors);
  await client.player.extractors.register(YoutubeSabrExtractor, { })
};

const setupClientEvents: () => void = (): void => {
  client.once('clientReady', async () => {
    cleanUnreadAttendance(client).catch(error => logger.error('Error cleaning unread attendance:', error));
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
    await client.cronManager.initializeCronJobs();
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
  try {
    await connectToDatabase();
    await ensureSingleInstance();
    await loadExtractors();
    await client.commandLoader.loadCommands();
    setupClientEvents();
    client.login(client.config.token).catch(e => {
      logger.log('[Discord login]: Please provide a valid discord bot token\n' + e);
    });
  } catch (e) {
    logger.error('Failed to start the bot:', e);
    process.exit(0);
  }
};

startBot().catch((e: Error): void => {
  logger.error('Failed to start the bot:', e);
});
