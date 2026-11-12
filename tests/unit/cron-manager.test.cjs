require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('@swc/core');

function fixture(execute) {
  const callbacks = [];
  const errors = [];
  const modules = {
    'discord.js': {},
    'node-cron': {
      schedule: (_expression, callback) => {
        callbacks.push(callback);
        return { destroy: async () => {} };
      },
    },
    '@/services/webhooks': {
      initializeFrisbeeEventCron: execute,
      sendReminderToConfirmAttendance: execute,
    },
    '@/runtime/lifecycle': require('@/runtime/lifecycle'),
    '@/workers/radar.process': { workerRadarProcess: execute },
    '@/utils': { logger: { log() {}, warn() {}, error: (...args) => errors.push(args) } },
  };
  const { code } = transformSync(fs.readFileSync('src/services/cron-manager.service.ts', 'utf8'), {
    swcrc: false,
    jsc: { parser: { syntax: 'typescript' }, target: 'es2024' },
    module: { type: 'commonjs' },
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => modules[name] ?? require(name),
    Date,
    Promise,
    Map,
    Set,
  });
  const manager = new exports.CronManager({ cronData: { createOrUpdateCron: async () => {} } });
  return { manager, callbacks, errors };
}

const job = {
  cronId: 'job-1',
  cronName: 'ultimateFrisbee',
  cronExpression: '* * * * *',
  isActive: true,
  runOnInit: true,
};
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('startup and scheduled runs share a single in-flight job', async () => {
  let release;
  let calls = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const { manager, callbacks } = fixture(async () => {
    calls++;
    await gate;
  });
  manager.addCronJob(job);
  await settle();
  const tick = callbacks[0]();
  await settle();
  assert.equal(calls, 1);
  release();
  await tick;
  await callbacks[0]();
  assert.equal(calls, 2);
  await manager.shutdown();
});

test('replacing a schedule does not overlap a running job with the same cron ID', async () => {
  let release;
  let calls = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const { manager, callbacks } = fixture(async () => {
    calls++;
    await gate;
  });
  manager.addCronJob(job);
  await settle();
  manager.updateCronJob({ ...job, runOnInit: false });
  const tick = callbacks[1]();
  await settle();
  assert.equal(calls, 1);
  release();
  await tick;
  await callbacks[1]();
  assert.equal(calls, 2);
  await manager.shutdown();
});

test('different cron IDs can run independently and shutdown drains both', async () => {
  let release;
  let calls = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const { manager } = fixture(async () => {
    calls++;
    await gate;
  });
  manager.addCronJob(job);
  manager.addCronJob({ ...job, cronId: 'job-2' });
  await settle();
  assert.equal(calls, 2);
  let stopped = false;
  const shutdown = manager.shutdown().then(() => {
    stopped = true;
  });
  await settle();
  assert.equal(stopped, false);
  release();
  await shutdown;
  assert.equal(stopped, true);
});

test('a failed execution releases its in-flight slot for the next run', async () => {
  let calls = 0;
  const { manager, callbacks, errors } = fixture(async () => {
    calls++;
    throw new Error('synthetic job error');
  });
  manager.addCronJob({ ...job, runOnInit: false });
  await callbacks[0]();
  await callbacks[0]();
  assert.equal(calls, 2);
  assert.equal(errors.length, 2);
  await manager.shutdown();
});
