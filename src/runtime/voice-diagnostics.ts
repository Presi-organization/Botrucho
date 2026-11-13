import { monitorEventLoopDelay, performance } from 'node:perf_hooks';

import type { GuildQueue, Player, StreamDispatcher } from 'discord-player';
import type { AudioPlayerState, VoiceConnectionState } from 'discord-voip';

type DiagnosticRecord = Record<string, string | number | boolean | undefined>;

interface DelayHistogram {
  enable(): unknown;
  disable(): unknown;
  reset(): void;
  percentile(percentile: number): number;
  readonly max: number;
}

export interface ProfileProbes {
  now(): number;
  cpuUsage(): { user: number; system: number };
  memoryUsage(): { rss: number; heapUsed: number };
  eventLoopUtilization(): { idle: number; active: number };
  createDelayHistogram(): DelayHistogram;
}

const nodeProbes: ProfileProbes = {
  now: () => performance.now(),
  cpuUsage: () => process.cpuUsage(),
  memoryUsage: () => process.memoryUsage(),
  eventLoopUtilization: () => performance.eventLoopUtilization(),
  createDelayHistogram: () => monitorEventLoopDelay({ resolution: 10 }),
};

const MiB = 1024 * 1024;
const round = (value: number, digits = 1) => Number(value.toFixed(digits));

// Read-only view of FiltersChain stages; the profiler never toggles them.
const DSP_STAGES = {
  dspEqualizer: 'equalizer',
  dspVolume: 'volume',
  dspCompressor: 'compressor',
  dspReverb: 'reverb',
  dspFilters: 'filters',
  dspBiquad: 'biquad',
  dspResampler: 'resampler',
  dspSeeker: 'seeker',
} as const;
type DspStages = Partial<
  Record<(typeof DSP_STAGES)[keyof typeof DSP_STAGES], { disabled?: boolean } | null>
>;

interface ProfileSampler {
  sample(): DiagnosticRecord;
  stop(): void;
}

// CPU and event-loop figures are process-wide: they include every guild, the
// gateway, cron jobs and the DSP/Opus pipeline, not only this voice connection.
function createProfileSampler(probes: ProfileProbes): ProfileSampler {
  let histogram: DelayHistogram | undefined;
  let previous: ReturnType<typeof read> | undefined;
  function read() {
    return { at: probes.now(), cpu: probes.cpuUsage(), elu: probes.eventLoopUtilization() };
  }
  try {
    histogram = probes.createDelayHistogram();
    histogram.enable();
    previous = read();
  } catch {
    // Samples report profileError; stop() still disables a partially started histogram.
  }
  return {
    sample() {
      try {
        if (!histogram || !previous) return { profileError: true };
        const current = read();
        const intervalMs = current.at - previous.at;
        const userMs = (current.cpu.user - previous.cpu.user) / 1000;
        const systemMs = (current.cpu.system - previous.cpu.system) / 1000;
        const active = current.elu.active - previous.elu.active;
        const idle = current.elu.idle - previous.elu.idle;
        const memory = probes.memoryUsage();
        const record: DiagnosticRecord = {
          sampleIntervalMs: round(intervalMs),
          processCpuUserMs: round(userMs),
          processCpuSystemMs: round(systemMs),
          processCpuPct:
            intervalMs > 0 ? round(((userMs + systemMs) / intervalMs) * 100) : undefined,
          eventLoopUtilization: active + idle > 0 ? round(active / (active + idle), 2) : undefined,
          eventLoopDelayP50Ms: round(histogram.percentile(50) / 1e6),
          eventLoopDelayP99Ms: round(histogram.percentile(99) / 1e6),
          eventLoopDelayMaxMs: round(histogram.max / 1e6),
          rssMiB: Math.round(memory.rss / MiB),
          heapUsedMiB: Math.round(memory.heapUsed / MiB),
        };
        histogram.reset();
        previous = current;
        return record;
      } catch {
        return { profileError: true };
      }
    },
    stop() {
      const active = histogram;
      histogram = undefined;
      try {
        active?.disable();
      } catch {
        // Nothing else to release.
      }
    },
  };
}

function audioFields(dispatcher: StreamDispatcher): DiagnosticRecord {
  try {
    const resource = dispatcher.audioResource;
    const stream = resource?.playStream;
    const state = dispatcher.audioPlayer.state;
    // The player adds 20ms per frame sent, including silence substituted on
    // underrun; the resource adds 20ms only per real packet read.
    const playerMs = 'playbackDuration' in state ? state.playbackDuration : undefined;
    const resourceMs = resource?.playbackDuration;
    const record: DiagnosticRecord = {
      playStreamBuffered: stream?.readableLength,
      playStreamUnits: stream ? (stream.readableObjectMode ? 'packets' : 'bytes') : undefined,
      // Resets to zero on every real packet, so it is not cumulative.
      missedFrames: 'missedFrames' in state ? state.missedFrames : undefined,
      injectedSilenceMs:
        typeof playerMs === 'number' && typeof resourceMs === 'number'
          ? playerMs - resourceMs
          : undefined,
    };
    const dsp = (dispatcher as unknown as { dsp?: DspStages }).dsp;
    for (const [field, name] of Object.entries(DSP_STAGES)) {
      const stage = dsp?.[name];
      record[field] = !stage ? 'absent' : stage.disabled ? 'disabled' : 'active';
    }
    return record;
  } catch {
    return { audioProfileError: true };
  }
}

