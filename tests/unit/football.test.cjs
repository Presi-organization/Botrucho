require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('@swc/core');

const { normalizeEvents } = require('@/services/REST/espn.normalizer');
const { buildFootballPages, filterByDate } = require('@/services/football/football-embed');
const { addDays, bogotaDate, formatLongDate, isDateKey } = require('@/services/football/date.util');

const texts = require('../../languages/en.json').FOOTBALL;
const textsEs = require('../../languages/es.json').FOOTBALL;

const event = (leagueId, home, away, date, state = 'pre', scores = ['0', '0']) => ({
  uid: `s:600~l:${leagueId}~e:${Math.random()}`,
  date,
  status: { type: { state } },
  competitions: [
    {
      competitors: [
        { homeAway: 'home', score: scores[0], team: { displayName: home } },
        { homeAway: 'away', score: scores[1], team: { displayName: away } },
      ],
    },
  ],
});

test('normalizer keeps mapped leagues, sorts by kickoff and drops malformed events', () => {
  const matches = normalizeEvents([
    event('650', 'Santa Fe', 'Nacional', '2026-11-15T01:00Z'),
    event('775', 'Bodo/Glimt', 'LASK Linz', '2026-11-14T17:45Z', 'post', ['2', '1']),
    event('99999', 'Unmapped', 'League', '2026-11-14T10:00Z'),
    { uid: 's:600~l:650~e:1' },
    event('650', 'No', 'Date', undefined),
    null,
  ]);
  assert.deepEqual(
    matches.map((match) => [match.competitionKey, match.home]),
    [
      ['champions', 'Bodo/Glimt'],
      ['betplay', 'Santa Fe'],
    ],
  );
  assert.equal(matches[0].homeScore, 2);
  assert.equal(matches[1].homeScore, undefined);
  assert.deepEqual(normalizeEvents(undefined), []);
});

test('normalizer keeps senior international friendlies but not youth ones', () => {
  const matches = normalizeEvents([
    event('3922', 'Japan', 'Brazil', '2026-11-14T10:15Z', 'post', ['3', '2']),
    event('20132', 'Japan U21', 'Spain U21', '2026-11-13T18:00Z'),
  ]);
  assert.deepEqual(
    matches.map((match) => [match.competitionKey, match.home]),
    [['friendly', 'Japan']],
  );
});

test('date helpers use Bogota time', () => {
  assert.equal(bogotaDate(new Date('2026-11-15T03:00:00Z')), '2026-11-14');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(isDateKey('2026-02-30'), false);
  assert.equal(isDateKey('2026-11-14'), true);
});

test('late Bogota matches belong to the Bogota day, not the UTC one', () => {
  const matches = normalizeEvents([
    event('650', 'A', 'B', '2026-11-15T02:00Z'),
    event('650', 'C', 'D', '2026-11-15T06:00Z'),
  ]);
  assert.deepEqual(
    filterByDate(matches, '2026-11-14').map((match) => match.home),
    ['A'],
  );
});

test('pages group by competition and show Bogota kickoff', () => {
  const matches = normalizeEvents([
    event('650', 'Santa Fe', 'Nacional', '2026-11-15T01:30Z'),
    event('775', 'Bodo/Glimt', 'LASK Linz', '2026-11-14T17:45Z'),
  ]);
  const [page, ...rest] = buildFootballPages({ texts, title: 'T', matches });
  assert.equal(rest.length, 0);
  assert.ok(
    page.description.indexOf('Champions League') < page.description.indexOf('Liga BetPlay'),
  );
  assert.match(page.description, /`20:30` Santa Fe vs Nacional/);
});

test('live and finished matches show the score', () => {
  const [page] = buildFootballPages({
    texts,
    title: 'T',
    matches: normalizeEvents([
      event('775', 'A', 'B', '2026-11-14T17:45Z', 'in', ['1', '0']),
      event('775', 'C', 'D', '2026-11-14T17:45Z', 'post', ['3', '2']),
    ]),
  });
  assert.match(page.description, /`LIVE` A 1 - 0 B/);
  assert.match(page.description, /`FT` \*\*C\*\* 3 - 2 D/);
  assert.doesNotMatch(page.description, /🔴|✅/);
});

test('live matches are listed first within their competition', () => {
  const [page] = buildFootballPages({
    texts,
    title: 'T',
    matches: normalizeEvents([
      event('775', 'Early', 'Game', '2026-11-14T15:00Z'),
      event('775', 'Live', 'Game', '2026-11-14T17:45Z', 'in', ['0', '0']),
    ]),
  });
  assert.ok(page.description.indexOf('Live') < page.description.indexOf('Early'));
});

