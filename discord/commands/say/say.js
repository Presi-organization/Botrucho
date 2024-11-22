const fs = require('node:fs');
const { join } = require("path");
const { SlashCommandBuilder } = require("@discordjs/builders");
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { createAudioResource, getVoiceConnection, joinVoiceChannel } = require('discord-voip');

module.exports = {
    name: 'say',
    description: 'Plays a phrase',
    cat: 'sound',
    botpermissions: ['CONNECT', 'SPEAK'],
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Plays a phrasae.')
        .addStringOption(option => option.setName('phrase').setDescription('The desired phrase').setRequired(true)),
    async execute(interaction, guildDB) {
        const { client } = interaction;
        const channel = interaction.member.voice.channel;

        await interaction.deferReply("thinking");

        const phrase = interaction.options.getString('phrase');
        if (!channel) return interaction.editReply('Connect to a Voice Channel');

        const key = process.env.AISPEECH_TOKEN;
        const region = "eastus";
        const audioFile = join(__dirname, "voice_speech.wav");

        const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
        const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);

        speechConfig.speechSynthesisVoiceName = "es-CL-LorenzoNeural";
        speechConfig.speechSynthesisVoiceName = "es-CR-JuanNeural";
        speechConfig.speechSynthesisVoiceName = "es-MX-JorgeNeural";

        let synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        synthesizer.speakTextAsync(phrase,
            async function (result) {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    let connection = getVoiceConnection(interaction.guild.id);
                    if (!connection) {
                        connection = joinVoiceChannel({
                            channelId: channel.id,
                            guildId: interaction.guildId,
                            adapterCreator: interaction.guild.voiceAdapterCreator,
                        });
                    }
                    connection.subscribe(client.playerSay);

                    await new Promise(resolve => setTimeout(resolve, 500));

                    const stream = fs.createReadStream(audioFile);

                    let resource = createAudioResource(stream);
                    client.playerSay.play(resource);

                    interaction.editReply({
                        embeds: [{
                            description: `Synthesizing phrase.`,
                            color: 0XF5B719
                        }]
                    });

                } else {
                    console.error("Speech synthesis canceled, " + result.errorDetails +
                        "\nDid you set the speech resource key and region values?");
                }
                synthesizer.close();
                synthesizer = null;
            },
            function (err) {
                console.trace("err - " + err);
                synthesizer.close();
                synthesizer = null;
            });
    }
}
