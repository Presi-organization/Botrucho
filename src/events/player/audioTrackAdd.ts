import { GuildQueue, Track } from "discord-player";
import { updateQueueMessage } from "@util/embedUtils";
import Botrucho from "@mongodb/base/Botrucho";
import { IGuildData } from "@mongodb/models/GuildData";
import { PlayerMetadata } from "@customTypes/PlayerMetadata";
import { PlayerKeys, TranslationElement } from "@customTypes/Translations";

export async function execute(client: Botrucho, queue: GuildQueue<PlayerMetadata>): Promise<void> {
    console.log(`Added to queue **${ queue.tracks.data }**!`);
    queue.metadata.queueTitles = queue.tracks.data.map(track => `[${ track.title } - ${ track.author }](${ track.url })`);
    const track: Track | undefined = queue.metadata.currentTrack;
    const guildDB: IGuildData | null = await client.guildData.showGuild(queue.metadata.message.guild!.id);
    const langDB = guildDB?.lang || 'en';
    const playerTranslate: TranslationElement<PlayerKeys> = queue.metadata.message.translate("PLAYER", langDB);
    if (track) {
        await updateQueueMessage(queue, track, playerTranslate);
    }
}
