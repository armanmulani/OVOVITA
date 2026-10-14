import mongoose, { Document, Schema } from 'mongoose';

export interface IUnitPriceDoc {
  unit: 'SINGLE' | 'DOZEN' | 'TRAY_30';
  unitQty: number;
  label: string;
  price: number;
  savingsPercent?: number;
  isPopular?: boolean;
}

export interface IProductDoc extends Document {
  name: string;
  type: 'WHITE' | 'BROWN' | 'DESI' | 'ORGANIC' | 'KADAKNATH';
  description: string;
  heroImageUrl: string;
  farmOriginName: string;
  laidTimestampText: string;
  isCandlingPassed: boolean;
  unitPricing: IUnitPriceDoc[];
  currentStock: number; // In individual egg count
  lowStockThreshold: number; // default: 100
  isLowStockAlertSent: boolean;
  status: 'ACTIVE' | 'DISABLED';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UnitPriceSchema = new Schema<IUnitPriceDoc>(
  {
    unit: { type: String, enum: ['SINGLE', 'DOZEN', 'TRAY_30'], required: true },
    unitQty: { type: Number, required: true },
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    savingsPercent: { type: Number, default: 0 },
    isPopular: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProductDoc>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['WHITE', 'BROWN', 'DESI', 'ORGANIC', 'KADAKNATH'],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    heroImageUrl: { type: String, required: true },
    farmOriginName: { type: String, required: true },
    laidTimestampText: { type: String, default: 'Laid at sunrise today' },
    isCandlingPassed: { type: Boolean, default: true },
    unitPricing: [UnitPriceSchema],
    currentStock: { type: Number, required: true, default: 0, index: true },
    lowStockThreshold: { type: Number, default: 100 },
    isLowStockAlertSent: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE', index: true },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProductDoc>('Product', ProductSchema);
