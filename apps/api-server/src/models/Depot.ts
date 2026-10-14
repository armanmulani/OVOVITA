import mongoose, { Document, Schema } from 'mongoose';

export interface IDepotDoc extends Document {
  code: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  address: string;
  servicedPincodes: string[];
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  isActive: boolean;
  openingTime: string;
  closingTime: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepotSchema = new Schema<IDepotDoc>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true },
    contactPhone: { type: String, required: true },
    address: { type: String, required: true },
    servicedPincodes: [{ type: String, index: true }],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    isActive: { type: Boolean, default: true, index: true },
    openingTime: { type: String, default: '05:30' },
    closingTime: { type: String, default: '21:00' },
  },
  { timestamps: true }
);

DepotSchema.index({ location: '2dsphere' });

export const Depot = mongoose.model<IDepotDoc>('Depot', DepotSchema);
