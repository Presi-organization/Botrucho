import { TextChannel } from 'discord.js';
import { Botrucho } from '@/mongodb';

export const changeChannelName = async (client: Botrucho, channelId: string, newName: string) => {
  const channel = await client.channels.fetch(channelId) as TextChannel | null;
  if (channel) {
    await channel.setName(newName, 'Channel name updated by bot');
  }
}
