require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { AiUsageLimiter } = require('@/runtime/ai-limits');

// Models MongoDB's conditional upsert: a full counter fails the filter and the insert
// collides on _id; it is not a live concurrency test.
function store() {
  const rows = new Map();
  return {
    rows,
    async findOne(filter) {
      return rows.get(filter._id) ?? null;
    },
    async findOneAndUpdate(filter, update) {
      const row = rows.get(filter._id);
      if (row && row.count >= filter.count.$lt)
        throw Object.assign(new Error('duplicate key'), { code: 11000 });
      const next = row ?? { _id: filter._id, count: 0, tokens: 0, ...update.$setOnInsert };
      next.count += update.$inc.count;
      rows.set(filter._id, next);
      return next;
    },
    async updateOne(filter, update) {
      const row = rows.get(filter._id);
      if (!row) return;
      for (const [field, amount] of Object.entries(update.$inc)) row[field] += amount;
    },
  };
}

const limits = {
  userCooldownSec: 30,
  userDaily: 2,
  guildDaily: 3,
  globalDaily: 4,
  globalDailyTokens: 1000,
};

function setup(overrides = {}) {
  const usage = store();
  let now = Date.parse('2026-11-13T12:00:00Z');
  const limiter = new AiUsageLimiter(usage, () => now);
  const merged = { ...limits, ...overrides };
  return {
    usage,
    limiter: {
      acquire: (user, guild) => limiter.acquire(user, guild, merged),
      usage: (guild) => limiter.usage(guild),
    },
    advance: (ms) => (now += ms),
  };
}

async function use(limiter, user, guild = 'g1', result = { tokens: 10, refund: false }) {
  const permit = await limiter.acquire(user, guild);
  if (permit.ok) await permit.release(result);
  return permit;
}

test('enforces a per-user cooldown and reports when to retry', async () => {
  const { limiter, advance } = setup();
  assert.equal((await use(limiter, 'u1')).ok, true);
  advance(10_000);
  assert.deepEqual(await limiter.acquire('u1', 'g1'), {
    ok: false,
    reason: 'cooldown',
    retryAfterSec: 20,
  });
  advance(20_000);
  assert.equal((await use(limiter, 'u1')).ok, true);
});

test('refuses a second request while the first is still in flight', async () => {
  const { limiter } = setup({ userCooldownSec: 0 });
  const first = await limiter.acquire('u1', 'g1');
  assert.equal(first.ok, true);
  assert.deepEqual(await limiter.acquire('u1', 'g1'), { ok: false, reason: 'busy' });
  await first.release({ tokens: 0, refund: false });
  assert.equal((await use(limiter, 'u1')).ok, true);
});

test('applies user, guild and global daily caps in order and refunds partial takes', async () => {
  const { usage, limiter } = setup({ userCooldownSec: 0 });
  assert.equal((await use(limiter, 'u1')).ok, true);
  assert.equal((await use(limiter, 'u1')).ok, true);
  assert.deepEqual(await use(limiter, 'u1'), { ok: false, reason: 'user' });

  assert.equal((await use(limiter, 'u2')).ok, true);
  assert.deepEqual(await use(limiter, 'u3'), { ok: false, reason: 'guild' });
  assert.equal(usage.rows.get('user:u3:2026-11-13').count, 0);

  assert.equal((await use(limiter, 'u4', 'g2')).ok, true);
  assert.deepEqual(await use(limiter, 'u5', 'g2'), { ok: false, reason: 'global' });
  assert.equal(usage.rows.get('user:u5:2026-11-13').count, 0);
  assert.equal(usage.rows.get('guild:g2:2026-11-13').count, 1);
});

test('refunded requests do not count toward the caps', async () => {
  const { usage, limiter } = setup({ userCooldownSec: 0 });
  for (let i = 0; i < 5; i++) await use(limiter, 'u1', 'g1', { tokens: 0, refund: true });
  assert.equal(usage.rows.get('user:u1:2026-11-13').count, 0);
  assert.equal(usage.rows.get('global:2026-11-13').count, 0);
});

test('stops once the global token budget is spent', async () => {
  const { limiter } = setup({ userCooldownSec: 0 });
  assert.equal((await use(limiter, 'u1', 'g1', { tokens: 1000, refund: false })).ok, true);
  assert.deepEqual(await limiter.acquire('u2', 'g1'), { ok: false, reason: 'global' });
});

test('counters reset on the next UTC day', async () => {
  const { limiter, advance } = setup({ userCooldownSec: 0, userDaily: 1 });
  assert.equal((await use(limiter, 'u1')).ok, true);
  assert.deepEqual(await use(limiter, 'u1'), { ok: false, reason: 'user' });
  advance(86_400_000);
  assert.equal((await use(limiter, 'u1')).ok, true);
});

test('a zero cap disables that scope', async () => {
  const { limiter } = setup({ guildDaily: 0 });
  assert.deepEqual(await limiter.acquire('u1', 'g1'), { ok: false, reason: 'guild' });
});

test("reports today's global and per-guild usage", async () => {
  const { limiter } = setup({ userCooldownSec: 0 });
  await use(limiter, 'u1', 'g1', { tokens: 120, refund: false });
  await use(limiter, 'u2', 'g2', { tokens: 30, refund: false });
  assert.deepEqual(await limiter.usage('g1'), { requests: 2, tokens: 150, guildRequests: 1 });
  assert.deepEqual(await limiter.usage('g3'), { requests: 2, tokens: 150, guildRequests: 0 });
});
