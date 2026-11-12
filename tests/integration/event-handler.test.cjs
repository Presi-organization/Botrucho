require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');
const { Types } = require('mongoose');

test('event attendance uses the persisted ObjectId, not an optional id virtual', async () => {
  const event = {
    _id: new Types.ObjectId(),
    eventName: 'Practice',
    calendarLink: 'https://example.com',
    userAssisting: [],
  };
  const calls = [];
  const client = {
    config: { color: 0x112233 },
    eventData: { addAssistance: async (...args) => calls.push(args) },
    guildData: {},
    deleted_messages: new Set(),
  };
  const guild = {
    fetchEventDB: async () => event,
    translate: async () => ({
      ASSISTANCE_CONFIRMED: '${eventName}',
      INVITATION_LINK: '${calendarLink}',
      EVENT_GENERATED: '${username}',
    }),
  };
  const user = { id: 'user-1', send: async () => ({ id: 'dm-1' }) };
  const { code } = transformSync(
    readFileSync('src/events/discord/reactionHandlers/event.handler.ts', 'utf8'),
    {
      swcrc: false,
      jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
      module: { type: 'commonjs' },
    },
  );
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (name) => (name === '@/utils' ? { logger: { log() {} } } : require(name)),
    setTimeout: () => 0,
  });
  const handler = new exports.EventHandler(
    client,
    { emoji: { name: '👽' }, message: { guild, id: 'message-1' } },
    user,
  );
  await handler.handle();
  assert.deepEqual(calls, [[event._id.toString(), 'user-1']]);
});
