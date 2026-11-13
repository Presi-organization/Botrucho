require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  AiSettingsStore,
  defaultAiSettings,
  parseInstructionForm,
  parseLimitsForm,
  parseModelForm,
} = require('@/runtime/ai-settings');

function setup(stored = null) {
  const saved = [];
  let loads = 0;
  let now = 0;
  const store = new AiSettingsStore(
    {
      load: async () => (loads++, stored),
      save: async (settings) => saved.push(settings),
    },
    () => defaultAiSettings('Default prompt'),
    30_000,
    () => now,
  );
  return { store, saved, loads: () => loads, advance: (ms) => (now += ms) };
}

test('uses defaults, with the repo instruction, when nothing is stored', async () => {
  const { store } = setup();
  const settings = await store.get();
  assert.equal(settings.model, 'gemini-3.1-flash-lite');
  assert.equal(settings.systemInstruction, 'Default prompt');
  assert.equal(settings.limits.globalDaily, 200);
});

test('stored values override defaults, including partial limits', async () => {
  const { store } = setup({ model: 'custom', limits: { userDaily: 3 } });
  const settings = await store.get();
  assert.equal(settings.model, 'custom');
  assert.equal(settings.limits.userDaily, 3);
  assert.equal(settings.limits.guildDaily, 160);
});

test('caches reads for the TTL so other shards see edits shortly after', async () => {
  const { store, loads, advance } = setup();
  await store.get();
  await store.get();
  assert.equal(loads(), 1);
  advance(30_000);
  await store.get();
  assert.equal(loads(), 2);
});

test('update saves the full merged settings and serves them immediately', async () => {
  const { store, saved, loads } = setup();
  await store.update({ googleSearch: true });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].googleSearch, true);
  assert.equal(saved[0].systemInstruction, 'Default prompt');
  assert.equal((await store.get()).googleSearch, true);
  assert.equal(loads(), 1);
});

test('limits form accepts whole numbers and rejects anything else', () => {
  const values = {
    userCooldownSec: '10',
    userDaily: '5',
    guildDaily: '0',
    globalDaily: '18',
    globalDailyTokens: '100000',
  };
  assert.deepEqual(parseLimitsForm(values), {
    ok: true,
    value: {
      userCooldownSec: 10,
      userDaily: 5,
      guildDaily: 0,
      globalDaily: 18,
      globalDailyTokens: 100000,
    },
  });
  for (const bad of ['-1', '1.5', 'abc', '', '99999999']) {
    const result = parseLimitsForm({ ...values, userCooldownSec: bad });
    assert.equal(result.ok, false, bad);
    assert.match(result.error, /Cooldown/);
  }
});

test('model form validates model ID, thinking level, search flag and caps', () => {
  const values = {
    model: ' gemini-3.5-flash-lite ',
    thinkingLevel: 'Medium',
    googleSearch: 'ON',
    maxInputChars: '500',
    maxOutputTokens: '2048',
  };
  assert.deepEqual(parseModelForm(values), {
    ok: true,
    value: {
      model: 'gemini-3.5-flash-lite',
      thinkingLevel: 'medium',
      googleSearch: true,
      maxInputChars: 500,
      maxOutputTokens: 2048,
    },
  });
  for (const [field, bad] of [
    ['model', 'models/x y'],
    ['thinkingLevel', 'max'],
    ['googleSearch', 'yes'],
    ['maxInputChars', '0'],
    ['maxOutputTokens', '100000'],
  ])
    assert.equal(parseModelForm({ ...values, [field]: bad }).ok, false, field);
});

test('instructions must be non-empty and fit a Discord text input', () => {
  assert.deepEqual(parseInstructionForm('  Be brief.  '), { ok: true, value: 'Be brief.' });
  assert.equal(parseInstructionForm('   ').ok, false);
  assert.equal(parseInstructionForm('x'.repeat(4001)).ok, false);
});
