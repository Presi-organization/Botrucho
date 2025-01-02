import { CommandInteraction } from "discord.js";
import { useQueue, GuildQueue, Track } from "discord-player";
import { SlashCommandBuilder } from "@discordjs/builders";
import { IGuildData } from "@mongodb/models/GuildData";
import { PlayerMetadata, Track as CTrack } from "@customTypes/playerMetadata";
import { updateQueueMessage } from "@util/embedUtils";
import Botrucho from "@mongodb/base/Botrucho";

export const name = 'shuffle';
export const description = 'Shuffles the current queue';
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffles the current music queue.');

export async function execute(interaction: CommandInteraction & { client: Botrucho }, _: IGuildData) {
    const queue: GuildQueue<PlayerMetadata> | null = useQueue();
    if (!queue || !queue.isPlaying()) {
        return interaction.reply('There is no music playing!');
    }
    const tracksArray = queue.tracks.toArray() as Track[];
    queue.tracks.clear();
    shuffleArray(tracksArray).forEach(track => queue.tracks.add(track));
    await interaction.reply('The queue has been shuffled!');
    await updateQueueMessage(queue, queue?.currentTrack as CTrack);
    interaction.client.deleted_messages.add(interaction);
}

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1) * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
