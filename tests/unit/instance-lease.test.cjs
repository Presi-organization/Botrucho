require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Models MongoDB's atomic match/upsert behavior, not a live concurrency test.
function store() {
  const rows = new Map();
  return {
    async findOneAndUpdate(filter, update) {
      const row = rows.get(filter._id);
      const matches =
        row &&
        (filter.owner
          ? row.owner === filter.owner && row.expiresAt > filter.expiresAt.$gt
          : row.expiresAt <= filter.expiresAt.$lte);
      if (row && !matches) {
        if (filter.owner) return null;
        throw Object.assign(new Error('duplicate key'), { code: 11000 });
      }
      if (!row && filter.owner) return null;
      const next = { ...row, _id: filter._id, ...update.$set };
      rows.set(filter._id, next);
      return next;
    },
    async deleteOne(filter) {
      if (rows.get(filter._id)?.owner === filter.owner) rows.delete(filter._id);
    },
  };
}

test('lease implementation is available', () => {
  assert.ok(require('node:fs').existsSync('src/runtime/instance-lease.ts'));
});

test('one shard has one owner; other shards are independent; stale owners cannot mutate takeover', async () => {
  const { InstanceLease } = require('@/runtime/instance-lease');
  const leases = new InstanceLease(store());
  const now = new Date(0);
  assert.deepEqual(
    await Promise.all([
      leases.claim('app:0', 'a', now, 30_000),
      leases.claim('app:0', 'b', now, 30_000),
    ]),
    [true, false],
  );
  assert.equal(await leases.claim('app:1', 'b', now, 30_000), true);
  assert.equal(await leases.renew('app:0', 'a', new Date(31_000), 30_000), false);
  assert.equal(await leases.claim('app:0', 'b', new Date(31_000), 30_000), true);
  assert.equal(await leases.renew('app:0', 'a', new Date(32_000), 30_000), false);
  await leases.release('app:0', 'a');
  assert.equal(await leases.claim('app:0', 'c', new Date(32_000), 30_000), false);
  await leases.release('app:0', 'b');
  assert.equal(await leases.claim('app:0', 'c', new Date(32_000), 30_000), true);
});

test('non-contention errors propagate and acquisition retries are bounded', async () => {
  const { InstanceLease, acquireLease } = require('@/runtime/instance-lease');
  const leases = new InstanceLease({
    findOneAndUpdate: async () => {
      throw new Error('offline');
    },
  });
  await assert.rejects(leases.claim('app:0', 'a', new Date(), 30_000), /offline/);
  let time = 0;
  let calls = 0;
  await assert.rejects(
    acquireLease(
      async () => {
        calls++;
        return false;
      },
      {
        timeoutMs: 40,
        retryMs: 10,
        now: () => time,
        sleep: async (ms) => {
          time += ms;
        },
      },
    ),
    /already owned/,
  );
  assert.equal(calls, 5);
});
