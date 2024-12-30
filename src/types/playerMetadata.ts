import { User } from 'discord.js';

export interface PlayerMetadata {
    queueTitles: string[];
    currentTrack?: Track;
    queueMessage: any;
    channel: any;
}

export interface Track {
    title: string;
    author: string;
    url: string;
    thumbnail: string;
    requestedBy?: User | null;
}
