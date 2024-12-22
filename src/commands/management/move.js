const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');

module.exports = {
    name: 'move',
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Select a member and move them to another channel.')
        .addUserOption(option => option.setName('user').setDescription('The member to move').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('The channel to move').addChannelTypes(ChannelType.GuildVoice).setRequired(true)),
    async execute(interaction, guildDB) {
        const user = interaction.options.getMember('user');
        const channel = interaction.options.getChannel('channel');

        if (!(interaction.member.voice.channel)) {
            return await interaction.reply({ content: interaction.translate("NOT_VOC", guildDB.lang), ephemeral: true });
        }
        if (!(user.voice.channelId)) {
            return await interaction.reply({
                content: interaction.translate("USER_NOT_VOC", guildDB.lang),
                ephemeral: true
            });
        }

        await user.voice.setChannel(channel);
        const user_moved = interaction.translate("USER_MOVED", guildDB.lang)
            .replace("${username}", user.username)
            .replace("${channel}", channel);
        return interaction.reply({ content: user_moved, ephemeral: true });
    },
};
