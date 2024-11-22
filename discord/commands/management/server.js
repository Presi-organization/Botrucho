const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'server',
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Display info about this server.'),
    async execute(interaction, guildDB) {
        const members = interaction.translate("SERVER_INFO", guildDB.lang)["a"];
        return interaction.reply(`Server: ${ interaction.guild.name }\n${ members }: ${ interaction.guild.memberCount }`);
    },
};
