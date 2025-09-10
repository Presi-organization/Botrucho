import { SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { GuildQueue, Track, useQueue } from 'discord-player';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import {
  ICommand,
  CommandInteractionWithClient,
  MusicKeys,
  PlayerKeys,
  PlayerType,
  ShuffleKeys,
  TranslationElement
} from '@/types';
import { Error, Success, updateQueueMessage } from '@/utils';

export default class ShuffleCommand extends ICommand {
  name = 'shuffle';
  description = 'Shuffles the current queue';
  cat = 'music';
  botpermissions: string[] = ['CONNECT', 'SPEAK'];
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffles the current music queue.');

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const { SHUFFLED }: TranslationElement<ShuffleKeys> = interaction.translate('SHUFFLE', guildDB.lang);
    const { NOT_PLAYING_DESC }: TranslationElement<MusicKeys> = interaction.translate('MUSIC', guildDB.lang);
    const playerTranslation: TranslationElement<PlayerKeys> = interaction.translate('PLAYER', guildDB.lang);

    const queue: GuildQueue<PlayerType> | null = useQueue();
    if (!queue || !queue.isPlaying()) {
      await interaction.reply({ embeds: [Error({ description: NOT_PLAYING_DESC })] });
      return;
    }
    const tracksArray = queue.tracks.toArray() as Track[];
    queue.tracks.clear();
    this._shuffleArray(tracksArray).forEach(track => queue.tracks.add(track));
    await interaction.reply({ embeds: [Success({ description: SHUFFLED })] });
    await updateQueueMessage(queue, queue?.currentTrack as Track, playerTranslation);
    interaction.client.deleted_messages.add(interaction);
  }

  private _shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1) * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
