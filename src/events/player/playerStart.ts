import { GuildQueue, Track } from "discord-player";
import Botrucho from "@mongodb/base/Botrucho";
import { updateQueueMessage } from "@util/embedUtils";
import { PlayerMetadata } from "@customTypes/playerMetadata";

export async function execute(_: Botrucho, queue: GuildQueue<PlayerMetadata>, track: Track): Promise<void> {
    console.log(`Started playing **${ track.title }**!`);
    await updateQueueMessage(queue, track);
}
