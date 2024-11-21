const { useQueue } = require("discord-player");
const { Success, Error } = require("../../../util/embedMessage");
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    name: 'leave',
    description: 'Makes the bot leaving your voice channel.',
    cat: 'music',
    botpermissions: ['CONNECT', 'SPEAK'],
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Makes the bot leaving your voice channel.'),
    async execute(interaction, guildDB) {
        if (!interaction.inCachedGuild()) return;

        await interaction.deferReply();

        const queue = useQueue(interaction.guildId);

        if (!queue) {
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

        queue.delete();

        const embed = Success({
            title: 'Disconnected!',
            description: 'I have successfully left the voice channel.',
            author: {
                name: interaction.guild.name,
                icon_url: interaction.guild.iconURL()
            }
        });

        return interaction.editReply(embed);
    }
};
