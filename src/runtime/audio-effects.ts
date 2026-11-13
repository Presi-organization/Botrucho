import type { AudioEffectSettings } from '@/types';

// Maps per-guild effect toggles to discord-player queue options. Effects are
// opt-in because each enabled stage costs CPU on every PCM chunk. disableFilterer
// is deliberately absent: it bypasses the whole chain, including /volume, and the
// filter stage is already a passthrough while no filters are set.
export function audioEffectOptions(settings?: Partial<AudioEffectSettings> | null) {
  return {
    disableEqualizer: settings?.equalizer !== true,
    disableResampler: settings?.resampler !== true,
    disableBiquad: settings?.biquad !== true,
    disableCompressor: settings?.compressor !== true,
    disableReverb: settings?.reverb !== true,
  };
}
