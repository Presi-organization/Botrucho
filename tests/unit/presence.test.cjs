require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ActivityType } = require('discord.js');

const { PresenceRotation, statusFor, toActivity } = require('@/runtime/presence');
const { describeWeather } = require('@/services/REST/openMeteo.service');

const line = (content) => () => ({ type: ActivityType.Custom, content });

test('shows every line once before repeating any', async () => {
  const rotation = new PresenceRotation([line('a'), line('b'), line('c')]);
  for (let round = 0; round < 3; round++) {
    const seen = [];
    for (let i = 0; i < 3; i++) seen.push((await rotation.next()).content);
    assert.deepEqual(seen.sort(), ['a', 'b', 'c']);
  }
});

test('skips sources with nothing to show or that fail', async () => {
  const rotation = new PresenceRotation([
    () => null,
    async () => {
      throw new Error('offline');
    },
    line('only'),
  ]);
  for (let i = 0; i < 5; i++) assert.equal((await rotation.next()).content, 'only');
});

test('returns null when no source has anything to show', async () => {
  const rotation = new PresenceRotation([() => null, () => null]);
  assert.equal(await rotation.next(), null);
});

test('goes idle overnight in Bogotá time', () => {
  assert.equal(statusFor(new Date('2026-11-13T07:00:00Z')), 'idle');
  assert.equal(statusFor(new Date('2026-11-13T11:59:00Z')), 'idle');
  assert.equal(statusFor(new Date('2026-11-13T12:00:00Z')), 'online');
  assert.equal(statusFor(new Date('2026-11-14T04:59:00Z')), 'online');
});

test('custom statuses put the text in state; other types in name', () => {
  assert.deepEqual(toActivity({ type: ActivityType.Custom, content: '☕ Tinto' }), {
    name: 'Custom Status',
    state: '☕ Tinto',
    type: ActivityType.Custom,
  });
  assert.deepEqual(toActivity({ type: ActivityType.Watching, content: 'el techo' }), {
    name: 'el techo',
    type: ActivityType.Watching,
  });
});

test('describes WMO weather codes in Spanish', () => {
  assert.equal(describeWeather(0, true), '☀️ despejado');
  assert.equal(describeWeather(0, false), '🌙 despejado');
  assert.equal(describeWeather(2, true), '🌤️ algo nublado');
  assert.equal(describeWeather(3, true), '☁️ nublado');
  assert.equal(describeWeather(45, true), '🌫️ con niebla');
  assert.equal(describeWeather(53, true), '🌦️ lloviznando');
  assert.equal(describeWeather(63, true), '🌧️ lloviendo');
  assert.equal(describeWeather(81, false), '🌧️ lloviendo');
  assert.equal(describeWeather(95, true), '⛈️ con tormenta');
});

test('keeps each line duration so live lines can stay longer', async () => {
  const rotation = new PresenceRotation([
    () => ({ type: ActivityType.Custom, content: 'clima', durationMs: 120_000 }),
  ]);
  assert.equal((await rotation.next()).durationMs, 120_000);
  assert.equal(
    toActivity({ type: ActivityType.Custom, content: 'clima', durationMs: 120_000 }).state,
    'clima',
  );
});

test('every configured presence line starts with an emoji', () => {
  const { default: config } = require('@/config');
  for (const { content } of config.presence)
    assert.match(content, /^\p{Extended_Pictographic}/u, content);
});

test('never shows the same line twice in a row across reshuffles', async () => {
  const rotation = new PresenceRotation([line('a'), line('b'), line('c')]);
  let previous;
  for (let i = 0; i < 300; i++) {
    const { content } = await rotation.next();
    assert.notEqual(content, previous);
    previous = content;
  }
});
