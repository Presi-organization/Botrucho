import { EmbedBuilder, MessageCreateOptions, MessageEditOptions } from 'discord.js';
import { GuildQueue, Track } from 'discord-player';
import { Info } from '@util/embedMessage';
import { PlayerMetadata } from "@customTypes/PlayerMetadata";
import { PlayerKeys, TranslationElement } from "@customTypes/Translations";

const updateQueueMessage = async (
  queue: GuildQueue<PlayerMetadata>,
  track: Track,
  {
    NOW_PLAYING,
    SONG,
    REQUESTED_BY,
    TRACKS_LEFT
  }: TranslationElement<PlayerKeys>
): Promise<void> => {
  if (track.extractor === null) return;

  queue.metadata.queueTitles = queue.tracks.data.map((track: Track): string => `[${track.title} - ${track.author}](${track.url})`);
  queue.metadata.currentTrack = track;
  const embed: EmbedBuilder = new EmbedBuilder()
    .setDescription(`[${track.title}](${track.url})`)
    .setTitle(NOW_PLAYING)
    .setThumbnail(track.thumbnail)
    .addFields(
      queue.metadata.queueTitles.slice(0, 20).map((title: string, index: number) => ({
        name: SONG.replace("${index}", (index + 1).toString()),
        value: title
      }))
    )
    .setFooter({
      text: REQUESTED_BY.replace("${username}", <string>track.requestedBy?.displayName),
      iconURL: track.requestedBy?.displayAvatarURL()
    });

  if (queue.metadata.queueTitles.length > 20) {
    embed.addFields({
      name: TRACKS_LEFT,
      value: (queue.metadata.queueTitles.length - 20).toString()
    });
  }

  const replyOptions: MessageCreateOptions & MessageEditOptions = { embeds: [Info(embed.data)] };

  if (!queue.metadata.queueMessage) {
    queue.metadata.queueMessage = await queue.metadata.channel!.send(replyOptions);
  } else {
    await queue.metadata.queueMessage.edit(replyOptions);
  }
};

export { updateQueueMessage };
