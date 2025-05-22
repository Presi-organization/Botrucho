import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import { FinesKeys, ICommand, MiscKeys, TranslationElement } from '@/types';
import { Info } from '@/utils';

export default class MultasCommand extends ICommand {
  name = 'multas';
  description = 'Display info about infractions.';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('multas')
    .setDescription('Display info about infractions.')
    .addNumberOption(input => input.setName('identification')
      .setDescription('Identification of user to search for infractions')
      .setRequired(true));

  async execute(interaction: CommandInteraction, guildDB: IGuildData): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const { YES, NO }: TranslationElement<MiscKeys> = interaction.translate('MISC', guildDB.lang);
    const { TITLE, DESC }: TranslationElement<FinesKeys> = interaction.translate('FINES', guildDB.lang);

    const identification: number = interaction.options.getNumber('identification', true);

    await interaction.deferReply();
    //TODO: API CALL
    await interaction.editReply({
      embeds: [Info({
        title: TITLE.replace('${id}', identification.toString()),
        description: DESC,
        fields: [
          {
            name: 'Sabaneta',
            value: YES
          },
          {
            name: 'Envigado',
            value: NO
          },
          {
            name: 'Medellín',
            value: YES
          },
          {
            name: 'Bello',
            value: NO
          }
        ]
      })]
    });
  }
}
