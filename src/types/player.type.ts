import { BaseInteraction, GuildTextBasedChannel, Message } from 'discord.js';
import { Track } from 'discord-player';

export interface PlayerType {
  queueTitles: string[];
  currentTrack?: Track;
  queueMessage: Message | null;
  channel: GuildTextBasedChannel | null;
  message: BaseInteraction;
}
