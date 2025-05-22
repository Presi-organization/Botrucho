import {
  Channel,
  ChannelType,
  GuildMember,
  Message,
  MessageReaction,
  TextChannel,
  TextThreadChannel,
  ThreadChannel,
  User
} from 'discord.js';
import { EventExpiredError, EventNotFoundError, UserAlreadyRegisteredError } from '@/errors';
import { Botrucho, IAttendee, IEventAttendance } from '@/mongodb';
import { logger } from '@/utils';

export class AttendanceReactionHandler {
  private client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  fetchThreadById = async (threadId: string, channelId: string): Promise<ThreadChannel | null> => {
    try {
      const channel: Channel | null = await this.client.channels.fetch(channelId);

      if (channel?.isTextBased() && channel.type === ChannelType.GuildText) {
        const textChannel = channel as TextChannel;
        const thread: TextThreadChannel | null = await textChannel.threads.fetch(threadId);
        if (thread) return thread;
      }
      logger.error('Channel is not a valid text-based channel or thread not found.');
      return null;
    } catch (error) {
      logger.trace('Error fetching the thread:', error);
      return null;
    }
  };

  handleAttendanceReaction = async (reaction: MessageReaction, user: User) => {
    try {
      const guildMember = await reaction.message.guild?.members.fetch(user.id);
      if (!guildMember) {
        logger.error('Could not fetch guild member');
        return;
      }
      const member: GuildMember = guildMember;
      const nickname: string = member.displayName;
      const emojiMarkdown: string = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : (reaction.emoji.name ?? '');
      const msg: string = await this.client.eventAttendanceData.registerUserForEvent(
        reaction.message.id,
        emojiMarkdown,
        user.id,
        nickname
      );
      await reaction.users.remove(user.id);

      const attendance: IEventAttendance = await this.client.eventAttendanceData.getEventAttendance({ messageId: reaction.message.id });
      const thread: ThreadChannel<boolean> | null = await this.fetchThreadById(attendance.thread.threadId, reaction.message.channel.id);
      if (thread && attendance.thread.countMessageId) {
        const message: Message<true> = thread.messages.cache.get(attendance.thread.countMessageId) ||
          await thread.messages.fetch(attendance.thread.countMessageId);
        const reactionCounts: Partial<Record<string, IAttendee[]>> = Object.groupBy(attendance.attendees, ({ reaction }) => reaction[reaction.length - 1]);
        const counter: Record<string, number> = Object.fromEntries(
          Object.entries(reactionCounts).map(([reaction, attendees]) => [reaction, attendees?.length ?? 0])
        );
        const reactionString: string = Object.entries(counter)
          .map(([reaction, count]) => `${reaction} x${count}`)
          .join(' | ');
        await message.edit({
          content: `**${reactionString}**`
        });

        const attendeeMatch = attendance.attendees.find((attendee: IAttendee) => attendee.userId === user.id);
        if (!attendeeMatch) {
          logger.error('Attendee not found after registration');
          return;
        }
        const attendeeThread: string | undefined = attendeeMatch.threadMessageId;
        if (attendeeThread) {
          const threadMessage: Message<true> = thread.messages.cache.get(attendeeThread) || await thread.messages.fetch(attendeeThread);
          await threadMessage.edit(msg);
        } else {
          const usrThread: Message<true> = await thread.send(msg);
          attendeeMatch.threadMessageId = usrThread.id;
          await attendance.save();
        }
      }

      logger.log(`User ${nickname} registered for the event with emoji ${reaction.emoji.name} (${emojiMarkdown})`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        switch (error.constructor) {
          case EventNotFoundError:
            break;
          case UserAlreadyRegisteredError:
            await reaction.users.remove(user.id);
            break;
          case EventExpiredError:
            await reaction.message.delete();
            await reaction.message.thread?.delete();
            break;
          default:
            logger.error('Error handling messageReactionAdd: ', error);
            break;
        }
      }
    }
  };
}
