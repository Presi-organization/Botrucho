require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');
const { Client, GatewayIntentBits, User } = require('discord.js');
const playerLibrary = require('discord-player');
const { Player, BaseExtractor, Track, Playlist, QueryType } = playerLibrary;
const { ICommand } = require('@/types/commands/command.type');
const embeds = require('@/utils/embed/message-builder.util');

const { code } = transformSync(readFileSync('src/commands/music/play.command.ts', 'utf8'), {
  swcrc: false,
  jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
  module: { type: 'commonjs' },
});

// Keep Player.search and query resolution real; replace only remote provider requests
// and voice playback. Generic search deliberately reproduces the empty Apple result.
class AppleFixture extends BaseExtractor {
  static identifier = 'fixture.apple';
  async validate(_query, type) {
    return [QueryType.AUTO_SEARCH, QueryType.APPLE_MUSIC_SONG].includes(type);
  }
  async handle(query, { type }) {
    return this.createResponse(
      null,
      type === QueryType.AUTO_SEARCH ? [] : [track(this, 'Apple song', query)],
    );
  }
}
class SpotifyFixture extends BaseExtractor {
  static identifier = 'fixture.spotify';
  async validate(_query, type) {
    return type === QueryType.SPOTIFY_SONG;
  }
  async handle(query) {
    return this.createResponse(null, [track(this, 'Spotify song', query)]);
  }
}
class YoutubeFixture extends BaseExtractor {
  static identifier = 'fixture.youtube';
  async validate(_query, type) {
    return [QueryType.YOUTUBE_SEARCH, QueryType.YOUTUBE_VIDEO, QueryType.YOUTUBE_PLAYLIST].includes(
      type,
    );
  }
  async handle(query, { type }) {
    if (query === 'no matching song') return this.createResponse(null, []);
    const tracks = [track(this, 'YouTube song', 'https://www.youtube.com/watch?v=FGBhQbmPwH8')];
    if (type !== QueryType.YOUTUBE_PLAYLIST) return this.createResponse(null, tracks);
    const playlist = new Playlist(this.context.player, {
      title: 'YouTube playlist',
      url: query,
      tracks,
    });
    return this.createResponse(playlist, tracks);
  }
}
function track(extractor, title, url) {
  return new Track(extractor.context.player, {
    title,
    url,
    author: 'Test artist',
    duration: '03:00',
    thumbnail: 'https://example.com/cover.jpg',
    source: 'arbitrary',
  });
}

async function executePlay(query) {
  const client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates] });
  const player = new Player(client);
  const replies = [];
  let played;
  let playOptions;
  player.play = async (_channel, result, options) => {
    played = result;
    playOptions = options;
  };
  try {
    await player.extractors.register(AppleFixture, {});
    await player.extractors.register(SpotifyFixture, {});
    await player.extractors.register(YoutubeFixture, {});
    const exports = {};
    runInNewContext(code, {
      exports,
      require: (name) => {
        if (name === 'discord-player') return { ...playerLibrary, useMainPlayer: () => player };
        if (name === '@/types') return { ICommand };
        if (name === '@/utils')
          return { ...embeds, logger: { error: () => assert.fail('unexpected playback error') } };
        return require(name);
      },
    });
    const interaction = {
      inCachedGuild: () => true,
      isChatInputCommand: () => true,
      client: { deleted_messages: new Set() },
      member: { voice: { channel: { id: 'voice-channel' } } },
      user: new User(client, { id: '123456789012345678', username: 'Listener' }),
      options: { getString: () => query },
      translate: () => ({
        NO_RESULTS_TITLE: 'No results',
        NO_RESULTS_DESC: 'No results for ${songName}',
        ADDED_2_QUEUE_TITLE: 'Added to queue',
        ADDED_2_QUEUE_DESC: '${songName}: ${songUrl}',
        CONNECT_VC: 'Join a voice channel',
      }),
      guild: { name: 'Test guild', iconURL: () => null },
      channel: {},
      deferReply: async () => {},
      editReply: async (reply) => replies.push(reply.embeds[0].toJSON()),
    };
    await new exports.default().execute(interaction, {
      lang: 'en',
      defaultVolume: 60,
      loopMode: 'OFF',
    });
    return { played, playOptions, replies };
  } finally {
    await player.destroy();
    client.destroy();
  }
}

test('plain song names use YouTube rather than an empty generic Apple Music search', async () => {
  const { played, replies } = await executePlay('Daft Punk One More Time');
  assert.ok(played?.hasTracks(), 'the requested song must reach playback');
  assert.equal(played.queryType, QueryType.YOUTUBE_SEARCH);
  assert.equal(
    replies[0].description,
    'YouTube song - Test artist: https://www.youtube.com/watch?v=FGBhQbmPwH8',
  );
});

for (const [query, type, title] of [
  ['https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', QueryType.SPOTIFY_SONG, 'Spotify song'],
  [
    'https://music.apple.com/us/album/test/123456789?i=123456790',
    QueryType.APPLE_MUSIC_SONG,
    'Apple song',
  ],
  ['https://www.youtube.com/watch?v=FGBhQbmPwH8', QueryType.YOUTUBE_VIDEO, 'YouTube song'],
]) {
  test(`recognized ${type} URLs retain automatic source routing`, async () => {
    const { played } = await executePlay(query);
    assert.equal(played.queryType, type);
    assert.equal(played.tracks[0].title, title);
  });
}

test('YouTube playlist URLs remain playlists', async () => {
  const { played, replies } = await executePlay(
    'https://www.youtube.com/playlist?list=PL123456789',
  );
  assert.equal(played.queryType, QueryType.YOUTUBE_PLAYLIST);
  assert.equal(played.hasPlaylist(), true);
  assert.ok(replies[0].description.includes('YouTube playlist'));
});

test('an empty YouTube result replies with no results without attempting playback', async () => {
  const { played, replies } = await executePlay('no matching song');
  assert.equal(played, undefined);
  assert.equal(replies[0].title, 'No results');
});

test('music effects stay disabled by default while volume keeps the guild default', async () => {
  const { playOptions } = await executePlay('Daft Punk One More Time');
  const node = playOptions.nodeOptions;
  assert.equal(node.volume, 60);
  for (const flag of [
    'disableEqualizer',
    'disableResampler',
    'disableBiquad',
    'disableCompressor',
    'disableReverb',
  ]) {
    assert.equal(node[flag], true, flag);
  }
  assert.equal(node.disableVolume, undefined);
  assert.equal(node.disableFilterer, undefined);
});
