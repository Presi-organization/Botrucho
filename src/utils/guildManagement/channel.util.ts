import { TextChannel } from 'discord.js';
import { Botrucho } from '@/mongodb';

export const changeChannelName = async (client: Botrucho, channelId: string, newName: string) => {
  const channel = await client.channels.fetch(channelId) as TextChannel | null;
  if (channel) {
    await channel.setName(newName, 'Channel name updated by bot');
  }
}

export const changeUserAlias = async (client: Botrucho, guildId: string, userId: string, newNickname: string) => {
  const guild = await client.guilds.fetch(guildId);
  if (guild) {
    const member = await guild.members.fetch(userId);
    if (member) {
      await member.setNickname(newNickname, 'Nickname updated by bot');
    }
  }
}
