import { MessageReaction, User } from 'discord.js';
import { AttendanceReactionHandler, EventHandler, ReactionHandlerInterface } from '@/events/discord/reactionHandlers';
import { Botrucho } from '@/mongodb';

export const execute = async (client: Botrucho, reaction: MessageReaction, user: User) => {
  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();

  if (user.bot) return;
  if (!reaction.message.guild) return;

  const handlers: ReactionHandlerInterface[] = [
    new EventHandler(client, reaction, user),
    new AttendanceReactionHandler(client)
  ];

  for (const handler of handlers) {
    await handler.handle(reaction, user);
  }
};
