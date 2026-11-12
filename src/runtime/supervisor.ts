import type { ChildProcess } from 'node:child_process';

import type { Shard } from 'discord.js';

export function watchShard(
  shard: Pick<Shard, 'id' | 'on'>,
  ready: Set<number>,
  fail: (code: number) => void,
  report: (error: unknown) => void,
): void {
  let initialized = false;
  let stopping = false;
  shard.on('message', (message) => {
    if (message === 'botrucho:ready' && !stopping) {
      initialized = true;
      ready.add(shard.id);
    }
    if (message === 'botrucho:stopping') {
      stopping = true;
      initialized = false;
      ready.delete(shard.id);
    }
  });
  shard.on('disconnect', () => ready.delete(shard.id));
  shard.on('resume', () => {
    if (initialized) ready.add(shard.id);
  });
  shard.on('ready', () => {
    if (initialized) ready.add(shard.id);
  });
  shard.on('death', () => {
    ready.delete(shard.id);
    fail(1);
  });
  shard.on('error', (error) => {
    report(error);
    fail(1);
  });
}

export async function stopChild(
  child: ChildProcess | null,
  timeoutMs = 10_000,
  initialized = true,
): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    if (child.connected && initialized) {
      try {
        child.send('botrucho:shutdown', (error) => {
          if (error) child.kill('SIGTERM');
        });
      } catch {
        child.kill('SIGTERM');
      }
    } else child.kill('SIGTERM');
  });
}
