require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

function fixture(enabled = true, report) {
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
  );
  return { events, voice, audio, queue, records, stop };
}

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
