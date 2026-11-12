export interface LeaseStore {
  findOneAndUpdate(filter: object, update: object, options: object): PromiseLike<unknown>;
  deleteOne(filter: object): PromiseLike<unknown>;
}

export class InstanceLease {
  constructor(private readonly store: LeaseStore) {}

  async claim(key: string, owner: string, now: Date, durationMs: number): Promise<boolean> {
    try {
      return !!(await this.store.findOneAndUpdate(
        { _id: key, expiresAt: { $lte: now } },
        { $set: { owner, expiresAt: new Date(now.getTime() + durationMs) } },
        { upsert: true, returnDocument: 'after' },
      ));
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)
        return false;
      throw error;
    }
  }

  async renew(key: string, owner: string, now: Date, durationMs: number): Promise<boolean> {
    return !!(await this.store.findOneAndUpdate(
      { _id: key, owner, expiresAt: { $gt: now } },
      { $set: { expiresAt: new Date(now.getTime() + durationMs) } },
      { returnDocument: 'after' },
    ));
  }

  async release(key: string, owner: string): Promise<void> {
    await this.store.deleteOne({ _id: key, owner });
  }
}

export async function acquireLease(
  claim: () => Promise<boolean>,
  options: {
    timeoutMs?: number;
    retryMs?: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    signal?: AbortSignal;
  } = {},
): Promise<void> {
  const {
    timeoutMs = 40_000,
    retryMs = 1000,
    now = Date.now,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    signal,
  } = options;
  const deadline = now() + timeoutMs;
  for (;;) {
    signal?.throwIfAborted();
    if (await claim()) return;
    if (now() >= deadline) throw new Error('Shard is already owned by another instance');
    await sleep(Math.min(retryMs, deadline - now()));
  }
}
