require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const MiB = 1024 * 1024;

function fakeProbes() {
  const histograms = [];
  const state = {
    now: 1000,
    cpu: { user: 0, system: 0 },
    elu: { idle: 0, active: 0 },
    memory: { rss: 300 * MiB, heapUsed: 50 * MiB },
  };
  const probes = {
    now: () => state.now,
    cpuUsage: () => ({ ...state.cpu }),
    memoryUsage: () => ({ ...state.memory }),
    eventLoopUtilization: () => ({ ...state.elu }),
    createDelayHistogram: () => {
      const histogram = {
        enabled: false,
        resets: 0,
        disables: 0,
        max: 120e6,
        enable() {
          histogram.enabled = true;
        },
        disable() {
          histogram.enabled = false;
          histogram.disables++;
        },
        reset() {
          histogram.resets++;
        },
        percentile: (p) => ({ 50: 2e6, 99: 40e6 })[p],
      };
      histograms.push(histogram);
      return histogram;
    },
  };
  return { probes, state, histograms };
}

// Pass probes = null to exercise the built-in Node probes.
function fixture(enabled = true, report, probes = fakeProbes().probes) {
  const { installVoiceDiagnostics } = require('@/runtime/voice-diagnostics');
  const events = new EventEmitter();
  const voice = new EventEmitter();
  voice.state = {
    status: 'ready',
    networking: {
      state: {
        code: 4,
        connectionOptions: { token: 'SECRET_TOKEN', sessionId: 'SECRET_SESSION' },
        connectionData: { packetsPlayed: 0, speaking: false, secretKey: 'SECRET_KEY' },
        dave: { protocolVersion: 1, session: { ready: true }, voicePrivacyCode: 'SECRET_CODE' },
      },
    },
  };
  const audio = new EventEmitter();
  audio.state = { status: 'idle' };
  const queue = {
    guild: {
      id: 'guild-1',
      members: { me: { voice: { serverMute: false, selfMute: false, suppress: false } } },
    },
    channel: { id: 'channel-1' },
    connection: voice,
    node: { volume: 60 },
    dispatcher: Object.assign(new EventEmitter(), {
      audioPlayer: audio,
      audioResource: { playbackDuration: 0, metadata: { title: 'PRIVATE_PHRASE' } },
    }),
  };
  const records = [];
  const stop = installVoiceDiagnostics(
    { events },
    report ?? ((record) => records.push(record)),
    enabled,
    probes ?? undefined,
  );
  return { events, voice, audio, queue, records, stop };
}

function play(audio, extra = {}) {
  const previous = audio.state;
  audio.state = { status: 'playing', ...extra };
  audio.emit('stateChange', previous, audio.state);
}

test('profiling probes are never touched while diagnostics are disabled', () => {
  const { installVoiceDiagnostics } = require('@/runtime/voice-diagnostics');
  const fail = () => assert.fail('probe must not run');
  const events = new EventEmitter();
  const stop = installVoiceDiagnostics({ events }, fail, false, {
    now: fail,
    cpuUsage: fail,
    memoryUsage: fail,
    eventLoopUtilization: fail,
    createDelayHistogram: fail,
  });
  assert.deepEqual(events.eventNames(), []);
  stop();
});

test('no event-loop histogram is created until audio is playing', () => {
  const { probes, histograms } = fakeProbes();
  const { events, queue, stop } = fixture(true, undefined, probes);
  events.emit('connection', queue);
  assert.equal(histograms.length, 0);
  stop();
});

test('progress samples report monotonic interval, process-wide CPU, event-loop delay and memory', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { probes, state, histograms } = fakeProbes();
  const { events, queue, audio, records, stop } = fixture(true, undefined, probes);
  events.emit('connection', queue);
  play(audio);
  assert.equal(histograms.length, 1);
  assert.equal(histograms[0].enabled, true);
  state.now = 3000;
  state.cpu = { user: 600_000, system: 200_000 };
  state.elu = { idle: 500, active: 1500 };
  state.memory = { rss: 310.4 * MiB, heapUsed: 61.6 * MiB };
  t.mock.timers.tick(1000);
  const progress = records.find((record) => record.event === 'progress');
  assert.equal(progress.sampleIntervalMs, 2000);
  assert.equal(progress.processCpuUserMs, 600);
  assert.equal(progress.processCpuSystemMs, 200);
  assert.equal(progress.processCpuPct, 40);
  assert.equal(progress.eventLoopUtilization, 0.75);
  assert.equal(progress.eventLoopDelayP50Ms, 2);
  assert.equal(progress.eventLoopDelayP99Ms, 40);
  assert.equal(progress.eventLoopDelayMaxMs, 120);
  assert.equal(progress.rssMiB, 310);
  assert.equal(progress.heapUsedMiB, 62);
  assert.equal(histograms[0].resets, 1);
  // The next sample is a delta from the previous one, not from playback start.
  state.now = 4000;
  state.cpu = { user: 700_000, system: 200_000 };
  t.mock.timers.tick(1000);
  const next = records.filter((record) => record.event === 'progress')[1];
  assert.equal(next.sampleIntervalMs, 1000);
  assert.equal(next.processCpuUserMs, 100);
  assert.equal(next.processCpuPct, 10);
  stop();
});

