import { MessageFlags, SlashCommandIntegerOption, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import { ICommand, CommandInteractionWithClient, MiscKeys, PruneKeys, TranslationElement } from '@/types';
import { Error, logger, Success } from '@/utils';

export default class PruneCommand extends ICommand {
  name = 'prune';
  description = 'Prune up to 99 messages.';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('prune')
    .setDescription('Prune up to 99 messages.')
    .addIntegerOption((option: SlashCommandIntegerOption) => option.setName('amount').setDescription('Number of messages to prune').setRequired(true));

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.channel || interaction.channel.isThread()) {
      const { NOT_POSSIBLE }: TranslationElement<MiscKeys> = interaction.translate('MISC', guildDB.lang);
      await interaction.reply({ embeds: [Error({ description: NOT_POSSIBLE })] });
      return;
    } else {
      const {
        AMOUNT_ERR,
        ERR,
        SUCCESS
      }: TranslationElement<PruneKeys> = interaction.translate('PRUNE', guildDB.lang);

      const amount: number = interaction.options.getInteger('amount', true);

      if (amount < 1 || amount > 100) {
        await interaction.reply({
          embeds: [Error({ description: AMOUNT_ERR })],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (interaction.channel) {
        await interaction.channel.bulkDelete(amount, true).catch(error => {
          logger.error(error);
          interaction.reply({
            embeds: [Error({ description: ERR })],
            flags: MessageFlags.Ephemeral
          });
        });

        await interaction.reply({
          embeds: [Success({ description: SUCCESS.replace('${amount}', amount.toString()) })],
          flags: MessageFlags.Ephemeral
        });
      }
      interaction.client.deleted_messages.add(interaction);
    }
  }
}
