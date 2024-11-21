const { SlashCommandBuilder } = require("@discordjs/builders");
const { useTimeline } = require("discord-player");
const { Success, Error } = require("../../../util/embedMessage");

module.exports = {
    name: 'volume',
    description: 'Changes the Volume',
    permissions: false,
    aliases: ['sound', 'v', "vol"],
    cat: 'music',
    exemple: '70',
    botpermissions: ['CONNECT', 'SPEAK'],
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Changes the Volume')
        .addStringOption(option => option.setName('value').setDescription('The new volume ypu want me to set to [1-200]').setRequired(true)),
    async execute(interaction, guildDB) {
        if (!interaction.inCachedGuild()) return;

        await interaction.deferReply();

        const timeline = useTimeline(interaction.guildId);

        if (!timeline?.track) {
            const embed = Error({
                title: 'Not playing',
                description: 'I am not playing anything right now',
                author: {
                    name: interaction.guild.name,
                    icon_url: interaction.guild.iconURL()
                }
            });

            return interaction.editReply({ embeds: [embed] });
        }

        const amount = interaction.options.getInteger('value', false);

        if (amount != null) {
            timeline.setVolume(amount);

            const embed = Success({
                title: 'Volume changed',
                description: `I have successfully changed the volume to ${ amount }%.`,
                author: {
                    name: interaction.guild.name,
                    icon_url: interaction.guild.iconURL()
                }
            });

            return interaction.editReply({ embeds: [embed] });
        }

        const embed = Success({
            title: 'Volume',
            description: `The current volume is \`${ timeline.volume }%\`.`,
            author: {
                name: interaction.guild.name,
                icon_url: interaction.guild.iconURL()
            }
        });

        return interaction.editReply({ embeds: [embed] });
    }
}
