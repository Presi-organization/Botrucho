import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import { ICommand, ServerInfoKeys, TranslationElement } from '@/types';
import { Error, Success } from '@/utils';

export default class ServerCommand extends ICommand {
  name = 'server';
  description = 'Display info about this server.';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('server')
    .setDescription('Display info about this server.');

  async execute(interaction: CommandInteraction, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;

    const serverTranslation: TranslationElement<ServerInfoKeys> = interaction.translate('SERVER_INFO', guildDB.lang);

    const server: string = serverTranslation.TITLE.replace('${name}', interaction.guild.name);
    const members: string = serverTranslation.a.replace('${count}', (interaction.guild.memberCount).toString());
    const account: string = serverTranslation.b.replace('${count}', interaction.guild.ownerId);
    const channels: string = serverTranslation.d.replace('${count}', (interaction.guild.channels.cache.size).toString());
    const banner: string = serverTranslation.e.replace('${count}', (interaction.guild.bannerURL() as string));
    const others: string = serverTranslation.f.replace('${count}', interaction.guild.features.join(', '));

    if (!interaction.guild) {
      await interaction.reply({ embeds: [Error({ description: serverTranslation.ONLY_SERVER })] });
    }
    await interaction.reply({ embeds: [Success({ description: `${server}\n\n${members}\n${account}\n${channels}\n${banner}\n${others}` })] });
  }
}
