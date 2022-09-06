const { SlashCommandBuilder } = require("@discordjs/builders");
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require("@discordjs/voice");

module.exports = {
    name: 'say',
    description: 'Plays a phrase',
    cat: 'sound',
    botpermissions: [ 'CONNECT', 'SPEAK' ],
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Plays a phrasae.')
        .addStringOption(option => option.setName('phrase').setDescription('The desired phrase').setRequired(true)),
    async execute(interaction, guildDB) {

        await interaction.deferReply("thinking");

        const phrase = interaction.options.getString('phrase');
        if (!interaction.member.voice?.channel) return interaction.editReply('Connect to a Voice Channel');

        let queue = interaction.client.player.getQueue(interaction.guild.id);

        if (queue) return interaction.editReply({ content: `Songs reproducing music`, ephemeral: true });

        const key = process.env.AISPEECH_TOKEN;
        const region = "eastus";
        const audioFile = "voice_speech.wav";

        const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
        const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);

        speechConfig.speechSynthesisVoiceName = "es-CL-LorenzoNeural";

        let synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        synthesizer.speakTextAsync(phrase,
            function (result) {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    const connection = joinVoiceChannel({
                        channelId: interaction.member.voice?.channel.id,
                        guildId: interaction.member.voice?.channel.guild.id,
                        adapterCreator: interaction.member.voice?.channel.guild.voiceAdapterCreator,
                    });

                    const player = createAudioPlayer();
                    const resource = createAudioResource(audioFile);
                    player.play(resource);

                    connection.subscribe(player);

                    interaction.editReply({
                        embeds: [ {
                            description: `Synthesizing phrase.`,
                            color: 0XF5B719
                        } ]
                    })
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
