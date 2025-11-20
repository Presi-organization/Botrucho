import 'tsconfig-paths/register';
import dotenv from 'dotenv';

dotenv.config();

import { Shard, ShardingManager } from 'discord.js';
import express, { Express } from 'express';
import mongoose from 'mongoose';
import healthRoute from '@/routes/health';
import { logger } from '@/utils';
import config from '@/config';

const validateEnv = () => {
  const requiredEnvVars: string[] = ['MONGO_URI', 'DISCORD_TOKEN', 'AISPEECH_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'WEBHOOK_ID', 'WEBOOK_TOKEN', 'RIOT_TOKEN', 'SHARDS', 'NODE_ENV'];
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  });
};
validateEnv();

const app: Express = express();

const port = process.env.PORT || 3000;

process.env.NODE_OPTIONS = '-r ts-node/register -r tsconfig-paths/register -r dotenv/config';

const manager = new ShardingManager(`${__dirname}/bot.ts`, {
  token: config.token,
  shardArgs: process.argv,
  totalShards: config.shards ?? 'auto',
});

app.use('/', healthRoute);

logger.log('[Shards] Starting spawn...');

manager.spawn({ timeout: -1 }).then((shards) => {
  shards.forEach((shard: Shard) => {
    shard.on('death', async () => {
      logger.error(`Shard ${shard.id} died. Attempting restart...`);
      if (mongoose && mongoose.connection && mongoose.connection.readyState !== 0) {
        logger.log('Closing mongoose connection...');
        await mongoose.connection.close();
      }
      process.exit(1);
    });
    shard.on('disconnect', async () => {
      logger.error(`Shard ${shard.id} disconnected. Attempting restart...`);
      if (mongoose && mongoose.connection && mongoose.connection.readyState !== 0) {
        logger.log('Closing mongoose connection...');
        await mongoose.connection.close();
      }
      process.exit(1);
    })
  });

  app.listen(port, (): void => {
    logger.log(`[Express] Bot app listening on port ${port}`)
  });
});
