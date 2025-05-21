import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@/mongodb/models/GuildData";
import { FinesKeys, MiscKeys, TranslationElement } from "@/types/Translations";
import { Info } from "@/util/embedMessage";

export const name = 'multas';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName('multas')
  .setDescription('Display info about infractions.')
  .addNumberOption(input => input.setName('identification')
    .setDescription('Identification of user to search for infractions')
    .setRequired(true));

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
  if (!interaction.isChatInputCommand()) return;

  const { YES, NO }: TranslationElement<MiscKeys> = interaction.translate("MISC", guildDB.lang);
  const { TITLE, DESC }: TranslationElement<FinesKeys> = interaction.translate("FINES", guildDB.lang);

  let identification: number = interaction.options.getNumber('identification', true);

  await interaction.deferReply();
  //TODO: API CALL
  return interaction.editReply({
    embeds: [Info({
      title: TITLE.replace("${id}", identification.toString()),
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
