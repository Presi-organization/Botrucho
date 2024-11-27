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
        .addIntegerOption(option => option.setName('gain').setDescription('The new volume you want me to set to [1-200]').setRequired(false)),
    async execute(interaction) {
        if (!interaction.inCachedGuild()) return;
        const { client } = interaction;

        await interaction.deferReply({ ephemeral: true });

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
            client.deleted_messages.add(interaction);
            return interaction.editReply(embed);
        }

        const amount = interaction.options.getInteger('gain');

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
            client.deleted_messages.add(interaction);
            return interaction.editReply(embed);
        }

        const embed = Success({
            title: 'Volume',
            description: `The current volume is \`${ timeline.volume }%\`.`,
            author: {
                name: interaction.guild.name,
                icon_url: interaction.guild.iconURL()
            }
        });
        client.deleted_messages.add(interaction);
        return interaction.editReply(embed);
    }
}
