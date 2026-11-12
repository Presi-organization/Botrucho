import { randomUUID } from 'node:crypto';

import { DefaultExtractors } from '@discord-player/extractor';
import { GuildQueue } from 'discord-player';
import { YoutubeExtractor } from 'discord-player-youtubei';
import { ClientOptions, GatewayIntentBits as Intents, Partials } from 'discord.js';
import mongoose from 'mongoose';

import { Botrucho } from '@/mongodb';
import { InstanceLeaseModel } from '@/mongodb/models/InstanceLease';
import { acquireLease, InstanceLease } from '@/runtime/instance-lease';
import { createShutdown, startPeriodic } from '@/runtime/lifecycle';
import { installVoiceDiagnostics } from '@/runtime/voice-diagnostics';
import { cleanUnreadAttendance } from '@/services';
import { ActivityPresence } from '@/types';
import { logger } from '@/utils';
import '@/utils/extenders.util';

const client: Botrucho = new Botrucho({
  intents: [
    Intents.Guilds,
    Intents.GuildMembers,
    Intents.GuildMessages,
    Intents.GuildVoiceStates,
    Intents.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
} as ClientOptions);

const stopVoiceDiagnostics = installVoiceDiagnostics(
  client.player,
  (record) => logger.log('[VoiceDiagnostics]', record),
  process.env?.VOICE_DIAGNOSTICS === '1',
);

if (!client.config.isProduction) {
  client.player.on('debug', (message: string): void => logger.log(`[Player] ${message}`));
  client.player.events.on('debug', (queue: GuildQueue, message: string): void => {
    const guildName = queue?.guild?.name ?? 'Unknown';
    const guildId = queue?.guild?.id ?? 'Unknown';
    logger.log(`[${guildName}: ${guildId}] ${message}`);
  });
}

const startup = new AbortController();
const leases = new InstanceLease(InstanceLeaseModel);
const owner = randomUUID();
const shardId = client.shard?.ids.join(',') ?? '0';
const leaseKey = `${client.config.discord_client}:${shardId}`;
let pendingClaim: Promise<boolean> | undefined;
let cronDrained = true;
let heartbeat: ReturnType<typeof startPeriodic> | undefined;
let presenceTimer: ReturnType<typeof setInterval> | undefined;

const shutdown = createShutdown({
  timeoutMs: 8_000,
  report: (error) => logger.error('Shutdown error', error),
  exit: (code) => process.exit(code),
  steps: [
    () => {
      startup.abort();
      stopVoiceDiagnostics();
      clearInterval(presenceTimer);
      if (process.connected)
        process.send?.('botrucho:stopping', () => {
          /* Best effort during teardown. */
        });
    },
    () => heartbeat?.stop(),
    async () => {
      try {
        await client.cronManager.shutdown();
      } catch (error) {
        cronDrained = false;
        throw error;
      }
    },
    () => client.player.destroy(),
    () => client.destroy(),
    async () => {
      if (!pendingClaim || !cronDrained) return;
      // Wait out an in-flight claim, including uncertain socket failure, then
      // release by owner even if the acquisition result was never observed.
      try {
        await pendingClaim;
      } catch {
        /* Still attempt owner-scoped release. */
      }
      await leases.release(leaseKey, owner);
    },
    () => mongoose.disconnect(),
  ],
});

process.on('SIGTERM', () => void shutdown(0));
process.on('SIGINT', () => void shutdown(0));
process.on('message', (message) => {
  if (message === 'botrucho:shutdown') void shutdown(0);
});
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', error);
  void shutdown(1);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  void shutdown(1);
});

const connectToDatabase: () => Promise<void> = async (): Promise<void> => {
  try {
    await mongoose.connect(client.config.database.MongoURL, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 5_000,
    });
    logger.log('Connected to MongoDB Atlas');
  } catch (error) {
    logger.error('Failed to connect to MongoDB Atlas', error);
    throw error;
  }
};

const ensureSingleInstance = async (): Promise<void> => {
  await acquireLease(
    async () => {
      pendingClaim = leases.claim(leaseKey, owner, new Date(), 30_000);
      return pendingClaim;
    },
    { signal: startup.signal },
  );
  startup.signal.throwIfAborted();
  heartbeat = startPeriodic(
    async () => {
      if (!(await leases.renew(leaseKey, owner, new Date(), 30_000)))
        throw new Error('Shard lease lost');
    },
    10_000,
    (error) => {
      logger.error('Lease renewal failed', error);
      void shutdown(1);
    },
  );
};

const loadExtractors: () => Promise<void> = async (): Promise<void> => {
  const extractorsToExclude = ['SoundCloudExtractor', 'VimeoExtractor', 'ReverbnationExtractor'];
  const extractors = DefaultExtractors.filter(
    (extractor) => !extractorsToExclude.includes(extractor.name),
  );
  await client.player.extractors.loadMulti(extractors);
  await client.player.extractors.register(YoutubeExtractor, {});
};

const setupClientEvents: () => void = (): void => {
  client.once('clientReady', () => {
    void (async () => {
      startup.signal.throwIfAborted();
      cleanUnreadAttendance(client).catch((error) =>
        logger.error('Error cleaning unread attendance:', error),
      );
      const statusArray: ActivityPresence[] = client.config.presence;
      const pickPresence = async (): Promise<void> => {
        const option: number = Math.floor(Math.random() * statusArray.length);
        try {
          client.user?.setPresence({
            status: statusArray[option].status,
            activities: [{ name: statusArray[option].content, type: statusArray[option].type }],
          });
        } catch (error: unknown) {
          logger.error(error);
        }
      };
      presenceTimer = setInterval(pickPresence, 5000);
      logger.log('Ready!');
      await client.cronManager.initializeCronJobs();
      startup.signal.throwIfAborted();
      if (process.connected)
        process.send?.('botrucho:ready', (error) => {
          if (error) {
            logger.error('Failed to notify manager', error);
            void shutdown(1);
          }
        });
    })().catch((error) => {
      logger.error('Ready initialization failed', error);
      void shutdown(1);
    });
  });

  client.on('shardReconnecting', (): void => {
    logger.log('Reconnecting!');
  });

  client.on('shardDisconnect', (): void => {
    logger.log('Disconnect!');
  });

  client.on('error', (e: Error): void => logger.error(e));
};

const startBot: () => Promise<void> = async (): Promise<void> => {
  try {
    await connectToDatabase();
    startup.signal.throwIfAborted();
    await ensureSingleInstance();
    await loadExtractors();
    startup.signal.throwIfAborted();
    await client.commandLoader.loadCommands();
    startup.signal.throwIfAborted();
    setupClientEvents();
    await client.login(client.config.token);
  } catch (e) {
    logger.error('Failed to start the bot:', e);
    await shutdown(1);
  }
};

startBot().catch((e: Error): void => {
  logger.error('Failed to start the bot:', e);
});
