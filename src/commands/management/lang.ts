import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@/mongodb/models/GuildData";
import Botrucho from "@/mongodb/base/Botrucho";
import { LanguageKeys, LanguagesKeys, TranslationElement } from "@/types/Translations";
import { Info, Success } from "@/util/embedMessage";

export const name = 'lang';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName('lang')
  .setDescription('Configure the language of the server')
  .addStringOption(input => input.setName('language')
    .setDescription('New language to set in server')
    .addChoices({ name: 'English', value: 'en' }, { name: 'Spanish', value: 'es' })
  )

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
  if (!interaction.inCachedGuild()) return;
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  const language: string | null = interaction.options.getString('language');
  const { ES, EN }: TranslationElement<LanguagesKeys> = interaction.translate("LANGUAGES", language ?? guildDB.lang);
  const langTranslation: { [key: string]: string } = { en: EN, es: ES };
  const {
    CURRENT_LANG,
    LANG_CHANGED
  }: TranslationElement<LanguageKeys> = interaction.translate("LANGUAGE", language ?? guildDB.lang);

  if (language != null) {
    await interaction.client.guildData.setLanguage({ guildId: interaction.guild.id, newLanguage: language });
    await interaction.editReply({ embeds: [Success({ description: LANG_CHANGED.replace("${lang}", langTranslation[language]) })] });
  } else {
    await interaction.editReply({ embeds: [Info({ description: CURRENT_LANG.replace("${lang}", langTranslation[<string>guildDB.lang]) })] });
  }
}
