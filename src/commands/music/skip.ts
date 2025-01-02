import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { useQueue } from "discord-player";
import { Success, Error } from "@util/embedMessage";
import Botrucho from "@mongodb/base/Botrucho";

export const name = 'skip';
export const description = 'Skip to the next track.';
export const cat = 'music';
export const botpermissions = ['CONNECT', 'SPEAK'];
export const data = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip to the next track.');

export async function execute(interaction: CommandInteraction & { client: Botrucho }) {
    if (!interaction.inCachedGuild()) return;

    await interaction.deferReply();

    const queue = useQueue(interaction.guildId);

    if (!queue?.isPlaying()) {
        const embed = Error({
            title: 'Not playing',
            description: 'I am not playing anything right now',
            author: {
                name: interaction.guild.name,
                iconURL: interaction.guild.iconURL() ?? undefined
            }
        });

        return interaction.editReply({ embeds: [embed] });
    }

    queue.node.skip();

    const embed = Success({
        title: 'Track Skipped!',
        description: 'I have successfully skipped to the next track.',
        author: {
            name: interaction.guild.name,
            icon_url: interaction.guild.iconURL() ?? undefined
        }
    });

    interaction.client.deleted_messages.add(interaction);
    return interaction.editReply({ embeds: [embed] });
}
