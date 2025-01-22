import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendee {
    userId: string;
    username: string;
    reaction: string;
}

export interface IEventAttendance extends Document {
    messageId: string;
    threadId: string;
    eventDate: Date;
    expirationDate: Date;
    attendees: IAttendee[];
}

const eventAttendanceSchema = new Schema<IEventAttendance>({
    messageId: { type: String, required: true, index: true },
    threadId: { type: String, required: true, index: true },
    eventDate: { type: Date, default: Date.now },
    expirationDate: {
        type: Date,
        required: true,
        expires: 0
    },
    attendees: [{
        userId: { type: String, required: true },
        username: { type: String, required: true },
        reaction: { type: String, required: true }
    }],
}, {
    timestamps: true
});

eventAttendanceSchema.index({ messageId: 1, threadId: 1 }, { unique: true });

export default mongoose.model<IEventAttendance>('EventAttendanceData', eventAttendanceSchema);
