import mongoose, { Document, Schema } from 'mongoose';

export interface IUserAddressDoc {
  id: string;
  tag: 'HOME' | 'WORK' | 'OTHER';
  recipientName: string;
  phoneNumber: string;
  flatPlotNumber: string;
  apartmentName?: string;
  streetName: string;
  landmark?: string;
  pincode: string;
  city: string;
  gateSecurityInstructions?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

export interface IUserDoc extends Document {
  name: string;
  phoneNumber: string;
  email?: string;
  role: 'CUSTOMER' | 'SHOPKEEPER' | 'DELIVERY_EXECUTIVE' | 'SYSTEM_ADMIN';
  pinHash?: string; // For staff logins
  avatarUrl?: string;
  depotId?: mongoose.Types.ObjectId;
  savedAddresses: IUserAddressDoc[];
  isMorningReminderEnabled: boolean;
  totalOrdersCount: number;
  zeroCrackRating: number;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSubSchema = new Schema<IUserAddressDoc>({
  id: { type: String },
  tag: { type: String, enum: ['HOME', 'WORK', 'OTHER'], default: 'HOME' },
  recipientName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  flatPlotNumber: { type: String, required: true },
  apartmentName: { type: String },
  streetName: { type: String, required: true },
  landmark: { type: String },
  pincode: { type: String, required: true, index: true },
  city: { type: String, default: 'Bengaluru' },
  gateSecurityInstructions: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUserDoc>(
  {
    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, unique: true, index: true, trim: true },
    email: { type: String, trim: true },
    role: {
      type: String,
      enum: ['CUSTOMER', 'SHOPKEEPER', 'DELIVERY_EXECUTIVE', 'SYSTEM_ADMIN'],
      default: 'CUSTOMER',
      index: true,
    },
    pinHash: { type: String },
    avatarUrl: { type: String },
    depotId: { type: Schema.Types.ObjectId, ref: 'Depot' },
    savedAddresses: [AddressSubSchema],
    isMorningReminderEnabled: { type: Boolean, default: true },
    totalOrdersCount: { type: Number, default: 0 },
    zeroCrackRating: { type: Number, default: 5.0 },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUserDoc>('User', UserSchema);
