import { ChannelType, TextChannel } from 'discord.js';

import { Botrucho } from '@/mongodb';

export const changeChannelName = async (client: Botrucho, channelId: string, newName: string) => {
  const channel = (await client.channels.fetch(channelId)) as TextChannel | null;
  if (channel) {
    await channel.setName(newName, 'Channel name updated by bot');
  }
};

export const changeUserAlias = async (
  client: Botrucho,
  guildId: string,
  userId: string,
  newNickname: string,
) => {
  const guild = await client.guilds.fetch(guildId);
  if (guild) {
    const member = await guild.members.fetch(userId);
    if (member) {
      await member.setNickname(newNickname, 'Nickname updated by bot');
    }
  }
};

export const createTextChannel = async (
  client: Botrucho,
  guildId: string,
  categoryId: string,
  channelName: string,
) => {
  const guild = await client.guilds.fetch(guildId);
  const botId = client.user!.id;
  if (guild) {
    return guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      topic: 'Daily football fixtures and results. React to support your team!',
      reason: 'Created for daily football posts',
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: ['ViewChannel', 'ReadMessageHistory', 'AddReactions'],
          deny: [
            'SendMessages',
            'SendMessagesInThreads',
            'CreatePublicThreads',
            'CreatePrivateThreads',
            'UseApplicationCommands',
          ],
        },
        {
          id: botId,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles'],
        },
      ],
    });
  }
};

export const changeOrderChannels = async (
  client: Botrucho,
  guildId: string,
  channelOrder: string[],
) => {
  const guild = await client.guilds.fetch(guildId);
  if (guild) {
    await guild.channels.setPositions(
      channelOrder.map((channelId, index) => ({
        channel: channelId,
        position: index,
      })),
    );
  }
};
