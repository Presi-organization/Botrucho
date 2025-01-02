import { GuildTextBasedChannel, Message } from 'discord.js';
import { Track } from "discord-player";

export interface PlayerMetadata {
    queueTitles: string[];
    currentTrack?: Track;
    queueMessage: Message | null;
    channel: GuildTextBasedChannel | null;
}
