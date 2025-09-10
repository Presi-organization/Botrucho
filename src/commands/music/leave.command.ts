import { EmbedBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildQueue, useQueue } from 'discord-player';
import { IGuildData } from '@/mongodb';
import { ICommand, CommandInteractionWithClient, LeaveKeys, MusicKeys, PlayerType, TranslationElement } from '@/types';
import { Error, Success } from '@/utils';

export default class LeaveCommand extends ICommand {
  name = 'leave';
  description = 'Makes the bot leaving your voice channel.';
  cat = 'music';
  botpermissions: string[] = ['CONNECT', 'SPEAK'];
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Makes the bot leaving your voice channel.');

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { client } = interaction;
    const { DISCONNECTED, SUCCESS }: TranslationElement<LeaveKeys> = interaction.translate('LEAVE', guildDB.lang);
    const {
      NOT_PLAYING_TITLE,
      NOT_PLAYING_DESC
    }: TranslationElement<MusicKeys> = interaction.translate('MUSIC', guildDB.lang);

    await interaction.deferReply();

    const queue: GuildQueue<PlayerType> | null = useQueue(interaction.guildId);

    if (!queue) {
      const embed: EmbedBuilder = Error({
        title: NOT_PLAYING_TITLE,
        description: NOT_PLAYING_DESC,
        author: {
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL() ?? undefined
        }
      });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (queue.metadata.queueMessage) {
      await queue.metadata.queueMessage.delete();
      queue.metadata.queueMessage = null;
    }

    queue.delete();

    const embed = Success({
      title: DISCONNECTED,
      description: SUCCESS,
      author: {
        name: interaction.guild.name,
        iconURL: interaction.guild.iconURL() ?? undefined
      }
    });

    client.deleted_messages.add(interaction);
    await interaction.editReply({ embeds: [embed] });
  }
}
