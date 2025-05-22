import { CommandInteraction, SlashCommandOptionsOnlyBuilder, SlashCommandUserOption, User } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import { AvatarKeys, ICommand, TranslationElement } from '@/types';
import { Info } from '@/utils';

export default class AvatarCommand extends ICommand {
  name = 'avatar';
  description = 'Get the avatar URL of the selected user, or your own avatar.';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get the avatar URL of the selected user, or your own avatar.')
    .addUserOption((option: SlashCommandUserOption) => option.setName('user-tag').setDescription('The user\'s avatar to show'));

  async execute(interaction: CommandInteraction, guildDB: IGuildData): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const { USER, SELF }: TranslationElement<AvatarKeys> = interaction.translate('AVATAR', guildDB.lang);

    const user: User | null = interaction.options.getUser('user-tag');
    if (user) {
      await interaction.reply({ embeds: [Info({ description: USER.replace('${username}', user.username).replace('${image}', user.displayAvatarURL()) })] });
    }
    await interaction.reply({ embeds: [Info({ description: SELF.replace('${image}', interaction.user.displayAvatarURL()) })] });
  }
}
