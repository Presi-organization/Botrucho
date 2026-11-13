require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const ALL_DISABLED = {
  disableEqualizer: true,
  disableResampler: true,
  disableBiquad: true,
  disableCompressor: true,
  disableReverb: true,
};

test('music effects default to disabled when a guild has no stored settings', () => {
  const { audioEffectOptions } = require('@/runtime/audio-effects');
  assert.deepEqual(audioEffectOptions(undefined), ALL_DISABLED);
  assert.deepEqual(audioEffectOptions(null), ALL_DISABLED);
  assert.deepEqual(audioEffectOptions({}), ALL_DISABLED);
});

test('stored effect toggles enable only the matching stages', () => {
  const { audioEffectOptions } = require('@/runtime/audio-effects');
  assert.deepEqual(audioEffectOptions({ equalizer: true, reverb: true }), {
    ...ALL_DISABLED,
    disableEqualizer: false,
    disableReverb: false,
  });
});

test('only an explicit true enables an effect', () => {
  const { audioEffectOptions } = require('@/runtime/audio-effects');
  assert.deepEqual(audioEffectOptions({ equalizer: 'yes', compressor: 1 }), ALL_DISABLED);
});

test('effect options never bypass volume, which /volume relies on', () => {
  const { audioEffectOptions } = require('@/runtime/audio-effects');
  assert.equal('disableVolume' in audioEffectOptions({}), false);
  // disableFilterer skips the entire DSP chain in createStream, volume included.
  assert.equal('disableFilterer' in audioEffectOptions({}), false);
});

test('guild data stores effect toggles that default to off', () => {
  const { GuildDataModel } = require('@/mongodb/models/GuildData');
  const guild = new GuildDataModel({ serverID: 'guild-1' });
  assert.deepEqual(guild.toObject().audioEffects, {
    equalizer: false,
    resampler: false,
    biquad: false,
    compressor: false,
    reverb: false,
  });
});
