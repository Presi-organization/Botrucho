const { useQueue } = require("discord-player");
const { Success, Error } = require("../../../util/embedMessage");
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    name: 'skip',
    description: 'Skip to the next track.',
    cat: 'music',
    botpermissions: ['CONNECT', 'SPEAK'],
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip to the next track.'),
    async execute(interaction) {
        if (!interaction.inCachedGuild()) return;

        await interaction.deferReply();

        const queue = useQueue(interaction.guildId);

        if (!queue?.isPlaying()) {
            const embed = Error({
                title: 'Not playing',
                description: 'I am not playing anything right now',
                author: {
                    name: interaction.guild.name,
                    icon_url: interaction.guild.iconURL()
                }
            });

            return interaction.editReply(embed);
        }

        queue.node.skip();

        const embed = Success({
            title: 'Track Skipped!',
            description: 'I have successfully skipped to the next track.',
            author: {
                name: interaction.guild.name,
                icon_url: interaction.guild.iconURL()
            }
        });

        interaction.client.deleted_messages.add(interaction);
        return interaction.editReply(embed);
    }
};
