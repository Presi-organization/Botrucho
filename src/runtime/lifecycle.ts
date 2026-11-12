export function createShutdown(options: {
  steps: (() => unknown | PromiseLike<unknown>)[];
  timeoutMs: number;
  report: (error: unknown) => void;
  exit: (code: number) => void;
}): (code: number) => Promise<void> {
  let pending: Promise<void> | undefined;
  let exitCode = 0;
  return (code: number): Promise<void> => {
    if (code !== 0) exitCode = code;
    if (pending) return pending;
    pending = Promise.resolve().then(async () => {
      let expired = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          expired = true;
          exitCode = 1;
          resolve();
        }, options.timeoutMs);
      });
      const cleanup = async () => {
        for (const step of options.steps) {
          if (expired) break;
          try {
            await step();
          } catch (error) {
            exitCode = 1;
            options.report(error);
          }
        }
      };
      await Promise.race([cleanup(), deadline]);
      clearTimeout(timer);
      options.exit(exitCode);
    });
    return pending;
  };
}

export function startPeriodic(
  work: () => Promise<void>,
  intervalMs: number,
  onError: (error: unknown) => void,
): {
  stop: () => Promise<void>;
} {
  let stopped = false;
  let pending = Promise.resolve();
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    timer = setTimeout(() => {
      pending = Promise.resolve()
        .then(work)
        .catch((error) => {
          stopped = true;
          onError(error);
        })
        .then(() => {
          if (!stopped) schedule();
        });
    }, intervalMs);
  };
  schedule();
  return {
    stop: async () => {
      stopped = true;
      clearTimeout(timer);
      await pending;
    },
  };
}

export async function withTimeout<T>(
  pending: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pending,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
