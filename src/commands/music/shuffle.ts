import { CommandInteraction } from "discord.js";
import { useQueue, Track, GuildQueue } from "discord-player";
import { SlashCommandBuilder } from "@discordjs/builders";
import { IGuildData } from "@mongodb/models/GuildData";
import { PlayerMetadata } from "@customTypes/playerMetadata";

module.exports = {
    name: 'shuffle',
    description: 'Shuffles the current queue',
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffles the current music queue.'),
    async execute(interaction: CommandInteraction, guildDB: IGuildData) {
        const queue: GuildQueue<PlayerMetadata> | null = useQueue();
        if (!queue || !queue.isPlaying()) {
            return interaction.reply('There is no music playing!');
        }

        const tracksArray = queue.tracks.toArray() as Track[];
        queue.tracks.clear();
        shuffleArray(tracksArray).forEach(track => queue.tracks.add(track));

        const channel = interaction!.channel

        if (channel?.isSendable()) {
            await channel?.sendTyping()
        }

        await interaction.reply('The queue has been shuffled!');
    }
};

function shuffleArray<T>(array: T[]): T[] {
    for (let i: number = array.length - 1; i > 0; i--) {
        const j: number = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
