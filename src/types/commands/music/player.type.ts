import { Track } from 'discord-player';
import { BaseInteraction, GuildTextBasedChannel, Message } from 'discord.js';

export interface PlayerType {
  queueTitles: string[];
  currentTrack?: Track;
  queueMessage: Message | null;
  channel: GuildTextBasedChannel | null;
  message: BaseInteraction;
}
