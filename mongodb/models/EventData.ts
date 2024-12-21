import mongoose, { Document, Schema } from 'mongoose';

export interface IEventData extends Document {
    serverID: string;
    messageID: string;
    eventName: string;
    calendarLink: string;
    userAssisting?: string[];
}

const eventDB = new Schema<IEventData>({
    serverID: { type: String, required: true },
    messageID: { type: String, required: true },
    eventName: { type: String, required: true },
    calendarLink: { type: String, required: true },
    userAssisting: { type: [String], required: false }
});

export default mongoose.model<IEventData>('EventData', eventDB);
