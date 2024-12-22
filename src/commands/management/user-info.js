const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'user-info',
    data: new SlashCommandBuilder()
        .setName('user-info')
        .setDescription('Display info about yourself.'),
    async execute(interaction) {
        return interaction.reply(`Username: ${ interaction.user.username }\nID: ${ interaction.user.id }`);
    },
};
