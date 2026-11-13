import type { GuildQueue, Player } from 'discord-player';

type Presets = Record<string, unknown>;
type QueueOptions = Partial<Record<(typeof STAGE_FLAGS)[keyof typeof STAGE_FLAGS], boolean>>;
interface FilterChain {
  create(src: unknown, presets?: Presets): unknown;
}

// StreamDispatcher.createStream (discord-player 7.2.0) passes these presets only
// when a filter value is configured, dropping their disable flags otherwise, and
// FiltersChain.create then builds every stage it was not told is disabled.
const STAGE_FLAGS = {
  biquad: 'disableBiquad',
  resampler: 'disableResampler',
  compressor: 'disableCompressor',
  reverb: 'disableReverb',
  seeker: 'disableSeeker',
} as const;

export function withDisabledStages(
  presets: Presets | undefined,
  options: QueueOptions | undefined,
): Presets | undefined {
  if (!presets) return presets;
  let result = presets;
  for (const [stage, flag] of Object.entries(STAGE_FLAGS)) {
    if (presets[stage] === undefined && options?.[flag] === true) {
      if (result === presets) result = { ...presets };
      result[stage] = { disabled: true };
    }
  }
  return result;
}

// Restores the queue's disable* options for stages the library omitted. Stages
// are never removed or toggled: enabling an option builds the stage as before.
export function installDisabledStageGuard(player: Player): () => void {
  const originals = new Map<FilterChain, FilterChain['create']>();
  const onConnection = (queue: GuildQueue) => {
    try {
      const dispatcher = queue.dispatcher;
      const dsp = dispatcher?.dsp as unknown as FilterChain | undefined;
      if (!dispatcher || !dsp || originals.has(dsp) || typeof dsp.create !== 'function') return;
      const create = dsp.create;
      dsp.create = function (this: FilterChain, src, presets) {
        let guarded = presets;
        try {
          guarded = withDisabledStages(presets, queue.options as QueueOptions);
        } catch {
          // Fall back to the library's own behavior.
        }
        return create.call(this, src, guarded);
      };
      originals.set(dsp, create);
      dispatcher.once('destroyed', () => originals.delete(dsp));
    } catch {
      // A failed guard only costs CPU; it must never block a connection.
    }
  };
  player.events.on('connection', onConnection);

  return () => {
    player.events.off('connection', onConnection);
    for (const [dsp, create] of originals) dsp.create = create;
    originals.clear();
  };
}