test('a draw bolds neither team', () => {
  const [page] = buildFootballPages({
    texts,
    title: 'T',
    matches: normalizeEvents([event('775', 'E', 'F', '2026-11-14T17:45Z', 'post', ['2', '2'])]),
  });
  assert.match(page.description, /`FT` E 2 - 2 F/);
});

test('a heavy day is split into valid pages instead of overflowing the embed', () => {
  const events = [];
  for (let i = 0; i < 200; i++) {
    events.push(
      event('650', `Home team number ${i}`, `Away team number ${i}`, '2026-11-14T20:00Z'),
    );
  }
  const pages = buildFootballPages({ texts, title: 'T', matches: normalizeEvents(events) });
  assert.ok(pages.length > 1);
  for (const page of pages) assert.ok(page.description.length <= 4096);
  assert.match(pages[1].title, /\(2\/\d+\)/);
  assert.match(pages[1].description, /Liga BetPlay\*\* \(cont\.\)/);
});

test('competition filter and empty input', () => {
  const matches = normalizeEvents([
    event('650', 'A', 'B', '2026-11-14T20:00Z'),
    event('775', 'C', 'D', '2026-11-14T20:00Z'),
  ]);
  const [page] = buildFootballPages({ texts, title: 'T', matches, competitionKeys: ['champions'] });
  assert.doesNotMatch(page.description, /BetPlay/);
  assert.deepEqual(buildFootballPages({ texts, title: 'T', matches: [] }), []);
});

function dailyFixture({ matches, guilds, channelFor }) {
  const cleared = [];
  const marked = [];
  const errors = [];
  const fetches = { count: 0 };
  const modules = {
    '@/services/REST': {
      getEspnMatches: async () => {
        fetches.count++;
        return matches;
      },
    },
    '@/utils': {
      Info: (data) => ({ ...data, info: true }),
      logger: { log() {}, warn() {}, error: (...args) => errors.push(args) },
    },
    '@/services/football/date.util': require('@/services/football/date.util'),
    '@/services/football/football-embed': require('@/services/football/football-embed'),
  };
  const { code } = transformSync(
    fs.readFileSync('src/services/football/football-daily.service.ts', 'utf8'),
    {
      swcrc: false,
      jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
      module: { type: 'commonjs' },
    },
  );
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => modules[name] ?? require(name),
    Date,
    Promise,
    Set,
    Intl,
  });
  const client = {
    guildData: {
      getFootballChannels: async () => guilds,
      setFootballChannel: async (id, value) => cleared.push([id, value]),
      setFootballLastPostDate: async (id, dateKey) => marked.push([id, dateKey]),
    },
    guilds: {
      cache: {
        has: (id) => id !== 'foreign',
        get: (id) => ({
          translate: async () => (id.startsWith('es') ? textsEs : texts),
        }),
      },
    },
    channels: {
      fetch: async (id) => {
        const channel = channelFor(id);
        if (channel instanceof Error) throw channel;
        return channel;
      },
    },
  };
  return { exports, client, cleared, marked, errors, fetches };
}

const sendable = (posted, id) => ({
  isSendable: () => true,
  send: async (payload) => posted.push([id, payload]),
});

test('daily post goes only to configured guilds on this client', async () => {
  const matches = normalizeEvents([event('650', 'A', 'B', new Date().toISOString())]);
  const posted = [];
  const f = dailyFixture({
    matches,
    guilds: [
      { serverID: 'g1', footballChannelID: 'c1' },
      { serverID: 'foreign', footballChannelID: 'c2' },
      { serverID: 'g3', footballChannelID: null },
    ],
    channelFor: (id) => sendable(posted, id),
  });
  await f.exports.postDailyFootball(f.client);
  assert.deepEqual(
    posted.map(([id]) => id),
    ['c1'],
  );
  assert.equal(posted[0][1].embeds[0].info, true);
});

test('daily post is skipped when there are no matches today or ESPN failed', async () => {
  for (const matches of [[], undefined]) {
    const posted = [];
    const f = dailyFixture({
      matches,
      guilds: [{ serverID: 'g1', footballChannelID: 'c1' }],
      channelFor: (id) => sendable(posted, id),
    });
    await f.exports.postDailyFootball(f.client);
    assert.equal(posted.length, 0);
  }
});

test('daily post clears a deleted channel and keeps going for other guilds', async () => {
  const matches = normalizeEvents([event('650', 'A', 'B', new Date().toISOString())]);
  const posted = [];
  const gone = Object.assign(new Error('Unknown Channel'), { code: 10003 });
  const broken = Object.assign(new Error('boom'), { code: 500 });
  const f = dailyFixture({
    matches,
    guilds: [
      { serverID: 'g1', footballChannelID: 'c1' },
      { serverID: 'g2', footballChannelID: 'c2' },
      { serverID: 'g3', footballChannelID: 'c3' },
    ],
    channelFor: (id) => (id === 'c1' ? gone : id === 'c2' ? broken : sendable(posted, id)),
  });
  await f.exports.postDailyFootball(f.client);
  assert.deepEqual(f.cleared, [['g1', null]]);
  assert.equal(f.errors.length, 1);
  assert.deepEqual(
    posted.map(([id]) => id),
    ['c3'],
  );
});

