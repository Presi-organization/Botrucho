import { MessageReaction, User } from 'discord.js';

import { ReactionHandlerInterface } from '@/events/discord/reactionHandlers';
import { Botrucho } from '@/mongodb';
import { registerAttendanceReaction } from '@/services/attendance/attendance-registration';

export class AttendanceReactionHandler implements ReactionHandlerInterface {
  private client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  handle = (reaction: MessageReaction, user: User): Promise<void> =>
    registerAttendanceReaction(this.client, reaction, user);
}
