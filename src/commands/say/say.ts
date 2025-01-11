import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { join } from "path";
import { CommandInteraction, MessageFlags, SlashCommandOptionsOnlyBuilder, VoiceBasedChannel } from "discord.js";
import { Player, useMainPlayer, QueueRepeatMode } from "discord-player";
import { SlashCommandBuilder } from "@discordjs/builders";
import {
    SpeechConfig,
    AudioConfig,
    SpeechSynthesizer,
    ResultReason,
    SpeechSynthesisResult
} from "microsoft-cognitiveservices-speech-sdk";
import { createAudioResource } from 'discord-voip';
import { IGuildData } from "@mongodb/models/GuildData";

export const name = 'say';
export const description = 'Plays a phrase';
export const cat = 'sound';
export const botpermissions = ['CONNECT', 'SPEAK'];
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('say')
    .setDescription('Plays a phrasae.')
    .addStringOption(option => option.setName('phrase').setDescription('The desired phrase').setRequired(true));

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const channel: VoiceBasedChannel | null = interaction.member.voice.channel;
    const player: Player = useMainPlayer();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const phrase: string = interaction.options.getString('phrase', true);
    if (!channel) return interaction.editReply('Connect to a Voice Channel');

    const key: string = process.env.AISPEECH_TOKEN!;
    const region = "eastus";
    const audioFile = join(__dirname, "voice_speech.wav");

    const speechConfig = SpeechConfig.fromSubscription(key, region);
    const audioConfig = AudioConfig.fromAudioFileOutput(audioFile);

    speechConfig.speechSynthesisVoiceName = "es-CL-LorenzoNeural";
    speechConfig.speechSynthesisVoiceName = "es-CR-JuanNeural";
    speechConfig.speechSynthesisVoiceName = "es-MX-JorgeNeural";

    let synthesizer: SpeechSynthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakTextAsync(phrase,
        async function (result: SpeechSynthesisResult) {
            if (result.reason === ResultReason.SynthesizingAudioCompleted) {
                const arrayBuffer = result.audioData
                const nodeBuffer = Buffer.from(arrayBuffer);
                const nodeStream = Readable.from(nodeBuffer);
                let resource = createAudioResource(nodeStream, { metadata: { title: phrase } });

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
                    embeds: [{
                        description: `Synthesizing phrase.`,
                        color: 16103193
                    }],
                });

            } else {
                console.error("Speech synthesis canceled, " + result.errorDetails +
                    "\nDid you set the speech resource key and region values?");
            }
            synthesizer.close();
        },
        function (err) {
            console.trace("err - " + err);
            synthesizer.close();
        });
}
