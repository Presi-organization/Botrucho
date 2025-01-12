import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { GuildQueue, useQueue } from "discord-player";
import { PlayerMetadata } from "@customTypes/playerMetadata";
import Botrucho from "@mongodb/base/Botrucho";
import { IGuildData } from "@mongodb/models/GuildData";
import { Success, Error } from "@util/embedMessage";
import { LeaveKeys, MusicKeys, TranslationElement } from "@customTypes/Translations";

export const name = 'leave';
export const description = 'Makes the bot leaving your voice channel.';
export const cat = 'music';
export const botpermissions: string[] = ['CONNECT', 'SPEAK'];
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Makes the bot leaving your voice channel.');

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;

    const { DISCONNECTED, SUCCESS }: TranslationElement<LeaveKeys> = interaction.translate("LEAVE", guildDB.lang);
    const {
        NOT_PLAYING_TITLE,
        NOT_PLAYING_DESC
    }: TranslationElement<MusicKeys> = interaction.translate("MUSIC", guildDB.lang);

    await interaction.deferReply();

    const queue: GuildQueue<PlayerMetadata> | null = useQueue(interaction.guildId);

    if (!queue) {
        const embed = Error({
            title: NOT_PLAYING_TITLE,
            description: NOT_PLAYING_DESC,
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
        title: DISCONNECTED,
        description: SUCCESS,
        author: {
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL() ?? undefined
        }
    });

    interaction.client.deleted_messages.add(interaction);
    return interaction.editReply({ embeds: [embed] });
}
