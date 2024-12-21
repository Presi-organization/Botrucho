import EventData, { IEventData } from '../models/EventData';

class EventDataController {
    async showEvent(serverID: string, messageID: string): Promise<IEventData | null> {
        return EventData.findOne({ serverID, messageID }).exec();
    }

    async addEvent(body: IEventData): Promise<IEventData> {
        const event = new EventData(body);
        return event.save();
    }

    async addAssistance(eventID: string, userID: string): Promise<void> {
        const event = await EventData.findById(eventID).exec();
        if (event) {
            if (!event.userAssisting) {
                event.userAssisting = [];
            }
            event.userAssisting.push(userID);
            await event.save();
        }
    }
}

export default EventDataController;
