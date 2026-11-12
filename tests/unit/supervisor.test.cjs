require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

test('supervisor tolerates disconnect, reports recovery, and fails on shard death', () => {
  const { watchShard } = require('@/runtime/supervisor');
  const shard = new EventEmitter();
  shard.id = 0;
  const ready = new Set();
  const exits = [];
  watchShard(
    shard,
    ready,
    (code) => exits.push(code),
    () => {},
  );
  shard.emit('message', 'botrucho:ready');
  assert.equal(ready.has(0), true);
  shard.emit('disconnect');
  assert.equal(ready.has(0), false);
  assert.deepEqual(exits, []);
  shard.emit('resume');
  assert.equal(ready.has(0), true);
  shard.emit('death');
  assert.equal(ready.has(0), false);
  assert.deepEqual(exits, [1]);
});

test('graceful stop waits for actual child exit and kills on deadline', async () => {
  const { stopChild } = require('@/runtime/supervisor');
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.connected = true;
  child.send = (message, cb) => {
    assert.equal(message, 'botrucho:shutdown');
    cb(null);
  };
  const signals = [];
  child.kill = (signal) => {
    signals.push(signal);
    child.emit('exit', null, signal);
  };
  await stopChild(child, 10);
  assert.deepEqual(signals, ['SIGKILL']);
});

test('graceful child exit cancels force-kill', async () => {
  const { stopChild } = require('@/runtime/supervisor');
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.connected = true;
  child.send = (_, cb) => {
    cb(null);
    setImmediate(() => child.emit('exit', 0));
  };
  child.kill = () => assert.fail('must not kill a stopped child');
  await stopChild(child, 100);
});

test('unready children receive SIGTERM instead of an IPC message that can be dropped', async () => {
  const { stopChild } = require('@/runtime/supervisor');
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.connected = true;
  let sent = false;
  child.send = (_, cb) => {
    sent = true;
    cb(null);
    setImmediate(() => child.emit('exit', 0));
  };
  child.kill = (signal) => {
    assert.equal(signal, 'SIGTERM');
    setImmediate(() => child.emit('exit', 0));
  };
  await stopChild(child, 100, false);
  assert.equal(sent, false);
});
