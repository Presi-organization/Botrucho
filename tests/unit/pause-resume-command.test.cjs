require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');
const { ICommand } = require('@/types/commands/command.type');
const embeds = require('@/utils/embed/message-builder.util');

function load(file) {
  const { code } = transformSync(readFileSync(file, 'utf8'), {
    swcrc: false,
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  });
  return (queue) => {
    const exports = {};
    runInNewContext(code, {
      exports,
      require: (name) => {
        if (name === 'discord-player') return { useQueue: () => queue };
        if (name === '@/types') return { ICommand };
        if (name === '@/utils') return embeds;
        return require(name);
      },
    });
    return exports.default;
  };
}

const loadPause = load('src/commands/music/pause.command.ts');
const loadResume = load('src/commands/music/resume.command.ts');

function fakeQueue({ paused, track = { title: 'song' } }) {
  const calls = [];
  return {
    calls,
    currentTrack: track,
    node: {
      isPaused: () => paused,
      pause: () => calls.push('pause'),
      resume: () => calls.push('resume'),
    },
  };
}

async function run(Command, queue) {
  const replies = [];
  const deleted = new Set();
  const interaction = {
    inCachedGuild: () => true,
    isChatInputCommand: () => true,
    guildId: 'guild',
    client: { deleted_messages: deleted },
    guild: { name: 'Test guild', iconURL: () => null },
    translate: () => ({
      NOT_PLAYING_TITLE: 'Not playing',
      NOT_PLAYING_DESC: 'Nothing is playing',
      PAUSED_TITLE: 'Paused',
      PAUSED_DESC: 'Paused desc',
      ALREADY_PAUSED: 'Already paused',
      RESUMED_TITLE: 'Resumed',
      RESUMED_DESC: 'Resumed desc',
      NOT_PAUSED: 'Not paused',
    }),
    deferReply: async () => {},
    editReply: async (reply) => replies.push(reply.embeds[0].toJSON()),
  };
  await new Command().execute(interaction, { lang: 'en' });
  return { replies, deleted, interaction };
}

test('pause and resume report nothing playing without a current track', async () => {
  for (const [Command, queue] of [
    [loadPause(null), null],
    [loadPause(fakeQueue({ paused: false, track: null })), null],
    [loadResume(null), null],
  ]) {
    const { replies } = await run(Command, queue);
    assert.equal(replies[0].title, 'Not playing');
  }
});

test('pause pauses a playing track', async () => {
  const queue = fakeQueue({ paused: false });
  const { replies, deleted, interaction } = await run(loadPause(queue), queue);
  assert.deepEqual(queue.calls, ['pause']);
  assert.equal(replies[0].title, 'Paused');
  assert.ok(deleted.has(interaction));
});

test('pause warns when already paused and does not pause again', async () => {
  const queue = fakeQueue({ paused: true });
  const { replies } = await run(loadPause(queue), queue);
  assert.deepEqual(queue.calls, []);
  assert.equal(replies[0].description, 'Already paused');
});

test('resume resumes a paused track', async () => {
  const queue = fakeQueue({ paused: true });
  const { replies, deleted, interaction } = await run(loadResume(queue), queue);
  assert.deepEqual(queue.calls, ['resume']);
  assert.equal(replies[0].title, 'Resumed');
  assert.ok(deleted.has(interaction));
});

test('resume warns when the track is not paused', async () => {
  const queue = fakeQueue({ paused: false });
  const { replies } = await run(loadResume(queue), queue);
  assert.deepEqual(queue.calls, []);
  assert.equal(replies[0].description, 'Not paused');
});