test('maxPages cuts the output and adds a note with the omitted match count', () => {
  const events = [];
  for (let i = 0; i < 200; i++) {
    events.push(
      event('650', `Home team number ${i}`, `Away team number ${i}`, '2026-11-14T20:00Z'),
    );
  }
  const matches = normalizeEvents(events);
  const pages = buildFootballPages({
    texts,
    title: 'T',
    matches,
    maxPages: 1,
    moreHint: 'Usa /football.',
  });
  assert.equal(pages.length, 1);
  assert.ok(pages[0].description.length <= 4096);
  const shown = (pages[0].description.match(/ vs /g) ?? []).length;
  assert.match(
    pages[0].description,
    new RegExp(`and ${200 - shown} more matches\. Usa /football\.`),
  );
  assert.doesNotMatch(pages[0].title, /\(1\/1\)/);
});

test('no note when everything fits within maxPages', () => {
  const matches = normalizeEvents([event('650', 'A', 'B', '2026-11-14T20:00Z')]);
  const [page] = buildFootballPages({ texts, title: 'T', matches, maxPages: 1 });
  assert.doesNotMatch(page.description, /más/);
});

test('daily post is sent once per day per guild and retried only where it failed', async () => {
  const matches = normalizeEvents([event('650', 'A', 'B', new Date().toISOString())]);
  const today = bogotaDate();
  const posted = [];
  const broken = Object.assign(new Error('boom'), { code: 500 });
  const f = dailyFixture({
    matches,
    guilds: [
      { serverID: 'g1', footballChannelID: 'c1', footballLastPostDate: today },
      { serverID: 'g2', footballChannelID: 'c2', footballLastPostDate: addDays(today, -1) },
      { serverID: 'g3', footballChannelID: 'c3' },
      { serverID: 'g4', footballChannelID: 'c4' },
    ],
    channelFor: (id) => (id === 'c4' ? broken : sendable(posted, id)),
  });
  await f.exports.postDailyFootball(f.client);
  assert.deepEqual(
    posted.map(([id]) => id),
    ['c2', 'c3'],
  );
  assert.deepEqual(f.marked, [
    ['g2', today],
    ['g3', today],
  ]);
});

test('daily post does not fetch matches when every guild already got today’s post', async () => {
  const today = bogotaDate();
  const f = dailyFixture({
    matches: [],
    guilds: [{ serverID: 'g1', footballChannelID: 'c1', footballLastPostDate: today }],
    channelFor: () => assert.fail('should not post'),
  });
  await f.exports.postDailyFootball(f.client);
  assert.equal(f.marked.length, 0);
  assert.equal(f.fetches.count, 0);
});

test('long dates and labels follow the language', () => {
  assert.match(formatLongDate('2026-11-13', 'es-CO'), /viernes.*13.*noviembre/);
  assert.match(formatLongDate('2026-11-13', 'en-US'), /Friday.*November.*13/);
  const [page] = buildFootballPages({
    texts: textsEs,
    title: 'T',
    matches: normalizeEvents([event('775', 'A', 'B', '2026-11-14T17:45Z', 'in', ['1', '0'])]),
  });
  assert.match(page.description, /`EN VIVO` A 1 - 0 B/);
});

test('English and Spanish football translations define the same keys', () => {
  assert.deepEqual(Object.keys(textsEs).sort(), Object.keys(texts).sort());
  for (const value of [...Object.values(texts), ...Object.values(textsEs)]) {
    assert.ok(typeof value === 'string' && value.length > 0);
  }
});

test('daily post is written in each server’s language', async () => {
  const matches = normalizeEvents([event('650', 'A', 'B', new Date().toISOString())]);
  const posted = [];
  const f = dailyFixture({
    matches,
    guilds: [
      { serverID: 'en-guild', footballChannelID: 'c1' },
      { serverID: 'es-guild', footballChannelID: 'c2' },
    ],
    channelFor: (id) => sendable(posted, id),
  });
  await f.exports.postDailyFootball(f.client);
  const titles = Object.fromEntries(posted.map(([id, payload]) => [id, payload.embeds[0].title]));
  assert.match(titles.c1, /Today's matches/);
  assert.match(titles.c2, /Partidos de hoy/);
  assert.equal(f.fetches.count, 1);
});
