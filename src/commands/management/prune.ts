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
import { logger } from "@util/Logger";
import { MiscKeys, PruneKeys, TranslationElement } from "@customTypes/Translations";

export const name = 'prune';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName('prune')
  .setDescription('Prune up to 99 messages.')
  .addIntegerOption((option: SlashCommandIntegerOption) => option.setName('amount').setDescription('Number of messages to prune').setRequired(true));

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
  if (!interaction.inCachedGuild()) return;
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.channel || interaction.channel.isThread()) {
    const { NOT_POSSIBLE }: TranslationElement<MiscKeys> = interaction.translate("MISC", guildDB.lang);
    await interaction.reply({ embeds: [Error({ description: NOT_POSSIBLE })] });
    return;
  } else {
    const {
      AMOUNT_ERR,
      ERR,
      SUCCESS
    }: TranslationElement<PruneKeys> = interaction.translate("PRUNE", guildDB.lang);

    const amount: number = interaction.options.getInteger('amount', true);

    if (amount < 1 || amount > 100) {
      return interaction.reply({
        embeds: [Error({ description: AMOUNT_ERR })],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.channel!.bulkDelete(amount, true).catch(error => {
      logger.error(error);
      interaction.reply({
        embeds: [Error({ description: ERR })],
        flags: MessageFlags.Ephemeral
      });
    });

    await interaction.reply({
      embeds: [Success({ description: SUCCESS.replace("${amount}", amount.toString()) })],
      flags: MessageFlags.Ephemeral
    });
  }
  interaction.client.deleted_messages.add(interaction);
}