test('progress samples report audio buffering, frame underruns and DSP stages without changing them', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { events, queue, audio, records, stop } = fixture();
  const forbidden = () => assert.fail('profiling must not change DSP stages');
  const stage = (disabled) => ({
    disabled,
    disable: forbidden,
    enable: forbidden,
    toggle: forbidden,
  });
  queue.dispatcher.dsp = {
    equalizer: stage(false),
    volume: stage(false),
    compressor: stage(true),
    reverb: null,
    filters: stage(false),
    biquad: null,
    resampler: null,
    seeker: null,
  };
  queue.dispatcher.audioResource.playbackDuration = 1000;
  queue.dispatcher.audioResource.playStream = { readableLength: 3, readableObjectMode: true };
  events.emit('connection', queue);
  play(audio, { missedFrames: 2, playbackDuration: 1400 });
  t.mock.timers.tick(1000);
  const progress = records.find((record) => record.event === 'progress');
  assert.equal(progress.playStreamBuffered, 3);
  assert.equal(progress.playStreamUnits, 'packets');
  assert.equal(progress.missedFrames, 2);
  assert.equal(progress.injectedSilenceMs, 400);
  assert.equal(progress.dspEqualizer, 'active');
  assert.equal(progress.dspVolume, 'active');
  assert.equal(progress.dspCompressor, 'disabled');
  assert.equal(progress.dspReverb, 'absent');
  assert.equal(progress.dspFilters, 'active');
  assert.equal(progress.dspBiquad, 'absent');
  assert.equal(progress.dspResampler, 'absent');
  assert.equal(progress.dspSeeker, 'absent');
  assert.doesNotMatch(JSON.stringify(records), /SECRET|PRIVATE/);
  stop();
});

test('default probes use built-in Node APIs and produce numeric samples', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { events, queue, audio, records, stop } = fixture(true, undefined, null);
  events.emit('connection', queue);
  play(audio);
  t.mock.timers.tick(1000);
  const progress = records.find((record) => record.event === 'progress');
  assert.equal(progress.profileError, undefined);
  for (const field of ['sampleIntervalMs', 'processCpuPct', 'eventLoopDelayMaxMs', 'rssMiB']) {
    assert.equal(typeof progress[field], 'number', field);
  }
  stop();
});

test('failing profiling probes or stream getters cannot interrupt progress sampling', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { probes } = fakeProbes();
  const { events, queue, audio, records, stop } = fixture(true, undefined, {
    ...probes,
    cpuUsage: () => {
      throw new Error('SECRET_TOKEN');
    },
  });
  queue.dispatcher.audioResource.playStream = {
    get readableLength() {
      throw new Error('SECRET_TOKEN');
    },
  };
  events.emit('connection', queue);
  assert.doesNotThrow(() => play(audio));
  assert.doesNotThrow(() => t.mock.timers.tick(1000));
  const progress = records.find((record) => record.event === 'progress');
  assert.ok(progress);
  assert.equal(progress.profileError, true);
  assert.equal(progress.audioProfileError, true);
  assert.equal(progress.playbackMs, 0);
  assert.doesNotMatch(JSON.stringify(records), /SECRET/);
  stop();
});

test('a failing histogram factory cannot interrupt playback state handling', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { probes } = fakeProbes();
  const { events, queue, audio, records, stop } = fixture(true, undefined, {
    ...probes,
    createDelayHistogram: () => {
      throw new Error('histogram unavailable');
    },
  });
  events.emit('connection', queue);
  assert.doesNotThrow(() => play(audio));
  assert.doesNotThrow(() => t.mock.timers.tick(1000));
  assert.equal(records.find((record) => record.event === 'progress').profileError, true);
  stop();
});