export function installVoiceDiagnostics(
  player: Player,
  report: (record: DiagnosticRecord) => void,
  enabled = false,
  probes: ProfileProbes = nodeProbes,
): () => void {
  if (!enabled) return () => {};

  // Never forward library debug strings or serialize full resources/connections:
  // they can contain speech text, signed URLs, session tokens and encryption keys.
  const snapshot = (queue: GuildQueue): DiagnosticRecord => {
    const voice = queue.connection?.state;
    const network = voice && 'networking' in voice ? voice.networking.state : undefined;
    const data = network && 'connectionData' in network ? network.connectionData : undefined;
    const dave = network && 'dave' in network ? network.dave : undefined;
    const memberVoice = queue.guild.members.me?.voice;
    return {
      guildId: queue.guild.id,
      channelId: queue.channel?.id,
      voiceStatus: voice?.status,
      audioStatus: queue.dispatcher?.audioPlayer.state.status,
      serverMute: memberVoice?.serverMute ?? undefined,
      selfMute: memberVoice?.selfMute ?? undefined,
      suppressed: memberVoice?.suppress ?? undefined,
      queueVolume: queue.node.volume,
      playbackMs: queue.dispatcher?.audioResource?.playbackDuration,
      packetsPlayed:
        data && 'packetsPlayed' in data && typeof data.packetsPlayed === 'number'
          ? data.packetsPlayed
          : undefined,
      speaking:
        data && 'speaking' in data && typeof data.speaking === 'boolean'
          ? data.speaking
          : undefined,
      daveProtocol: dave?.protocolVersion,
      daveReady: dave?.session?.ready,
    };
  };
  const write = (event: string, queue: GuildQueue, extra: DiagnosticRecord = {}) => {
    try {
      report({ event, ...snapshot(queue), ...extra });
    } catch {
      // Observability must not interrupt playback, even during teardown.
    }
  };
  const connections = new Map<StreamDispatcher, () => void>();
  const onConnection = (queue: GuildQueue) => {
    write('connection', queue);
    const dispatcher = queue.dispatcher;
    const connection = queue.connection;
    if (!dispatcher || !connection || connections.has(dispatcher)) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let profiler: ProfileSampler | undefined;
    const clearTimer = () => {
      clearInterval(timer);
      timer = undefined;
      profiler?.stop();
      profiler = undefined;
    };
    const sampleWhilePlaying = () => {
      clearTimer();
      if (dispatcher.audioPlayer.state.status === 'playing') {
        const sampler = createProfileSampler(probes);
        profiler = sampler;
        timer = setInterval(
          () => write('progress', queue, { ...sampler.sample(), ...audioFields(dispatcher) }),
          1000,
        );
        timer.unref();
      }
    };
    const onAudioState = (previous: AudioPlayerState, next: AudioPlayerState) => {
      write('audioState', queue, { previousStatus: previous.status, audioStatus: next.status });
      sampleWhilePlaying();
    };
    const onVoiceState = (previous: VoiceConnectionState, next: VoiceConnectionState) => {
      write('voiceState', queue, {
        previousStatus: previous.status,
        voiceStatus: next.status,
        disconnectReason: next.status === 'disconnected' ? next.reason : undefined,
        closeCode: 'closeCode' in next ? next.closeCode : undefined,
      });
      if (next.status === 'destroyed') detach();
    };
    const detach = () => {
      clearTimer();
      connection.off('stateChange', onVoiceState);
      dispatcher.audioPlayer.off('stateChange', onAudioState);
      dispatcher.off('error', onDispatcherError);
      dispatcher.off('destroyed', detach);
      connections.delete(dispatcher);
    };
    const onDispatcherError = (error: Error) => write('error', queue, errorFields(error));
    connections.set(dispatcher, detach);
    connection.on('stateChange', onVoiceState);
    dispatcher.audioPlayer.on('stateChange', onAudioState);
    // Observe below Player.events so its unhandled-error fallback is unchanged.
    dispatcher.on('error', onDispatcherError);
    dispatcher.once('destroyed', detach);
    sampleWhilePlaying();
  };
  const onStart = (queue: GuildQueue) => write('playerStart', queue);
  const onFinish = (queue: GuildQueue) => write('playerFinish', queue);
  const errorFields = (error: Error): DiagnosticRecord => {
    const code = 'code' in error ? error.code : undefined;
    return {
      errorName: /^[A-Za-z]{1,48}Error$|^Error$/.test(error.name) ? error.name : 'OtherError',
      errorCode: typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? code : undefined,
    };
  };
  const onSkip = (queue: GuildQueue, _track: unknown, reason: string) =>
    write('playerSkip', queue, { skipReason: reason });
  player.events.on('connection', onConnection);
  player.events.on('playerStart', onStart);
  player.events.on('playerFinish', onFinish);
  player.events.on('playerSkip', onSkip);

  return () => {
    player.events.off('connection', onConnection);
    player.events.off('playerStart', onStart);
    player.events.off('playerFinish', onFinish);
    player.events.off('playerSkip', onSkip);
    for (const detach of connections.values()) detach();
  };
}
