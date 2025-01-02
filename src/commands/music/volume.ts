import { CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { useTimeline } from "discord-player";
import { Error, Success } from "@util/embedMessage";
import Botrucho from "@mongodb/base/Botrucho";

export const name = 'volume';
export const description = 'Changes the Volume';
export const permissions = false;
export const aliases = ['sound', 'v', "vol"];
export const cat = 'music';
export const exemple = '70';
export const botpermissions = ['CONNECT', 'SPEAK'];
export const data = new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Changes the Volume')
    .addIntegerOption(option => option.setName('gain').setDescription('The new volume you want me to set to [1-200]').setRequired(false));

export async function execute(interaction: CommandInteraction & { client: Botrucho }) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { client } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const timeline = useTimeline({ node: interaction.guildId });

    if (!timeline?.track) {
        const embed: EmbedBuilder = Error({
            title: 'Not playing',
            description: 'I am not playing anything right now',
            author: {
                name: interaction.guild.name,
                icon_url: interaction.guild.iconURL() ?? undefined
            }
        });
        client.deleted_messages.add(interaction);
        return interaction.editReply({ embeds: [embed] });
    }

    const amount: number | null = interaction.options.getInteger('gain');

    let embed;
    if (amount != null) {
        timeline.setVolume(amount);

        embed = Success({
            title: 'Volume changed',
            description: `I have successfully changed the volume to ${ amount }%.`,
            author: {
                name: interaction.guild.name,
                icon_url: interaction.guild.iconURL() ?? undefined
            }
        });
    } else {
        embed = Success({
            title: 'Volume',
            description: `The current volume is \`${ timeline.volume }%\`.`,
            author: {
                name: interaction.guild.name,
                icon_url: interaction.guild.iconURL() ?? undefined
            }
        });
    }

    client.deleted_messages.add(interaction);
    return interaction.editReply({ embeds: [embed] });
}
