import { CommandInteraction, EmbedBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildQueue, useQueue } from 'discord-player';
import { Botrucho, IGuildData } from '@/mongodb';
import { MusicKeys, PlayerType, SkipKeys, TranslationElement } from '@/types';
import { Error, Success } from '@/utils';

export const name = 'skip';
export const description = 'Skip to the next track.';
export const cat = 'music';
export const botpermissions: string[] = ['CONNECT', 'SPEAK'];
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip to the next track.');

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
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

    return interaction.editReply({ embeds: [embed] });
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
  return interaction.editReply({ embeds: [embed] });
}
