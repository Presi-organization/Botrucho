const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    name: 'debug',
    description: 'Debugs the player',
    cat: 'music',
    botpermissions: [ 'CONNECT', 'SPEAK' ],
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('CDebugs the player'),
    async execute(interaction, guildDB) {
        const { client } = interaction;
        const queue = interaction.client.player.getQueue(interaction.guild.id)
        if (!queue) {
            let err = await interaction.translate(client.guildData, "NOT_MUSIC", guildDB.lang)
            return interaction.errorMessage(err)
        }
        interaction.reply({
            embeds: [ {
                title: "Player for " + interaction.guild.name + "",
                color: client.config.color,
                fields: [ {
                    name: "• State",
                    value: `\`${ queue.connection.status.toUpperCase() }\``,
                    inline: true
                },
                    {
                        name: "• Paused",
                        value: queue.connection.paused ? "`true`" : "`false`",
                        inline: true
                    },
                    {
                        name: "• Volume",
                        value: `\`${ queue.connection.volume }\``,
                        inline: true
                    },
                    {
                        name: "• Current",
                        value: `${ queue.current ? queue.current.title : "Nothing" }`,
                    },
                    {
                        name: "• Voice channel",
                        value: `${ queue.connection.channel }`,
                        inline: true
                    },
                    {
                        name: "• Text channel",
                        value: `${ queue.metadata.channel }`,
                        inline: true
                    }

                ],
                footer: {
                    text: interaction.client.footer,
                    icon_url: interaction.client.user.displayAvatarURL({ dynamic: true, size: 512 })
                },
                author: {
                    name: interaction.guild.name,
                    icon_url: interaction.guild.iconURL({ dynamic: true })
                }
            } ]
        });
    },
};
