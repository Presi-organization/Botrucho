require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');
const { QueueRepeatMode } = require('discord-player');
const { ICommand } = require('@/types/commands/command.type');
const embeds = require('@/utils/embed/message-builder.util');

const { code } = transformSync(readFileSync('src/commands/music/loop.command.ts', 'utf8'), {
  swcrc: false,
  jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
  module: { type: 'commonjs' },
});

async function run(queue, mode) {
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (name) => {
      if (name === 'discord-player') return { QueueRepeatMode, useQueue: () => queue };
      if (name === '@/types') return { ICommand };
      if (name === '@/utils') return embeds;
      return require(name);
    },
  });
  const replies = [];
  const interaction = {
    inCachedGuild: () => true,
    isChatInputCommand: () => true,
    guildId: 'guild',
    client: { deleted_messages: new Set() },
    guild: { name: 'Test guild', iconURL: () => null },
    options: { getString: () => mode },
    translate: () => ({
      NOT_PLAYING_TITLE: 'Not playing',
      NOT_PLAYING_DESC: 'Nothing is playing',
      LOOP_TITLE: 'Loop',
      LOOP_OFF: 'off',
      LOOP_TRACK: 'track',
      LOOP_QUEUE: 'queue',
    }),
    deferReply: async () => {},
    editReply: async (reply) => replies.push(reply.embeds[0].toJSON()),
  };
  await new exports.default().execute(interaction, { lang: 'en' });
  return replies;
}

test('loop reports nothing playing without a current track', async () => {
  const replies = await run({ currentTrack: null, setRepeatMode: () => assert.fail() }, 'TRACK');
  assert.equal(replies[0].title, 'Not playing');
});

for (const mode of ['OFF', 'TRACK', 'QUEUE']) {
  test(`loop ${mode} sets the matching repeat mode`, async () => {
    const set = [];
    const replies = await run(
      { currentTrack: {}, setRepeatMode: (value) => set.push(value) },
      mode,
    );
    assert.deepEqual(set, [QueueRepeatMode[mode]]);
    assert.equal(replies[0].description, mode.toLowerCase());
  });
}
