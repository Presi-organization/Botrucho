require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');

const { code } = transformSync(
  readFileSync('src/services/attendance/attendance-registration.ts', 'utf8'),
  {
    swcrc: false,
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  },
);

class EventNotFoundError extends Error {}
class UserAlreadyRegisteredError extends Error {}
class EventExpiredError extends Error {}

function load() {
  const logs = { error: [], log: [], trace: [] };
  const exports = {};
  runInNewContext(code, {
    exports,
    Error,
    require: (name) => {
      if (name === 'discord.js') return { ChannelType: { GuildText: 0 } };
      if (name === '@/errors') {
        return { EventExpiredError, EventNotFoundError, UserAlreadyRegisteredError };
      }
      if (name === '@/mongodb') return {};
      if (name === '@/utils') {
        return {
          logger: {
            error: (...args) => logs.error.push(args),
            log: (...args) => logs.log.push(args),
            trace: (...args) => logs.trace.push(args),
          },
        };
      }
      return require(name);
    },
  });
  return { ...exports, logs };
}

function scenario({ register, attendance, channel = null } = {}) {
  const calls = { removed: [], messageDeleted: 0, threadDeleted: 0 };
  const client = {
    channels: { fetch: async () => channel },
    eventAttendanceData: {
      registerUserForEvent: register ?? (async () => 'registered'),
      getEventAttendance: async () => attendance,
    },
  };
  const reaction = {
    emoji: { id: null, name: '✅' },
    message: {
      id: 'msg-1',
      channel: { id: 'chan-1' },
      guild: { members: { fetch: async () => ({ displayName: 'Ana' }) } },
      delete: async () => calls.messageDeleted++,
      thread: { delete: async () => calls.threadDeleted++ },
    },
    users: { remove: async (id) => calls.removed.push(id) },
  };
  return { client, reaction, user: { id: 'u1' }, calls };
}

test('logs and stops when the guild member cannot be fetched', async () => {
  const { registerAttendanceReaction, logs } = load();
  const { client, reaction, user, calls } = scenario();
  reaction.message.guild.members.fetch = async () => undefined;
  await registerAttendanceReaction(client, reaction, user);
  assert.equal(logs.error[0][0], 'Could not fetch guild member');
  assert.deepEqual(calls.removed, []);
});

test('removes the reaction when the user is already registered', async () => {
  const { registerAttendanceReaction } = load();
  const { client, reaction, user, calls } = scenario({
    register: async () => {
      throw new UserAlreadyRegisteredError();
    },
  });
  await registerAttendanceReaction(client, reaction, user);
  assert.deepEqual(calls.removed, ['u1']);
});

test('deletes the message and its thread when the event has expired', async () => {
  const { registerAttendanceReaction } = load();
  const { client, reaction, user, calls } = scenario({
    register: async () => {
      throw new EventExpiredError();
    },
  });
  await registerAttendanceReaction(client, reaction, user);
  assert.equal(calls.messageDeleted, 1);
  assert.equal(calls.threadDeleted, 1);
});

test('ignores events that are not found without logging an error', async () => {
  const { registerAttendanceReaction, logs } = load();
  const { client, reaction, user } = scenario({
    register: async () => {
      throw new EventNotFoundError();
    },
  });
  await registerAttendanceReaction(client, reaction, user);
  assert.deepEqual(logs.error, []);
});

test('logs unexpected errors', async () => {
  const { registerAttendanceReaction, logs } = load();
  const { client, reaction, user } = scenario({
    register: async () => {
      throw new Error('boom');
    },
  });
  await registerAttendanceReaction(client, reaction, user);
  assert.equal(logs.error[0][0], 'Error handling messageReactionAdd: ');
});

test('registers and clears the reaction even when the thread is unavailable', async () => {
  const { registerAttendanceReaction, logs } = load();
  const { client, reaction, user, calls } = scenario({
    attendance: { thread: { threadId: 't1', countMessageId: 'c1' }, attendees: [] },
  });
  await registerAttendanceReaction(client, reaction, user);
  assert.deepEqual(calls.removed, ['u1']);
  assert.match(logs.log[0][0], /User Ana registered for the event with emoji ✅/);
});

test('updates the vote count and posts the attendee line in the thread', async () => {
  const { registerAttendanceReaction } = load();
  const edits = [];
  const sent = [];
  let saved = 0;
  const countMessage = { edit: async (payload) => edits.push(payload) };
  const thread = {
    messages: { cache: new Map([['c1', countMessage]]) },
    send: async (payload) => {
      sent.push(payload);
      return { id: 'line-1' };
    },
  };
  const attendee = { userId: 'u1', reaction: ['✅'] };
  const { client, reaction, user } = scenario({
    channel: {
      isTextBased: () => true,
      type: 0,
      threads: { fetch: async () => thread },
    },
    attendance: {
      thread: { threadId: 't1', countMessageId: 'c1' },
      attendees: [attendee],
      save: async () => saved++,
    },
  });
  await registerAttendanceReaction(client, reaction, user);
  assert.equal(edits.length, 1);
  assert.equal(edits[0].content, '**✅ x1**');
  assert.deepEqual(sent, ['registered']);
  assert.equal(attendee.threadMessageId, 'line-1');
  assert.equal(saved, 1);
});
