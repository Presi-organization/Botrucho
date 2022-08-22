const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'ping',
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        const ping = Math.abs(Date.now() - interaction.createdTimestamp);
        return interaction.reply(`**:ping_pong: Pong!**\n${ ping }ms`);
    },
};
