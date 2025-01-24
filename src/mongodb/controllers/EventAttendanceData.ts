import EventAttendanceData, { IEventAttendance, IAttendee } from "@mongodb/models/EventAttendanceData";
import { EventNotFoundError } from "@errors/EventNotFoundError";
import { EventAlreadyExistsError } from "@errors/EventAlreadyExistsError";
import { EventExpiredError } from "@errors/EventExpiredError";
import { UserAlreadyRegisteredError } from "@errors/UserAlreadyRegisteredError";

class AttendanceDataController {
    async getEventAttendance(filter: { messageId?: string; threadId?: string }): Promise<IEventAttendance> {
        const event: IEventAttendance | null = await EventAttendanceData.findOne(filter);
        if (!event) throw new EventNotFoundError('Event not found');
        if (event.expirationDate <= new Date()) throw new EventExpiredError('Event expired');
        return event;
    }

    async getAttendees(messageId: string): Promise<IAttendee[]> {
        const event = await EventAttendanceData.findOne({ messageId });
        if (!event) throw new EventNotFoundError('Event not found');
        if (event.expirationDate <= new Date()) throw new EventExpiredError('Event expired');
        return event.attendees;
    }

    async createEvent(messageId: string, threadId: string, eventDate: Date, expirationDate: Date): Promise<void> {
        const existingEvent = await EventAttendanceData.findOne({ eventDate });
        if (existingEvent) {
            throw new EventAlreadyExistsError('An event already exists on this date');
        }

        const event = new EventAttendanceData({
            messageId,
            threadId,
            eventDate,
            expirationDate,
            attendees: []
        });
        await event.save();
    }

    async registerUserForEvent(messageId: string, reactionEmoji: string, userId: string, username: string): Promise<void> {
        const event = await EventAttendanceData.findOne({ messageId });
        if (!event) throw new EventNotFoundError('Event not found');
        if (event.expirationDate <= new Date()) throw new EventExpiredError('Event expired');

        const userAlreadyRegistered = event.attendees.some(attendee => attendee.userId === userId);
        if (userAlreadyRegistered) {
            throw new UserAlreadyRegisteredError('You are already registered for this event');
        }

        event.attendees.push({ userId, username, reaction: reactionEmoji });
        await event.save();
    }

    async removeAttendance(messageId: string): Promise<void> {
        await EventAttendanceData.deleteOne({ messageId });
    }
}

export default AttendanceDataController;
