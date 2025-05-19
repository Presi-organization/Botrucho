import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { GuildQueue, Track, useQueue } from "discord-player";
import { SlashCommandBuilder } from "@discordjs/builders";
import { IGuildData } from "@mongodb/models/GuildData";
import Botrucho from "@mongodb/base/Botrucho";
import { updateQueueMessage } from "@util/embedUtils";
import { PlayerMetadata } from "@customTypes/PlayerMetadata";
import { Error, Success } from "@util/embedMessage";
import { MusicKeys, PlayerKeys, ShuffleKeys, TranslationElement } from "@customTypes/Translations";

export const name = 'shuffle';
export const description = 'Shuffles the current queue';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName('shuffle')
  .setDescription('Shuffles the current music queue.');

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
  const { SHUFFLED }: TranslationElement<ShuffleKeys> = interaction.translate("SHUFFLE", guildDB.lang);
  const { NOT_PLAYING_DESC }: TranslationElement<MusicKeys> = interaction.translate("MUSIC", guildDB.lang);
  const playerTranslation: TranslationElement<PlayerKeys> = interaction.translate("PLAYER", guildDB.lang);

  const queue: GuildQueue<PlayerMetadata> | null = useQueue();
  if (!queue || !queue.isPlaying()) {
    return interaction.reply({ embeds: [Error({ description: NOT_PLAYING_DESC })] });
  }
  const tracksArray = queue.tracks.toArray() as Track[];
  queue.tracks.clear();
  shuffleArray(tracksArray).forEach(track => queue.tracks.add(track));
  await interaction.reply({ embeds: [Success({ description: SHUFFLED })] });
  await updateQueueMessage(queue, queue?.currentTrack as Track, playerTranslation);
  interaction.client.deleted_messages.add(interaction);
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1) * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
