require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { FiltersChain } = require('@discord-player/equalizer');

// Mirrors StreamDispatcher.createStream for a queue with no filter values set:
// biquad/resampler/compressor/reverb presets are omitted, losing their disable flags.
function createStreamPresets(options) {
  return {
    dsp: { filters: undefined, disabled: options.disableFilterer },
    biquad: undefined,
    resampler: undefined,
    equalizer: { bandMultiplier: undefined, disabled: options.disableEqualizer },
    volume: { volume: 50, disabled: options.disableVolume },
    compressor: undefined,
    reverb: undefined,
    seeker: { disabled: options.disableSeeker, sampleRate: 48e3, channels: 2, totalDuration: 0 },
  };
}

const ALL_EFFECTS_DISABLED = {
  disableBiquad: true,
  disableEqualizer: true,
  disableFilterer: false,
  disableResampler: true,
  disableVolume: false,
  disableCompressor: true,
  disableReverb: true,
  disableSeeker: true,
};

function stages(dsp) {
  const names = ['equalizer', 'volume', 'compressor', 'reverb', 'filters', 'biquad', 'resampler'];
  return Object.fromEntries(names.map((name) => [name, dsp[name] ? 'active' : 'absent']));
}

function fixture(options = ALL_EFFECTS_DISABLED, dsp = new FiltersChain()) {
  const { installDisabledStageGuard } = require('@/runtime/dsp-stages');
  const events = new EventEmitter();
  const dispatcher = Object.assign(new EventEmitter(), { dsp });
  const queue = { options, dispatcher };
  const stop = installDisabledStageGuard({ events });
  return { events, queue, dispatcher, dsp, stop };
}

test('installed discord-player builds stages whose disable flags it omitted', (t) => {
  const dsp = new FiltersChain();
  t.after(() => dsp.destroy());
  dsp.create(new PassThrough(), createStreamPresets(ALL_EFFECTS_DISABLED));
  // Documents the library behavior the guard compensates for. If this starts
  // failing after an upgrade, the guard may no longer be needed.
  assert.equal(stages(dsp).biquad, 'active');
  assert.equal(stages(dsp).compressor, 'active');
  assert.equal(stages(dsp).reverb, 'active');
});

test('disabled effects are not built while volume remains active', (t) => {
  const { events, queue, dsp, stop } = fixture();
  t.after(() => {
    stop();
    dsp.destroy();
  });
  events.emit('connection', queue);
  dsp.create(new PassThrough(), createStreamPresets(ALL_EFFECTS_DISABLED));
  assert.deepEqual(stages(dsp), {
    equalizer: 'absent',
    volume: 'active',
    compressor: 'absent',
    reverb: 'absent',
    filters: 'active',
    biquad: 'absent',
    resampler: 'absent',
  });
});

test('effects whose disable flag is false are still built', (t) => {
  const options = { ...ALL_EFFECTS_DISABLED, disableCompressor: false, disableResampler: false };
  const { events, queue, dsp, stop } = fixture(options);
  t.after(() => {
    stop();
    dsp.destroy();
  });
  events.emit('connection', queue);
  dsp.create(new PassThrough(), createStreamPresets(options));
  assert.equal(stages(dsp).compressor, 'active');
  assert.equal(stages(dsp).resampler, 'active');
  assert.equal(stages(dsp).reverb, 'absent');
});

test('explicit presets from configured filters are passed through unchanged', () => {
  const { withDisabledStages } = require('@/runtime/dsp-stages');
  const compressor = { threshold: -20, disabled: false };
  const presets = { compressor, biquad: undefined };
  const result = withDisabledStages(presets, ALL_EFFECTS_DISABLED);
  assert.equal(result.compressor, compressor);
  assert.deepEqual(result.biquad, { disabled: true });
  assert.equal(presets.biquad, undefined, 'input presets must not be mutated');
});

test('presets are returned as-is when nothing needs disabling', () => {
  const { withDisabledStages } = require('@/runtime/dsp-stages');
  const presets = { biquad: undefined };
  assert.equal(withDisabledStages(presets, { disableBiquad: false }), presets);
  assert.equal(withDisabledStages(undefined, ALL_EFFECTS_DISABLED), undefined);
});

test('wraps each filter chain once and restores it on stop', () => {
  const create = () => 'stream';
  const dsp = { create };
  const { events, queue, stop } = fixture(ALL_EFFECTS_DISABLED, dsp);
  events.emit('connection', queue);
  const wrapped = dsp.create;
  assert.notEqual(wrapped, create);
  events.emit('connection', queue);
  assert.equal(dsp.create, wrapped);
  stop();
  assert.equal(dsp.create, create);
  assert.deepEqual(events.eventNames(), []);
});

test('a destroyed dispatcher releases its filter chain', () => {
  const create = () => 'stream';
  const dsp = { create };
  const { events, queue, dispatcher, stop } = fixture(ALL_EFFECTS_DISABLED, dsp);
  events.emit('connection', queue);
  dispatcher.emit('destroyed');
  stop();
  assert.notEqual(dsp.create, create, 'a destroyed chain is not touched again');
});

test('guard failures never interrupt connection or stream creation', () => {
  const received = [];
  const dsp = { create: (_src, presets) => received.push(presets) };
  const { events, stop } = fixture(ALL_EFFECTS_DISABLED, dsp);
  const brokenQueue = {
    get dispatcher() {
      throw new Error('queue torn down');
    },
  };
  assert.doesNotThrow(() => events.emit('connection', brokenQueue));

  const queue = {
    get options() {
      throw new Error('options unavailable');
    },
    dispatcher: Object.assign(new EventEmitter(), { dsp }),
  };
  events.emit('connection', queue);
  const presets = { biquad: undefined };
  assert.doesNotThrow(() => dsp.create(new PassThrough(), presets));
  assert.equal(received[0], presets, 'falls back to the original presets');
  stop();
});
