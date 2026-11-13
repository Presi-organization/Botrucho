import { Message } from 'discord.js';

import { handleAiMention } from '@/events/discord/messageHandlers/ai-mention.handler';
import { Botrucho } from '@/mongodb';
import { logger } from '@/utils';

export async function execute(client: Botrucho, message: Message) {
  if (message.author.bot) return;

  try {
    if (message.channel.isThread()) {
      const threadId: string = message.channel.id;
      await client.eventAttendanceData.getEventAttendance({ 'thread.threadId': threadId });
      await message.delete();
      logger.log(`Deleted message from thread ${threadId}`);
      return;
    }
  } catch (error) {
    logger.error('Error in messageCreate event: ', error);
  }

  try {
    await handleAiMention(client, message);
  } catch (error) {
    logger.error('Error handling AI mention: ', error);
  }
}
