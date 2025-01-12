import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { useQueue } from "discord-player";
import Botrucho from "@mongodb/base/Botrucho";
import { IGuildData } from "@mongodb/models/GuildData";
import { Success, Error } from "@util/embedMessage";
import { MusicKeys, SkipKeys, TranslationElement } from "@customTypes/Translations";

export const name = 'skip';
export const description = 'Skip to the next track.';
export const cat = 'music';
export const botpermissions = ['CONNECT', 'SPEAK'];
export const data = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip to the next track.');

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;

    const { SKIPPED_TITLE, SKIPPED_DESC }: TranslationElement<SkipKeys> = interaction.translate("SKIP", guildDB.lang)
    const {
        NOT_PLAYING_TITLE,
        NOT_PLAYING_DESC
    }: TranslationElement<MusicKeys> = interaction.translate("MUSIC", guildDB.lang)

    await interaction.deferReply();

    const queue = useQueue(interaction.guildId);

    if (!queue?.isPlaying()) {
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

    queue.node.skip();

    const embed = Success({
        title: SKIPPED_TITLE,
        description: SKIPPED_DESC,
        author: {
            name: interaction.guild.name,
            icon_url: interaction.guild.iconURL() ?? undefined
        }
    });

    interaction.client.deleted_messages.add(interaction);
    return interaction.editReply({ embeds: [embed] });
}
