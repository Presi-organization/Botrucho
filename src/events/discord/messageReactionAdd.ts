import { MessageReaction, User } from 'discord.js';
import { AttendanceReactionHandler, EventHandler } from '@/events/discord/reactionHandlers';
import { Botrucho } from '@/mongodb';

export const execute = async (client: Botrucho, reaction: MessageReaction, user: User) => {
  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();

  if (user.bot) return;
  if (!reaction.message.guild) return;

  const attendanceReactionHandler: AttendanceReactionHandler = new AttendanceReactionHandler(client);
  const eventHandler: EventHandler = new EventHandler(client, reaction, user);

  await eventHandler.handleEventReaction();
  await attendanceReactionHandler.handleAttendanceReaction(reaction, user);
};
