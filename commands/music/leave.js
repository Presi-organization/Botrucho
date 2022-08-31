const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    name: 'leave',
    description: 'Makes the bot leaving your voice channel.',
    cat: 'music',
    botpermissions: [ 'CONNECT', 'SPEAK' ],
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Makes the bot leaving your voice channel.'),
    async execute(interaction, guildDB) {
        const { client } = interaction;

        let queue = client.player.getQueue(interaction.guild.id)
        if (!queue || !queue.connection || !interaction.member.voice.channel) {
            let err = await interaction.translate("NOT_MUSIC", guildDB.lang)
            return interaction.errorMessage(err)
        }
        if (guildDB.dj_role && queue.metadata.dj.id !== interaction.user.id) {
            if (!interaction.member.permissions.has("MANAGE_MESSAGES")) {
                let MissingRole = await interaction.translate("MISSING_ROLE", guildDB.lang);
                let Missingperm = await interaction.translate("MISSING_PERMISSIONS", guildDB.lang);
                let role = interaction.guild.roles.cache.get(guildDB.dj_role)
                if (!role) return message.errorMessage(Missingperm.replace("{perm}", 'Manage messages'))
                if (interaction.member.roles.cache) {
                    if (!interaction.member.roles.cache.has(role.id)) return interaction.errorMessage(MissingRole.replace("{perm}", 'Manage messages').replace("{role}", role.name))
                } else return interaction.errorMessage(MissingRole.replace("{perm}", 'Manage messages').replace("{role}", role.name))
            }
        }
        try {
            if (queue.connection) await queue.connection.disconnect()
        } catch (err) {
            console.log(err)
            return interaction.errorMessage(`I am not able to leave your voice channel, please check my permissions !`);
        }
        if (interaction.member.voice.channel) await queue.connection.disconnect();
        interaction.reply({
            embeds: [ {
                description: "Disconnected from <#" + interaction.member.voice.channel.id + ">.",
                color: 0X2ED457,
            } ]
        })
    },
};
