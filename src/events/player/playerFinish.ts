import { promises as fs } from "node:fs";
import { unlinkSync } from "node:fs";
import { join } from "path";
import { GuildQueue } from "discord-player";
import Botrucho from "@mongodb/base/Botrucho";
import { PlayerMetadata, Track } from "@customTypes/playerMetadata";

export async function execute(_: Botrucho, queue: GuildQueue<PlayerMetadata>, track: Track): Promise<void> {
    if (queue.metadata.queueTitles.length === 0) {
        if (queue.metadata.queueMessage) {
            queue.metadata.queueMessage.delete();
            queue.metadata.queueMessage = null;
            queue.metadata.currentTrack = {} as Track;
        }
    }
    const audioFile: string = join(process.cwd(), "/discord/commands/say/voice_speech.wav");
    fs.access(audioFile)
        .then((): void => {
            unlinkSync(audioFile);
        })
        .catch((error: any): void => {
            if (error.code !== 'ENOENT') {
                console.error("An error occurred:", error);
            }
        });
}
