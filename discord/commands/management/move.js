const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');

module.exports = {
    name: 'move',
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Select a member and move them to another channel.')
        .addUserOption(option => option.setName('target').setDescription('The member to move').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('The channel to move').addChannelTypes(ChannelType.GuildVoice).setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getMember('target');
        const channel = interaction.options.getChannel('channel');

        if (!(interaction.member.voice.channel)) {
            return await interaction.reply({ content: "You need to join a Voice-Channel first.", ephemeral: true });
        }
        if (!(user.voice.channelId)) {
            return await interaction.reply({
                content: "The Member is currently not in a Voice-Channel.",
                ephemeral: true
            });
        }

        await user.voice.setChannel(channel)
        return interaction.reply({ content: `You moved ${ user.username } to ${ channel }`, ephemeral: true });
    },
};
