import type { GuildQueue, Player, StreamDispatcher } from 'discord-player';
import type { AudioPlayerState, VoiceConnectionState } from 'discord-voip';

type DiagnosticRecord = Record<string, string | number | boolean | undefined>;

export function installVoiceDiagnostics(
  player: Player,
  report: (record: DiagnosticRecord) => void,
  enabled = false,
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
    const clearTimer = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const sampleWhilePlaying = () => {
      clearTimer();
      if (dispatcher.audioPlayer.state.status === 'playing') {
        timer = setInterval(() => write('progress', queue), 1000);
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
