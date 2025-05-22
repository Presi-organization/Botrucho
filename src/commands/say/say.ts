import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { join } from 'path';
import {
  CommandInteraction,
  MessageFlags,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandStringOption,
  VoiceBasedChannel
} from 'discord.js';
import { Player, QueueRepeatMode, useMainPlayer } from 'discord-player';
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  AudioConfig,
  ResultReason,
  SpeechConfig,
  SpeechSynthesisResult,
  SpeechSynthesizer
} from 'microsoft-cognitiveservices-speech-sdk';
import { AudioResource, createAudioResource } from 'discord-voip';
import { Botrucho, IGuildData } from '@/mongodb';
import { SayKeys, TranslationElement, VCKeys } from '@/types';
import { logger, Success, Warning } from '@/utils';

export const name = 'say';
export const description = 'Plays a phrase';
export const cat = 'sound';
export const botpermissions: string[] = ['CONNECT', 'SPEAK'];
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Plays a phrasae.')
  .addStringOption((option: SlashCommandStringOption) => option.setName('phrase').setDescription('The desired phrase').setRequired(true));

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
  if (!interaction.inCachedGuild()) return;
  if (!interaction.isChatInputCommand()) return;

  const { client } = interaction;
  const { SYNTHESIZING }: TranslationElement<SayKeys> = interaction.translate('SAY', guildDB.lang);
  const { CONNECT_VC }: TranslationElement<VCKeys> = interaction.translate('VC', guildDB.lang);

  const channel: VoiceBasedChannel | null = interaction.member.voice.channel;
  const player: Player = useMainPlayer();

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const phrase: string = interaction.options.getString('phrase', true);
  if (!channel) return interaction.editReply({ embeds: [Warning({ description: CONNECT_VC })] });

  const key: string = client.config.integrations.aispeech;
  const region = 'eastus';
  const audioFile: string = join(__dirname, 'voice_speech.wav');

  const speechConfig: SpeechConfig = SpeechConfig.fromSubscription(key, region);
  const audioConfig: AudioConfig = AudioConfig.fromAudioFileOutput(audioFile);

  speechConfig.speechSynthesisVoiceName = 'es-CL-LorenzoNeural';
  speechConfig.speechSynthesisVoiceName = 'es-CR-JuanNeural';
  speechConfig.speechSynthesisVoiceName = 'es-MX-JorgeNeural';

  const synthesizer: SpeechSynthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

  synthesizer.speakTextAsync(phrase,
    async function (result: SpeechSynthesisResult) {
      if (result.reason === ResultReason.SynthesizingAudioCompleted) {
        const arrayBuffer: ArrayBuffer = result.audioData
        const nodeBuffer: Buffer<ArrayBufferLike> = Buffer.from(arrayBuffer);
        const nodeStream: Readable = Readable.from(nodeBuffer);
        const resource: AudioResource<{ title: string } extends (null | undefined) ? null : {
          title: string
        }> = createAudioResource(nodeStream, { metadata: { title: phrase } });

        const { track } = await player.play(channel, resource, {
          nodeOptions: {
            metadata: {
              channel: interaction.channel,
              queueMessage: null,
              currentTrack: undefined,
              queueTitles: [],
              message: interaction,
            },
            volume: guildDB.defaultVolume,
            repeatMode: QueueRepeatMode[guildDB.loopMode as keyof typeof QueueRepeatMode],
            noEmitInsert: true,
            leaveOnStop: false,
            leaveOnEmpty: true,
            leaveOnEmptyCooldown: 30000,
            leaveOnEnd: true,
            leaveOnEndCooldown: 30000,
            pauseOnEmpty: true,
            preferBridgedMetadata: true,
            disableBiquad: true
          },
          requestedBy: interaction.user,
          connectionOptions: {
            deaf: true,
          }
        });

        if (track.hasResource) {
          track.setResource(null);
        }

        await interaction.editReply({
          embeds: [Success({
            description: SYNTHESIZING,
          })],
        });
        client.deleted_messages.add(interaction);

      } else {
        logger.error('Speech synthesis canceled, ' + result.errorDetails +
          '\nDid you set the speech resource key and region values?');
      }
      synthesizer.close();
    },
    function (err) {
      logger.trace('err - ' + err);
      synthesizer.close();
    });
}