test('event-loop histograms are disabled on pause, destruction and stop', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { probes, histograms } = fakeProbes();
  const { events, queue, audio, voice, stop } = fixture(true, undefined, probes);
  events.emit('connection', queue);
  play(audio);
  const previous = audio.state;
  audio.state = { status: 'paused' };
  audio.emit('stateChange', previous, audio.state);
  assert.equal(histograms[0].disables, 1);

  play(audio);
  voice.state = { status: 'destroyed' };
  voice.emit('stateChange', { status: 'ready' }, voice.state);
  assert.equal(histograms[1].disables, 1);

  voice.state = { status: 'ready' };
  queue.dispatcher = Object.assign(new EventEmitter(), {
    audioPlayer: audio,
    audioResource: { playbackDuration: 0 },
  });
  events.emit('connection', queue);
  play(audio);
  queue.dispatcher.emit('destroyed');
  assert.equal(histograms[2].disables, 1);

  queue.dispatcher = Object.assign(new EventEmitter(), {
    audioPlayer: audio,
    audioResource: { playbackDuration: 0 },
  });
  events.emit('connection', queue);
  play(audio);
  stop();
  stop();
  assert.equal(histograms[3].disables, 1);
  assert.ok(histograms.every((histogram) => histogram.disables === 1 && !histogram.enabled));
});

test('diagnostics are off by default and do not install listeners', () => {
  const { installVoiceDiagnostics } = require('@/runtime/voice-diagnostics');
  const events = new EventEmitter();
  const stop = installVoiceDiagnostics({ events }, () => assert.fail('must not log'));
  assert.deepEqual(events.eventNames(), []);
  stop();
});

test('connection snapshots expose useful voice state without serializing secrets or track content', () => {
  const { events, queue, records, stop } = fixture();
  events.emit('connection', queue);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], {
    event: 'connection',
    guildId: 'guild-1',
    channelId: 'channel-1',
    voiceStatus: 'ready',
    audioStatus: 'idle',
    serverMute: false,
    selfMute: false,
    suppressed: false,
    queueVolume: 60,
    playbackMs: 0,
    packetsPlayed: 0,
    speaking: false,
    daveProtocol: 1,
    daveReady: true,
  });
  assert.doesNotMatch(JSON.stringify(records), /SECRET|PRIVATE/);
  stop();
});

test('samples packet and playback progress only while playing and clears timers on stop', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { events, queue, audio, voice, records, stop } = fixture();
  events.emit('connection', queue);
  const previous = audio.state;
  audio.state = { status: 'playing' };
  audio.emit('stateChange', previous, audio.state);
  queue.dispatcher.audioResource.playbackDuration = 1000;
  voice.state.networking.state.connectionData.packetsPlayed = 50;
  t.mock.timers.tick(1000);
  const progress = records.find((record) => record.event === 'progress');
  assert.equal(progress.playbackMs, 1000);
  assert.equal(progress.packetsPlayed, 50);
  audio.state = { status: 'idle' };
  audio.emit('stateChange', { status: 'playing' }, audio.state);
  const count = records.length;
  t.mock.timers.tick(2000);
  assert.equal(records.length, count);
  stop();
});

test('logs connection transitions and disconnect codes without logging networking payloads', () => {
  const { events, queue, voice, records, stop } = fixture();
  events.emit('connection', queue);
  const previous = voice.state;
  voice.state = { status: 'disconnected', reason: 0, closeCode: 4014, token: 'SECRET_TOKEN' };
  voice.emit('stateChange', previous, voice.state);
  const record = records.at(-1);
  assert.equal(record.event, 'voiceState');
  assert.equal(record.previousStatus, 'ready');
  assert.equal(record.voiceStatus, 'disconnected');
  assert.equal(record.disconnectReason, 0);
  assert.equal(record.closeCode, 4014);
  assert.doesNotMatch(JSON.stringify(records), /SECRET/);
  stop();
});

