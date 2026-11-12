require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');

const { code } = transformSync(readFileSync('src/events/discord/voiceStateUpdate.ts', 'utf8'), {
  swcrc: false,
  jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
  module: { type: 'commonjs' },
});

const state = (id, name = 'Lounge', changes = {}) => ({
  channel: id ? { id, name } : null,
  member: { displayName: 'Listener' },
  ...changes,
});

async function getLogs(oldState, newState) {
  const logs = [];
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (name) =>
      name === '@/utils' ? { logger: { debug: (message) => logs.push(message) } } : require(name),
  });
  await exports.execute({}, oldState, newState);
  return logs;
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
