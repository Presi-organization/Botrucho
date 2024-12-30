import { GuildQueue } from "discord-player";
import { updateQueueMessage } from "@util/embedUtils";
import Botrucho from "@mongodb/base/Botrucho";
import { PlayerMetadata, Track } from "@customTypes/playerMetadata";

export async function execute(_: Botrucho, queue: GuildQueue<PlayerMetadata>): Promise<void> {
    console.log(`Added to queue **${ queue.tracks.data }**!`);
    queue.metadata.queueTitles = queue.tracks.data.map(track => `[${ track.title } - ${ track.author }](${ track.url })`);
    const track: Track | undefined = queue.metadata.currentTrack;
    if (track) {
        await updateQueueMessage(queue, track);
    }
}
