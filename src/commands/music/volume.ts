import {
    CommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandIntegerOption,
    SlashCommandOptionsOnlyBuilder
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { GuildQueueTimeline, useTimeline } from "discord-player";
import Botrucho from "@mongodb/base/Botrucho";
import { IGuildData } from "@mongodb/models/GuildData";
import { Error, Success } from "@util/embedMessage";
import { MusicKeys, TranslationElement, VolumeKeys } from "@customTypes/Translations";

export const name = 'volume';
export const description = 'Changes the Volume';
export const permissions = false;
export const aliases: string[] = ['sound', 'v', "vol"];
export const cat = 'music';
export const exemple = '70';
export const botpermissions: string[] = ['CONNECT', 'SPEAK'];
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Changes the Volume')
    .addIntegerOption((option: SlashCommandIntegerOption) => option.setName('gain').setDescription('The new volume you want me to set to [1-200]').setRequired(false));

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const {
        CURRENT_VOLUME_TITLE,
        CURRENT_VOLUME_DESC,
        VOLUME_CHANGED_TITLE,
        VOLUME_CHANGED_DESC
    }: TranslationElement<VolumeKeys> = interaction.translate("VOLUME", guildDB.lang);
    const {
        NOT_PLAYING_TITLE,
        NOT_PLAYING_DESC
    }: TranslationElement<MusicKeys> = interaction.translate("MUSIC", guildDB.lang)

    const { client } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const timeline: GuildQueueTimeline | null = useTimeline({ node: interaction.guildId });

    if (!timeline?.track) {
        const embed: EmbedBuilder = Error({
            title: NOT_PLAYING_TITLE,
            description: NOT_PLAYING_DESC,
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
            title: VOLUME_CHANGED_TITLE,
            description: VOLUME_CHANGED_DESC.replace("${gain}", amount.toString()),
            author: {
                name: interaction.guild.name,
                icon_url: interaction.guild.iconURL() ?? undefined
            }
        });
    } else {
        embed = Success({
            title: CURRENT_VOLUME_TITLE,
            description: CURRENT_VOLUME_DESC.replace("${gain}", timeline.volume.toString()),
            author: {
                name: interaction.guild.name,
                icon_url: interaction.guild.iconURL() ?? undefined
            }
        });
    }

    client.deleted_messages.add(interaction);
    return interaction.editReply({ embeds: [embed] });
}
