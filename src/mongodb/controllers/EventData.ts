import { EventDataModel, IEventData } from '@/mongodb';

export class EventDataController {
  async showEvent(serverID: string, messageID: string): Promise<IEventData | null> {
    return EventDataModel.findOne({ serverID, messageID }).exec();
  }

  async addEvent(body: IEventData): Promise<IEventData> {
    const event = new EventDataModel(body);
    return event.save();
  }

  async addAssistance(eventID: string, userID: string): Promise<void> {
    const event = await EventDataModel.findById(eventID).exec();
    if (event) {
      if (!event.userAssisting) {
        event.userAssisting = [];
      }
      event.userAssisting.push(userID);
      await event.save();
    }
  }
}
