require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');

function boot({
  databaseFailure = false,
  loginFailure = false,
  waitForDatabase = false,
  waitForClaim = false,
} = {}) {
  const calls = [];
  const process = new EventEmitter();
  let exited;
  const exit = new Promise((resolve) => {
    exited = resolve;
  });
  process.connected = false;
  process.exit = (code) => {
    calls.push(`exit:${code}`);
    exited(code);
  };
  let connected;
  const pendingDatabase = new Promise((resolve) => {
    connected = resolve;
  });
  let claimed;
  let claiming;
  const pendingClaim = new Promise((resolve) => {
    claimed = resolve;
  });
  const claimStarted = new Promise((resolve) => {
    claiming = resolve;
  });
  const mongoose = {
    connect: async () => {
      calls.push('connect');
      if (databaseFailure) throw new Error('database offline');
      if (waitForDatabase) await pendingDatabase;
    },
    disconnect: async () => calls.push('disconnect'),
  };
  class Botrucho extends EventEmitter {
    config = {
      isProduction: true,
      database: { MongoURL: 'fake' },
      discord_client: 'app',
      token: 'fake',
      presence: [],
    };
    shard = { ids: [0] };
    player = {
      extractors: {
        loadMulti: async () => calls.push('extractors'),
        register: async () => {},
      },
      destroy: async () => calls.push('audio'),
    };
    cronManager = { shutdown: async () => calls.push('cron') };
    commandLoader = { loadCommands: async () => calls.push('commands') };
    async login() {
      calls.push('login');
      if (loginFailure) throw new Error('invalid login');
    }
    async destroy() {
      calls.push('discord');
    }
  }
  const modules = {
    mongoose,
    'discord.js': { GatewayIntentBits: {}, Partials: {} },
    '@discord-player/extractor': { DefaultExtractors: [] },
    'discord-player-youtubei': { YoutubeExtractor: class {} },
    '@/mongodb': { Botrucho },
    '@/services': { cleanUnreadAttendance: async () => {} },
    '@/utils': { logger: { error() {}, log() {} } },
    '@/utils/extenders.util': {},
    '@/mongodb/models/InstanceLease': {
      InstanceLeaseModel: {
        findOneAndUpdate: async () => {
          calls.push('lease');
          claiming();
          if (waitForClaim) await pendingClaim;
          calls.push('claimed');
          return {};
        },
        deleteOne: async () => calls.push('release'),
      },
    },
  };
  const { code } = transformSync(readFileSync('src/bot.ts', 'utf8'), {
    swcrc: false,
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  });
  runInNewContext(code, {
    require: (name) => (Object.hasOwn(modules, name) ? modules[name] : require(name)),
    process,
    exports: {},
    AbortController,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  });
  return { calls, process, exit, connected, claimed, claimStarted };
}

test('database startup failure cleans up and exits nonzero without login', async () => {
  const bot = boot({ databaseFailure: true });
  assert.equal(await bot.exit, 1);
  assert.equal(bot.calls.includes('login'), false);
  assert.equal(bot.calls.includes('disconnect'), true);
});

test('failed Discord login releases ownership and exits nonzero', async () => {
  const bot = boot({ loginFailure: true });
  assert.equal(await bot.exit, 1);
  assert.ok(bot.calls.indexOf('release') > bot.calls.indexOf('discord'));
  assert.ok(bot.calls.indexOf('disconnect') > bot.calls.indexOf('release'));
});

test('signal while database connects prevents subsequent startup work', async () => {
  const bot = boot({ waitForDatabase: true });
  bot.process.emit('SIGTERM');
  bot.connected();
  await bot.exit;
  assert.equal(bot.calls.includes('extractors'), false);
  assert.equal(bot.calls.includes('login'), false);
});

test('shutdown waits for a pending claim before owner-scoped release', async () => {
  const bot = boot({ waitForClaim: true });
  await bot.claimStarted;
  bot.process.emit('SIGTERM');
  await new Promise((resolve) => setImmediate(resolve));
  bot.claimed();
  await bot.exit;
  assert.ok(bot.calls.indexOf('release') > bot.calls.indexOf('claimed'), bot.calls.join(','));
  assert.equal(bot.calls.includes('login'), false);
});
