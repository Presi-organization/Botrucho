import path from 'node:path';

import { ShardingManager } from 'discord.js';
import express from 'express';

import { createHealthRoute } from '@/routes/health';
import { createShutdown } from '@/runtime/lifecycle';
import { stopChild, watchShard } from '@/runtime/supervisor';

// Keep the manager independent of the bot's heavy service/player import graph.
const required = ['MONGO_URI', 'DISCORD_TOKEN', 'CLIENT_ID'];
for (const name of required) {
  if (!process.env[name] || process.env[name]?.startsWith('encrypted:')) {
    console.error(`Missing or undecrypted environment variable: ${name}`);
    process.exit(1);
  }
}

const shardCount = Number(process.env.SHARDS ?? 1);
if (!Number.isInteger(shardCount) || shardCount < 1) {
  console.error('SHARDS must be a positive integer');
  process.exit(1);
}

const manager = new ShardingManager(path.join(__dirname, 'bot.js'), {
  token: process.env.DISCORD_TOKEN,
  totalShards: shardCount,
  respawn: false, // Docker owns restart/backoff for the entire process tree.
  mode: 'process',
  execArgv: ['--max-old-space-size=256', '--max-semi-space-size=4'],
});
const ready = new Set<number>();
let stopping = false;
const app = express();
app.use(
  '/',
  createHealthRoute(() => !stopping && ready.size === shardCount),
);
const server = app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
const shutdown = createShutdown({
  timeoutMs: 12_000,
  report: (error) => console.error('Manager shutdown error', error),
  exit: (code) => process.exit(code),
  steps: [
    () => {
      stopping = true;
      manager.respawn = false;
      ready.clear();
    },
    () =>
      Promise.all(
        [...manager.shards.values()].map((shard) => stopChild(shard.process, 10_000, shard.ready)),
      ),
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  ],
});
const fail = (error: unknown) => {
  console.error(error);
  void shutdown(1);
};
server.on('error', fail);
process.on('SIGTERM', () => void shutdown(0));
process.on('SIGINT', () => void shutdown(0));
process.on('unhandledRejection', fail);
process.on('uncaughtException', fail);
manager.on('shardCreate', (shard) => {
  if (stopping) throw new Error('Cannot create a shard while shutting down');
  watchShard(
    shard,
    ready,
    (code) => {
      if (!stopping) void shutdown(code);
    },
    (error) => console.error('Shard error', error),
  );
  shard.on('spawn', () => {
    if (stopping) void stopChild(shard.process, 10_000, false);
  });
});

void manager
  .spawn({ timeout: 90_000 })
  .then(() => {
    console.log('All Discord shards connected');
  })
  .catch((error) => {
    if (!stopping) fail(error);
  });