test('records player lifecycle without intercepting required player error events', () => {
  const { events, queue, records, stop } = fixture();
  const track = { title: 'PRIVATE_PHRASE', url: 'https://example.com/?token=SECRET' };
  assert.equal(events.listenerCount('error'), 0);
  assert.equal(events.listenerCount('playerError'), 0);
  events.emit('playerStart', queue, track);
  events.emit('playerFinish', queue, track);
  events.emit('playerSkip', queue, track, 'ERR_NO_STREAM', 'SECRET_TOKEN');
  assert.deepEqual(
    records.map((record) => record.event),
    ['playerStart', 'playerFinish', 'playerSkip'],
  );
  assert.equal(records[2].skipReason, 'ERR_NO_STREAM');
  assert.doesNotMatch(JSON.stringify(records), /SECRET|PRIVATE|https:/);
  stop();
});

test('observes dispatcher errors without logging error messages or stacks', () => {
  const { events, queue, records, stop } = fixture();
  events.emit('connection', queue);
  const error = Object.assign(new Error('SECRET_TOKEN'), { code: 'ERR_NO_STREAM' });
  queue.dispatcher.emit('error', error);
  assert.equal(records.at(-1).event, 'error');
  assert.equal(records.at(-1).errorName, 'Error');
  assert.equal(records.at(-1).errorCode, 'ERR_NO_STREAM');
  assert.doesNotMatch(JSON.stringify(records), /SECRET|PRIVATE/);
  stop();
});

test('a failing diagnostic logger cannot throw into events or progress timers', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { events, queue, audio, stop } = fixture(true, () => {
    throw new Error('logger failed');
  });
  assert.doesNotThrow(() => events.emit('connection', queue));
  assert.doesNotThrow(() => events.emit('playerStart', queue));
  audio.state = { status: 'playing' };
  assert.doesNotThrow(() => audio.emit('stateChange', { status: 'idle' }, audio.state));
  assert.doesNotThrow(() => t.mock.timers.tick(1000));
  stop();
});

test('a failing snapshot getter cannot throw into events or progress timers', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { events, queue, audio, stop } = fixture();
  events.emit('connection', queue);
  Object.defineProperty(queue, 'channel', {
    get() {
      throw new Error('channel unavailable');
    },
  });
  assert.doesNotThrow(() => events.emit('playerFinish', queue));
  audio.state = { status: 'playing' };
  assert.doesNotThrow(() => audio.emit('stateChange', { status: 'idle' }, audio.state));
  assert.doesNotThrow(() => t.mock.timers.tick(1000));
  stop();
});

test('does not duplicate connection listeners and removes listeners and timers on destruction', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { events, queue, voice, audio, records, stop } = fixture();
  events.emit('connection', queue);
  events.emit('connection', queue);
  assert.equal(voice.listenerCount('stateChange'), 1);
  assert.equal(audio.listenerCount('stateChange'), 1);
  audio.state = { status: 'playing' };
  audio.emit('stateChange', { status: 'idle' }, audio.state);
  voice.state = { status: 'destroyed' };
  voice.emit('stateChange', { status: 'ready' }, voice.state);
  assert.equal(voice.listenerCount('stateChange'), 0);
  assert.equal(audio.listenerCount('stateChange'), 0);
  const count = records.length;
  t.mock.timers.tick(2000);
  assert.equal(records.length, count);
  stop();
  assert.deepEqual(events.eventNames(), []);
});

test('stopping diagnostics during playback detaches listeners and cancels progress sampling', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { events, queue, voice, audio, records, stop } = fixture();
  events.emit('connection', queue);
  audio.state = { status: 'playing' };
  audio.emit('stateChange', { status: 'idle' }, audio.state);
  stop();
  stop();
  const count = records.length;
  t.mock.timers.tick(2000);
  assert.equal(records.length, count);
  assert.equal(voice.listenerCount('stateChange'), 0);
  assert.equal(audio.listenerCount('stateChange'), 0);
  assert.deepEqual(events.eventNames(), []);
});

test('dispatcher destruction cleans up even when the voice connection was already destroyed', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { events, queue, voice, audio, records, stop } = fixture();
  events.emit('connection', queue);
  audio.state = { status: 'playing' };
  audio.emit('stateChange', { status: 'idle' }, audio.state);
  voice.state = { status: 'destroyed' };
  queue.dispatcher.emit('destroyed');
  assert.equal(voice.listenerCount('stateChange'), 0);
  assert.equal(audio.listenerCount('stateChange'), 0);
  const count = records.length;
  t.mock.timers.tick(1000);
  assert.equal(records.length, count);
  stop();
});
