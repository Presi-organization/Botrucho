import { model, Schema } from 'mongoose';

interface IInstanceLease {
  _id: string;
  owner: string;
  expiresAt: Date;
}

// Acquisition checks expiry itself; TTL is only eventual garbage collection.
const schema = new Schema<IInstanceLease>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { versionKey: false },
);

export const InstanceLeaseModel = model<IInstanceLease>('InstanceLease', schema);
