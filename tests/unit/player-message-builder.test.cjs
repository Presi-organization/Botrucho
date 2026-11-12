require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');
const { Info } = require('@/utils/embed/message-builder.util');

const { code } = transformSync(
  readFileSync('src/utils/embed/player-message-builder.util.ts', 'utf8'),
  {
    swcrc: false,
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  },
);

async function buildMessage(thumbnail, edit = false) {
  const warnings = [];
  const exports = {};
  runInNewContext(code, {
    exports,
    URL,
    require: (name) =>
      name === '@/utils'
        ? { Info, logger: { warn: (message) => warnings.push(message) } }
        : require(name),
  });

  let embed;
  const message = {};
  const capture = async (payload) => {
    embed = payload.embeds[0].toJSON();
    return message;
  };
  const queue = {
    tracks: { data: [] },
    metadata: edit ? { queueMessage: { edit: capture } } : { channel: { send: capture } },
  };
  const track = {
    title: 'Test song',
    author: 'Test artist',
    url: 'https://example.com/song',
    thumbnail,
    extractor: { identifier: 'test-extractor' },
    requestedBy: {
      displayName: 'Listener',
      displayAvatarURL: () => 'https://example.com/avatar.png',
    },
  };
  await exports.updateQueueMessage(queue, track, {
    NOW_PLAYING: 'Now playing',
    SONG: 'Song ${index}',
    REQUESTED_BY: 'Requested by ${username}',
    TRACKS_LEFT: 'Tracks left',
  });
  assert.equal(queue.metadata.currentTrack, track);
  return { embed, warnings };
}

for (const edit of [false, true]) {
  for (const thumbnail of [
    '',
    undefined,
    null,
    123,
    'not a URL',
    'https://',
    'ftp://example.com/a',
  ]) {
    test(`${edit ? 'edits' : 'sends'} the queue message without invalid thumbnail ${JSON.stringify(thumbnail)}`, async () => {
      const { embed, warnings } = await buildMessage(thumbnail, edit);
      assert.equal(embed.thumbnail, undefined);
      assert.equal(embed.title, 'Now playing');
      assert.equal(embed.description, '[Test song](https://example.com/song)');
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes(JSON.stringify(thumbnail) ?? 'undefined'));
      assert.ok(warnings[0].includes('https://example.com/song'));
      assert.ok(warnings[0].includes('test-extractor'));
    });
  }
}

for (const thumbnail of ['https://example.com/cover.jpg', 'http://example.com/cover.jpg']) {
  test(`preserves valid thumbnail ${thumbnail}`, async () => {
    const { embed, warnings } = await buildMessage(thumbnail);
    assert.equal(embed.thumbnail.url, thumbnail);
    assert.deepEqual(warnings, []);
  });
}
