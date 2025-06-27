import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendee {
  userId: string;
  username: string;
  reaction: string[];
  threadMessageId?: string;
}

export interface IEventAttendance extends Document {
  messageId: string;
  thread: IThread;
  eventDate: Date;
  expirationDate: Date;
  attendees: IAttendee[];
}

export interface IThread {
  threadId: string;
  countMessageId?: string;
}

const eventAttendanceSchema = new Schema<IEventAttendance>({
  messageId: { type: String, required: true, index: true },
  thread: {
    threadId: { type: String, required: true, index: true },
    countMessageId: { type: String, required: false }
  },
  eventDate: { type: Date, default: Date.now },
  expirationDate: {
    type: Date,
    required: true,
    expires: 30 * 24 * 60 * 60
  },
  attendees: [{
    userId: { type: String, required: true },
    username: { type: String, required: true },
    reaction: [{ type: String, required: true }],
    threadMessageId: { type: String, required: false }
  }],
}, {
  timestamps: true
});

eventAttendanceSchema.index({ messageId: 1, 'thread.threadId': 1 }, { unique: true });

export const EventAttendanceDataModel = mongoose.model<IEventAttendance>('EventAttendanceData', eventAttendanceSchema);
