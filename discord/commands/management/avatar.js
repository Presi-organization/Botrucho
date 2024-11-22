const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'avatar',
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get the avatar URL of the selected user, or your own avatar.')
        .addUserOption(option => option.setName('user-tag').setDescription('The user\'s avatar to show')),
    async execute(interaction, guildDB) {
        const user = interaction.options.getUser('user-tag');
        if (user) return interaction.reply(interaction.translate("AVATAR_USER", guildDB.lang))["user"].replace("{username}", user.username).replace("${image}", user.displayAvatarURL({ dynamic: true }));
        return interaction.reply(interaction.translate("AVATAR_USER", guildDB.lang))["self"].replace("${image}", user.displayAvatarURL({ dynamic: true }));
    },
};
