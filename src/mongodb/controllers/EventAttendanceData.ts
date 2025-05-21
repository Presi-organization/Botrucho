import { EventNotFoundError } from "@/errors/EventNotFoundError";
import { EventAlreadyExistsError } from "@/errors/EventAlreadyExistsError";
import { EventExpiredError } from "@/errors/EventExpiredError";
import { UserAlreadyRegisteredError } from "@/errors/UserAlreadyRegisteredError";
import EventAttendanceData, { IAttendee, IEventAttendance, IThread } from "@/mongodb/models/EventAttendanceData";

class AttendanceDataController {
  async getEventAttendance(filter: { messageId?: string; "thread.threadId"?: string }): Promise<IEventAttendance> {
    const event: IEventAttendance | null = await EventAttendanceData.findOne(filter).sort({ eventDate: -1 });
    if (!event) throw new EventNotFoundError('Event not found');
    if (event.expirationDate <= new Date()) throw new EventExpiredError('Event expired');
    return event;
  }

  async getAttendees(messageId: string): Promise<IAttendee[]> {
    const event: IEventAttendance | null = await EventAttendanceData.findOne({ messageId });
    if (!event) throw new EventNotFoundError('Event not found');
    if (event.expirationDate <= new Date()) throw new EventExpiredError('Event expired');
    return event.attendees;
  }

  async createEvent(messageId: string, thread: IThread, eventDate: Date, expirationDate: Date): Promise<IEventAttendance> {
    const existingEvent: IEventAttendance | null = await EventAttendanceData.findOne({ eventDate });
    if (existingEvent) {
      throw new EventAlreadyExistsError('An event already exists on this date');
    }

    const event = new EventAttendanceData({
      messageId,
      thread,
      eventDate,
      expirationDate,
      attendees: []
    });
    return event.save();
  }

  async registerUserForEvent(messageId: string, reactionEmoji: string, userId: string, username: string): Promise<string> {
    const event: IEventAttendance | null = await EventAttendanceData.findOne({ messageId }).sort({ eventDate: -1 });
    if (!event) throw new EventNotFoundError('Event not found');
    if (event.expirationDate <= new Date()) throw new EventExpiredError('Event expired');

    const attendee: IAttendee | undefined = event.attendees.find((attendee: IAttendee) => attendee.userId === userId);
    if (attendee) {
      const oldReaction: string[] = attendee.reaction;
      if (oldReaction.at(-1) !== reactionEmoji) {
        attendee.reaction.push(reactionEmoji);
        await event.save();
        const reactionHistory: string = oldReaction.map((reaction: string) => `(${reaction})`).join(' -> ');
        return `${username} ${reactionHistory}`;
      } else {
        throw new UserAlreadyRegisteredError('You are already registered for this event');
      }
    }

    event.attendees.push({ userId, username, reaction: [reactionEmoji] });
    await event.save();
    return `${username} (${reactionEmoji})`;
  }

  async removeAttendance(messageId: string): Promise<void> {
    await EventAttendanceData.deleteOne({ messageId });
  }
}

export default AttendanceDataController;
