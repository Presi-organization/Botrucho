import { EmbedBuilder } from 'discord.js';
import { GuildQueue } from 'discord-player';
import { Info } from '@util/embedMessage';
import { PlayerMetadata, Track } from "@customTypes/playerMetadata";

async function updateQueueMessage(queue: GuildQueue<PlayerMetadata>, track: Track): Promise<void> {
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

    if (!queue.metadata.queueMessage) {
        queue.metadata.queueMessage = await queue.metadata.channel.send(Info(embed.data));
    } else {
        queue.metadata.queueMessage.editReply(Info(embed.data));
    }
}

export { updateQueueMessage };
