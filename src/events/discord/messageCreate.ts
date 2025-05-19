import { Message } from "discord.js";
import Botrucho from "@mongodb/base/Botrucho";
import { logger } from '@util/Logger';

export async function execute(client: Botrucho, message: Message) {
  if (message.author.bot) return;

  try {
    if (message.channel.isThread()) {
      const threadId: string = message.channel.id;
      await client.eventAttendanceData.getEventAttendance({ "thread.threadId": threadId });
      await message.delete();
      logger.log(`Deleted message from thread ${threadId}`);
    }
  } catch (error) {
    logger.error('Error in messageCreate event: ', error);
  }
}
