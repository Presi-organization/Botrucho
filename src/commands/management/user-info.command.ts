import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import { ICommand, TranslationElement, UserInfoKeys } from '@/types';
import { Success } from '@/utils';

export default class UserInfoCommand extends ICommand {
  name = 'user-info';
  description = 'Display info about yourself.';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('Display info about yourself.');

  async execute(interaction: CommandInteraction, guildDB: IGuildData): Promise<void> {
    const { USERNAME, ID }: TranslationElement<UserInfoKeys> = interaction.translate('USER_INFO', guildDB.lang);

    await interaction.reply({ embeds: [Success({ description: `${USERNAME.replace('${name}', interaction.user.username)}\n${ID.replace('${id}', interaction.user.id)}` })] });
  }

}
