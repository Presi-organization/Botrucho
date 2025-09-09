import { EmbedBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildQueue, useQueue } from 'discord-player';
import { IGuildData } from '@/mongodb';
import { ICommand, CommandInteractionWithClient, MusicKeys, PlayerType, SkipKeys, TranslationElement } from '@/types';
import { Error, Success } from '@/utils';

export default class SkipCommand extends ICommand {
  name = 'skip';
  description = 'Skip to the next track.';
  cat = 'music';
  botpermissions: string[] = ['CONNECT', 'SPEAK'];
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip to the next track.');

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { client } = interaction;
    const { SKIPPED_TITLE, SKIPPED_DESC }: TranslationElement<SkipKeys> = interaction.translate('SKIP', guildDB.lang)
    const {
      NOT_PLAYING_TITLE,
      NOT_PLAYING_DESC
    }: TranslationElement<MusicKeys> = interaction.translate('MUSIC', guildDB.lang)

    await interaction.deferReply();

    const queue: GuildQueue<PlayerType> | null = useQueue(interaction.guildId);

    if (!queue?.isPlaying()) {
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

    queue.node.skip();

    const embed = Success({
      title: SKIPPED_TITLE,
      description: SKIPPED_DESC,
      author: {
        name: interaction.guild.name,
        icon_url: interaction.guild.iconURL() ?? undefined
      }
    });

    client.deleted_messages.add(interaction);
    await interaction.editReply({ embeds: [embed] });
  }
}
