import { Snowflake } from 'discord-api-types/v10';
import { Collection, Message, TextChannel, TextThreadChannel, User } from 'discord.js';

import { AttendanceReactionHandler } from '@/events/discord/reactionHandlers';
import { Botrucho } from '@/mongodb';
import { ATTENDANCE_CHANNEL_ID } from '@/services/webhooks/ultimate-thread/constants';
import { logger } from '@/utils';

const handleReactions = async (client: Botrucho, message: Message<true>): Promise<void> => {
  const attendanceReactionHandler: AttendanceReactionHandler = new AttendanceReactionHandler(
    client,
  );
  for (const reaction of message.reactions.cache.values()) {
    const users: Collection<Snowflake, User> = await reaction.users.fetch();
    for (const user of users.values()) {
      if (user.id !== client.user?.id) {
        await attendanceReactionHandler.handle(reaction, user);
      }
    }
  }
};

const deleteNonBotMessages = async (
  client: Botrucho,
  channel: TextChannel,
  threadId: string,
): Promise<void> => {
  const thread: TextThreadChannel | null = await channel.threads.fetch(threadId);
  if (thread) {
    const messages: Collection<string, Message<true>> = await thread.messages.fetch();
    const nonBotMessages: Collection<string, Message<true>> = messages.filter(
      (message) => message.author.id !== client.user?.id,
    );

    for (const message of nonBotMessages.values()) await message.delete();
  }
};

/**
 * Clean unread attendance messages
 * @arg {Botrucho} client The Botrucho client
 * @return {Promise<void>} A promise that resolves when the operation is complete
 */
export const cleanUnreadAttendance = async (client: Botrucho): Promise<void> => {
  try {
    const {
      messageId,
      thread: { threadId },
    } = await client.eventAttendanceData.getEventAttendance({});
    const channel = (await client.channels.fetch(ATTENDANCE_CHANNEL_ID)) as TextChannel | null;
    if (channel?.isTextBased()) {
      const message: Message<true> = await channel.messages.fetch(messageId);

      await handleReactions(client, message);
      await deleteNonBotMessages(client, channel, threadId);
    }
  } catch (e) {
    logger.error('Error during client ready event:', e);
  }
};
