import { TextChannel } from 'discord.js';
import { Botrucho } from '@/mongodb';

export const deleteMessagesFromChannel = async (client: Botrucho, channelId: string) => {
  const channel = await client.channels.fetch(channelId) as TextChannel | null;
  if (channel) {
    const messages = await channel.messages.fetch({ limit: 100 });
    await Promise.all(Array.from(messages.values()).map(message => message.delete()));
  }
}
