import { MessageReaction, User } from 'discord.js';

export interface ReactionHandlerInterface {
  handle(reaction: MessageReaction, user: User): Promise<void>;
}
