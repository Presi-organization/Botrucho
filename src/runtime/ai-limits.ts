import type { AiLimits } from '@/types';

export interface UsageStore {
  findOneAndUpdate(filter: object, update: object, options: object): PromiseLike<unknown>;
  updateOne(filter: object, update: object): PromiseLike<unknown>;
  findOne(filter: object): PromiseLike<{ count?: number; tokens?: number } | null>;
}

export type AiRefusal = 'cooldown' | 'busy' | 'user' | 'guild' | 'global';

export interface AiPermit {
  ok: true;
  release(result: { tokens: number; refund: boolean }): Promise<void>;
}

export type AiCheck = AiPermit | { ok: false; reason: AiRefusal; retryAfterSec?: number };

const DAY_MS = 86_400_000;
const dayKey = (now: number): string => new Date(now).toISOString().slice(0, 10);

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

export class AiUsageLimiter {
  private readonly lastRequest = new Map<string, number>();
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly store: UsageStore,
    private readonly now: () => number = Date.now,
  ) {}

  async acquire(userId: string, guildId: string, limits: AiLimits): Promise<AiCheck> {
    const now = this.now();
    if (this.inFlight.has(userId)) return { ok: false, reason: 'busy' };
    const cooldownMs = limits.userCooldownSec * 1000;
    const elapsed = now - (this.lastRequest.get(userId) ?? -Infinity);
    if (elapsed < cooldownMs)
      return {
        ok: false,
        reason: 'cooldown',
        retryAfterSec: Math.ceil((cooldownMs - elapsed) / 1000),
      };

    this.prune(now, cooldownMs);
    this.lastRequest.set(userId, now);
    this.inFlight.add(userId);
    try {
      const day = dayKey(now);
      const globalKey = `global:${day}`;
      const global = await this.store.findOne({ _id: globalKey });
      if ((global?.tokens ?? 0) >= limits.globalDailyTokens) {
        this.inFlight.delete(userId);
        return { ok: false, reason: 'global' };
      }

      const expiresAt = new Date(now + 2 * DAY_MS);
      const scopes: [AiRefusal, string, number][] = [
        ['user', `user:${userId}:${day}`, limits.userDaily],
        ['guild', `guild:${guildId}:${day}`, limits.guildDaily],
        ['global', globalKey, limits.globalDaily],
      ];
      const taken: string[] = [];
      for (const [reason, key, cap] of scopes) {
        if (!(await this.consume(key, cap, expiresAt))) {
          await this.refund(taken);
          this.inFlight.delete(userId);
          return { ok: false, reason };
        }
        taken.push(key);
      }

      return {
        ok: true,
        release: async ({ tokens, refund }) => {
          this.inFlight.delete(userId);
          if (tokens > 0) await this.store.updateOne({ _id: globalKey }, { $inc: { tokens } });
          if (refund) await this.refund(taken);
        },
      };
    } catch (error) {
      this.inFlight.delete(userId);
      throw error;
    }
  }

  async usage(
    guildId: string,
  ): Promise<{ requests: number; tokens: number; guildRequests: number }> {
    const day = dayKey(this.now());
    const [global, guild] = await Promise.all([
      this.store.findOne({ _id: `global:${day}` }),
      this.store.findOne({ _id: `guild:${guildId}:${day}` }),
    ]);
    return {
      requests: global?.count ?? 0,
      tokens: global?.tokens ?? 0,
      guildRequests: guild?.count ?? 0,
    };
  }

  // Atomic check-and-increment: a full counter fails the filter, and the upsert then
  // collides on _id, so concurrent shards can never push a counter past its cap.
  private async consume(key: string, cap: number, expiresAt: Date): Promise<boolean> {
    if (cap <= 0) return false;
    try {
      return !!(await this.store.findOneAndUpdate(
        { _id: key, count: { $lt: cap } },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, returnDocument: 'after' },
      ));
    } catch (error) {
      if (isDuplicateKey(error)) return false;
      throw error;
    }
  }

  private async refund(keys: string[]): Promise<void> {
    for (const key of keys) await this.store.updateOne({ _id: key }, { $inc: { count: -1 } });
  }

  private prune(now: number, cooldownMs: number): void {
    if (this.lastRequest.size < 1000) return;
    for (const [userId, at] of this.lastRequest)
      if (now - at >= cooldownMs) this.lastRequest.delete(userId);
  }
}
