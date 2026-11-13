import { ActivitiesOptions, ActivityType, PresenceStatusData } from 'discord.js';

import type { ActivityPresence } from '@/types';

export type PresenceLine = ActivityPresence & { durationMs?: number };
export type PresenceSource = () => Promise<PresenceLine | null> | PresenceLine | null;

const shuffle = <T>(items: T[], random: () => number): T[] => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

export class PresenceRotation {
  private bag: PresenceSource[] = [];
  private last?: PresenceSource;

  constructor(
    private readonly sources: PresenceSource[],
    private readonly random: () => number = Math.random,
  ) {}

  async next(): Promise<PresenceLine | null> {
    const attempts = this.bag.length + this.sources.length;
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (!this.bag.length) this.refill();
      const source = this.bag.pop() as PresenceSource;
      try {
        const line = await source();
        if (line) {
          this.last = source;
          return line;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  private refill(): void {
    this.bag = shuffle([...this.sources], this.random);
    const top = this.bag.length - 1;
    if (top > 0 && this.bag[top] === this.last)
      [this.bag[0], this.bag[top]] = [this.bag[top], this.bag[0]];
  }
}

export const bogotaHour = (date: Date): number =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(date),
  );

export const statusFor = (date: Date): PresenceStatusData =>
  bogotaHour(date) < 7 ? 'idle' : 'online';

export const toActivity = ({ type, content }: ActivityPresence): ActivitiesOptions =>
  type === ActivityType.Custom
    ? { name: 'Custom Status', state: content, type }
    : { name: content, type };
