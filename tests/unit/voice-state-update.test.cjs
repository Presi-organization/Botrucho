require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');

const compile = (path) =>
  transformSync(readFileSync(path, 'utf8'), {
    swcrc: false,
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  }).code;

const handlerCode = compile('src/events/discord/voiceStateHandlers/voice-activity-log.handler.ts');
const dispatcherCode = compile('src/events/discord/voiceStateUpdate.ts');
const HANDLER = '@/events/discord/voiceStateHandlers/voice-activity-log.handler';

const state = (id, name = 'Lounge', changes = {}) => ({
  channel: id ? { id, name } : null,
  member: { displayName: 'Listener' },
  ...changes,
});

async function getLogs(oldState, newState) {
  const logs = [];
  const exports = {};
  runInNewContext(handlerCode, {
    exports,
    require: (name) =>
      name === '@/utils' ? { logger: { debug: (message) => logs.push(message) } } : require(name),
  });
  exports.logVoiceActivity(oldState, newState);
  return logs;
}

function runDispatcher(logVoiceActivity) {
  const errors = [];
  const exports = {};
  runInNewContext(dispatcherCode, {
    exports,
    require: (name) => {
      if (name === HANDLER) return { logVoiceActivity };
      if (name === '@/utils') return { logger: { error: (...args) => errors.push(args) } };
      return require(name);
    },
  });
  return { exports, errors };
}

for (const property of [
  'selfMute',
  'selfDeaf',
  'serverMute',
  'serverDeaf',
  'streaming',
  'selfVideo',
]) {
  test(`does not log a channel move when ${property} changes in the same channel`, async () => {
    const logs = await getLogs(
      state('channel-1', 'Lounge', { [property]: false }),
      state('channel-1', 'Lounge', { [property]: true }),
    );
    assert.deepEqual(logs, []);
  });
}

test('logs a move between different channel IDs even when their names match', async () => {
  const logs = await getLogs(state('channel-1'), state('channel-2'));
  assert.deepEqual(logs, ['user Listener moved channels Lounge Lounge']);
});

test('still logs joining a channel', async () => {
  const logs = await getLogs(state(null), state('channel-1'));
  assert.deepEqual(logs, ['user Listener joined channel Lounge']);
});

test('still logs leaving a channel', async () => {
  const logs = await getLogs(state('channel-1'), state(null));
  assert.deepEqual(logs, ['user Listener left channel Lounge']);
});

test('execute delegates to the voice activity logger', async () => {
  const calls = [];
  const { exports, errors } = runDispatcher((...args) => calls.push(args));
  await exports.execute({}, 'old', 'new');
  assert.deepEqual(calls, [['old', 'new']]);
  assert.deepEqual(errors, []);
});

test('execute logs and swallows handler errors', async () => {
  const { exports, errors } = runDispatcher(() => {
    throw new Error('boom');
  });
  await exports.execute({}, 'old', 'new');
  assert.equal(errors.length, 1);
  assert.equal(errors[0][0], 'Error logging voice activity: ');
});
