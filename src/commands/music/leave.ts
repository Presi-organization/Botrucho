import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { GuildQueue, useQueue } from "discord-player";
import { Success, Error } from "@util/embedMessage";
import { PlayerMetadata } from "@customTypes/playerMetadata";
import Botrucho from "@mongodb/base/Botrucho";

export const name = 'leave';
export const description = 'Makes the bot leaving your voice channel.';
export const cat = 'music';
export const botpermissions = ['CONNECT', 'SPEAK'];
export const data = new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Makes the bot leaving your voice channel.');

export async function execute(interaction: CommandInteraction & { client: Botrucho }) {
    if (!interaction.inCachedGuild()) return;

    await interaction.deferReply();

    const queue: GuildQueue<PlayerMetadata> | null = useQueue(interaction.guildId);

    if (!queue) {
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

    if (queue.metadata.queueMessage) {
        await queue.metadata.queueMessage.delete();
        queue.metadata.queueMessage = null;
    }

    queue.delete();

    const embed = Success({
        title: 'Disconnected!',
        description: 'I have successfully left the voice channel.',
        author: {
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL() ?? undefined
        }
    });

    interaction.client.deleted_messages.add(interaction);
    return interaction.editReply({ embeds: [embed] });
}
