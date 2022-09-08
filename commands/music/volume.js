const { SlashCommandBuilder } = require("@discordjs/builders");
module.exports = {
    name: 'volume',
    description: 'Changes the Volume',
    permissions: false,
    aliases: [ 'sound', 'v', "vol" ],
    cat: 'music',
    exemple: '70',
    botpermissions: [ 'CONNECT', 'SPEAK' ],
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Changes the Volume')
        .addStringOption(option => option.setName('value').setDescription('The new volume ypu want me to set to [1-200]').setRequired(true)),
    async execute(interaction, guildDB) {
        const { client } = interaction;
        const voice = interaction.member.voice.channel;
        if (!voice) {
            let err = await interaction.translate("NOT_VOC", guildDB.lang)
            return interaction.errorMessage(err)
        }
        const queue = interaction.client.player.getQueue(interaction.guild.id)
        if (!queue || !queue.playing) {
            let err = await interaction.translate("NOT_MUSIC", guildDB.lang)
            return interaction.errorMessage(err)
        }
        let volume = interaction.options.getString('value');
        if (volume === "max") volume = 200
        if (volume === "reset" || volume === "default") volume = 70
        if (isNaN(volume) || 200 < parseInt(volume) || parseInt(volume) <= 0) {
            let numberErr = await interaction.translate("NUMBER_ERROR", guildDB.lang)
            return interaction.errorMessage(numberErr.replace("{amount}", "1").replace("{range}", "200"))
        }
        queue.connection.setVolume(parseInt(volume));
        let volumeText = await interaction.translate("VOLUME", guildDB.lang)
        interaction.reply({
            embeds: [
                {
                    color: client.config.color,
                    description: volumeText.replace("{volume}", volume)
                },
            ]
        })
    }
};
