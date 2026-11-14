require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');
const { QueueRepeatMode } = require('discord-player');
const { ICommand } = require('@/types/commands/command.type');
const embeds = require('@/utils/embed/message-builder.util');

const { code } = transformSync(readFileSync('src/commands/music/song-info.command.ts', 'utf8'), {
  swcrc: false,
  jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
  module: { type: 'commonjs' },
});

const strings = {
  NOT_PLAYING_TITLE: 'Not playing',
  NOT_PLAYING_DESC: 'Nothing is playing',
  ARTIST: 'Artist',
  DURATION: 'Duration',
  PROGRESS: 'Progress',
  SOURCE: 'Source',
  VIEWS: 'Views',
  REQUESTED_BY: 'By ${username}',
  STATUS: 'Status',
  PLAYING: 'Playing',
  PAUSED: 'Paused',
  LOOP: 'Loop',
  LOOP_OFF: 'Off',
  LOOP_TRACK: 'Track',
  LOOP_QUEUE: 'Queue',
  TRACKS_LEFT: 'Left',
};

const fullTrack = {
  title: 'Song',
  author: 'Artist name',
  url: 'https://example.com/song',
  duration: '03:00',
  source: 'youtube',
  views: 1234567,
  thumbnail: 'https://example.com/cover.jpg',
  requestedBy: { displayName: 'Listener', displayAvatarURL: () => 'https://example.com/a.png' },
};

function fakeQueue(overrides = {}) {
  return {
    currentTrack: fullTrack,
    repeatMode: QueueRepeatMode.OFF,
    tracks: { size: 3 },
    node: {
      isPaused: () => false,
      getTimestamp: () => ({ current: { label: '01:00' }, total: { label: '03:00' } }),
      createProgressBar: () => '▬▬🔘▬▬',
    },
    ...overrides,
  };
}

async function run(queue) {
  const exports = {};
  runInNewContext(code, {
    exports,
    URL,
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
    translate: () => strings,
    deferReply: async () => {},
    editReply: async (reply) => replies.push(reply.embeds[0].toJSON()),
  };
  await new exports.default().execute(interaction, { lang: 'en' });
  return replies[0];
}

const field = (embed, name) => embed.fields.find((f) => f.name === name)?.value;

test('song-info reports nothing playing without a current track', async () => {
  const embed = await run(fakeQueue({ currentTrack: null }));
  assert.equal(embed.title, 'Not playing');
});

test('song-info shows the track details, progress and requester', async () => {
  const embed = await run(fakeQueue());
  assert.equal(embed.title, 'Song');
  assert.equal(embed.url, 'https://example.com/song');
  assert.equal(embed.thumbnail.url, 'https://example.com/cover.jpg');
  assert.equal(field(embed, 'Artist'), 'Artist name');
  assert.equal(field(embed, 'Duration'), '03:00');
  assert.equal(field(embed, 'Views'), '1,234,567');
  assert.equal(field(embed, 'Status'), 'Playing');
  assert.equal(field(embed, 'Loop'), 'Off');
  assert.equal(field(embed, 'Left'), '3');
  assert.equal(field(embed, 'Progress'), '01:00 / 03:00\n▬▬🔘▬▬');
  assert.equal(embed.footer.text, 'By Listener');
});

test('song-info reflects paused state and loop mode', async () => {
  const queue = fakeQueue({ repeatMode: QueueRepeatMode.QUEUE });
  queue.node.isPaused = () => true;
  const embed = await run(queue);
  assert.equal(field(embed, 'Status'), 'Paused');
  assert.equal(field(embed, 'Loop'), 'Queue');
});

test('song-info omits missing optional data without throwing', async () => {
  const queue = fakeQueue({
    currentTrack: { ...fullTrack, views: 0, thumbnail: 'not a url', requestedBy: null },
  });
  queue.node.createProgressBar = () => null;
  queue.node.getTimestamp = () => null;
  const embed = await run(queue);
  assert.equal(field(embed, 'Views'), undefined);
  assert.equal(field(embed, 'Progress'), undefined);
  assert.equal(embed.thumbnail, undefined);
  assert.equal(embed.footer, undefined);
});
