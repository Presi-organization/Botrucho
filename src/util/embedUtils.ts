import { EmbedBuilder, MessageCreateOptions, MessageEditOptions } from 'discord.js';
import { GuildQueue, Track } from 'discord-player';
import { Info } from '@util/embedMessage';
import { PlayerMetadata } from "@customTypes/playerMetadata";

const updateQueueMessage = async (queue: GuildQueue<PlayerMetadata>, track: Track): Promise<void> => {
    if (track.extractor === null) return;

    queue.metadata.queueTitles = queue.tracks.data.map((track: Track): string => `[${ track.title } - ${ track.author }](${ track.url })`);
    queue.metadata.currentTrack = track;
    const embed: EmbedBuilder = new EmbedBuilder()
        .setDescription(`[${ track.title }](${ track.url })`)
        .setTitle('Now Playing')
        .setThumbnail(track.thumbnail)
        .addFields(
            queue.metadata.queueTitles.slice(0, 25).map((title: string, index: number) => ({
                name: `Song ${ index + 1 }`,
                value: title
            }))
        )
        .setFooter({
            text: `Requested by ${ track.requestedBy?.displayName }`,
            iconURL: track.requestedBy?.displayAvatarURL()
        });

    const replyOptions: MessageCreateOptions & MessageEditOptions = { embeds: [Info(embed.data)] };

    if (!queue.metadata.queueMessage) {
        queue.metadata.queueMessage = await queue.metadata.channel!.send(replyOptions);
    } else {
        await queue.metadata.queueMessage.edit(replyOptions);
    }
};

export { updateQueueMessage };
