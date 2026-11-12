require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('shutdown is idempotent and attempts later cleanup after a failure', async () => {
  const { createShutdown } = require('@/runtime/lifecycle');
  const calls = [];
  const stop = createShutdown({
    timeoutMs: 100,
    report: () => {},
    exit: (code) => calls.push(code),
    steps: [
      () => {
        calls.push('timer');
      },
      async () => {
        calls.push('audio');
        throw new Error('failed');
      },
      async () => {
        calls.push('database');
      },
    ],
  });
  const first = stop(0);
  assert.equal(first, stop(0));
  await first;
  assert.deepEqual(calls, ['timer', 'audio', 'database', 1]);
});

test('shutdown escalates to nonzero and bounds hung cleanup', async () => {
  const { createShutdown } = require('@/runtime/lifecycle');
  const codes = [];
  const stop = createShutdown({
    timeoutMs: 10,
    report: () => {},
    exit: (c) => codes.push(c),
    steps: [() => new Promise(() => {})],
  });
  await stop(0);
  assert.deepEqual(codes, [1]);
});

test('serialized heartbeat does not overlap and stops scheduling on renewal failure', async () => {
  const { startPeriodic } = require('@/runtime/lifecycle');
  let running = 0;
  let max = 0;
  let failures = 0;
  let calls = 0;
  const task = startPeriodic(
    async () => {
      calls++;
      max = Math.max(max, ++running);
      await new Promise((r) => setTimeout(r, 8));
      running--;
      throw new Error('lease lost');
    },
    1,
    () => {
      failures++;
    },
  );
  await new Promise((r) => setTimeout(r, 30));
  await task.stop();
  assert.equal(max, 1);
  assert.equal(calls, 1);
  assert.equal(failures, 1);
});

test('stopping heartbeat waits for in-flight renewal', async () => {
  const { startPeriodic } = require('@/runtime/lifecycle');
  let finish;
  let started;
  const ready = new Promise((r) => {
    started = r;
  });
  const task = startPeriodic(
    () => {
      started();
      return new Promise((r) => {
        finish = r;
      });
    },
    1,
    () => {},
  );
  await ready;
  let stopped = false;
  const pending = task.stop().then(() => {
    stopped = true;
  });
  await Promise.resolve();
  assert.equal(stopped, false);
  finish();
  await pending;
  assert.equal(stopped, true);
});

test('lease acquisition aborts before doing work after shutdown', async () => {
  const { acquireLease } = require('@/runtime/instance-lease');
  const controller = new AbortController();
  controller.abort();
  let called = false;
  await assert.rejects(
    acquireLease(
      async () => {
        called = true;
        return true;
      },
      { signal: controller.signal },
    ),
    /abort/i,
  );
  assert.equal(called, false);
});

test('a bounded drain failure does not skip audio and database cleanup', async () => {
  const { createShutdown, withTimeout } = require('@/runtime/lifecycle');
  assert.equal(typeof withTimeout, 'function');
  const calls = [];
  const stop = createShutdown({
    timeoutMs: 100,
    report: () => {},
    exit: (code) => calls.push(code),
    steps: [
      () => withTimeout(new Promise(() => {}), 5, 'cron drain'),
      () => calls.push('audio'),
      () => calls.push('database'),
    ],
  });
  await stop(0);
  assert.deepEqual(calls, ['audio', 'database', 1]);
});
