import { GuildTextBasedChannel, Message, User } from 'discord.js';

export interface PlayerMetadata {
    queueTitles: string[];
    currentTrack?: Track;
    queueMessage: Message | null;
    channel: GuildTextBasedChannel | null;
    isRaw: boolean;
}

export interface Track {
    title: string;
    author: string;
    url: string;
    thumbnail: string;
    requestedBy?: User | null;
}
