import {
    CommandInteraction,
    MessageFlags,
    SlashCommandIntegerOption,
    SlashCommandOptionsOnlyBuilder
} from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@mongodb/models/GuildData";
import Botrucho from "@mongodb/base/Botrucho";
import { Error, Success } from "@util/embedMessage";
import { PruneKeys, TranslationElement } from "@customTypes/Translations";

export const name = 'prune';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('prune')
    .setDescription('Prune up to 99 messages.')
    .addIntegerOption((option: SlashCommandIntegerOption) => option.setName('amount').setDescription('Number of messages to prune').setRequired(true));

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { AMOUNT_ERR, ERR, SUCCESS }: TranslationElement<PruneKeys> = interaction.translate("PRUNE", guildDB.lang);

    const amount: number = interaction.options.getInteger('amount', true);

    if (amount < 1 || amount > 100) {
        return interaction.reply({
            embeds: [Error({ description: AMOUNT_ERR })],
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.channel!.bulkDelete(amount, true).catch(error => {
        console.error(error);
        interaction.reply({
            embeds: [Error({ description: ERR })],
            flags: MessageFlags.Ephemeral
        });
    });

    await interaction.reply({
        embeds: [Success({ description: SUCCESS.replace("${amount}", amount.toString()) })],
        flags: MessageFlags.Ephemeral
    });
    interaction.client.deleted_messages.add(interaction);
}
