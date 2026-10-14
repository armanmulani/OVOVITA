import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItemDoc {
  productId: mongoose.Types.ObjectId;
  productName: string; // Frozen
  eggType: string;
  unit: 'SINGLE' | 'DOZEN' | 'TRAY_30';
  unitQty: number;
  quantity: number;
  totalEggsCount: number;
  priceAtPurchase: number; // Frozen
  lineTotal: number;
}

export interface IOrderStatusTimelineDoc {
  status: string;
  timestamp: Date;
  updatedByUserId?: mongoose.Types.ObjectId;
  note?: string;
}

export interface IOrderDoc extends Document {
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  depotId: mongoose.Types.ObjectId;
  items: IOrderItemDoc[];
  subtotal: number;
  deliveryCharge: number;
  packagingCharge: number;
  totalAmount: number;
  brokenEggsAdjusted: number;
  brokenEggsDeductionAmount: number;
  finalPayableAmount: number;
  deliveryAddress: Record<string, any>;
  deliverySlot: 'MORNING_RUSH' | 'EVENING_DROP';
  scheduledDeliveryDate: string;
  paymentMethod: 'CASH_ON_DELIVERY' | 'UPI_ON_DELIVERY';
  paymentStatus: 'PENDING' | 'COLLECTED' | 'RECONCILED';
  podCollectedAmount?: number;
  upiTransactionRef?: string;
  status:
    | 'PLACED'
    | 'CONFIRMED'
    | 'PACKING'
    | 'READY_FOR_DELIVERY'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED';
  assignedDeliveryPersonId?: mongoose.Types.ObjectId;
  assignedDeliveryPersonName?: string;
  assignedDeliveryPersonPhone?: string;
  vehiclePlateNumber?: string;
  estimatedDeliveryTime?: string;
  statusTimeline: IOrderStatusTimelineDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItemDoc>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    eggType: { type: String, required: true },
    unit: { type: String, enum: ['SINGLE', 'DOZEN', 'TRAY_30'], required: true },
    unitQty: { type: Number, required: true },
    quantity: { type: Number, required: true },
    totalEggsCount: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderStatusTimelineSchema = new Schema<IOrderStatusTimelineDoc>(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrderDoc>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    depotId: { type: Schema.Types.ObjectId, ref: 'Depot', required: true, index: true },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    packagingCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    brokenEggsAdjusted: { type: Number, default: 0 },
    brokenEggsDeductionAmount: { type: Number, default: 0 },
    finalPayableAmount: { type: Number, required: true },
    deliveryAddress: { type: Schema.Types.Mixed, required: true },
    deliverySlot: { type: String, enum: ['MORNING_RUSH', 'EVENING_DROP'], default: 'MORNING_RUSH' },
    scheduledDeliveryDate: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ['CASH_ON_DELIVERY', 'UPI_ON_DELIVERY'],
      default: 'CASH_ON_DELIVERY',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COLLECTED', 'RECONCILED'],
      default: 'PENDING',
      index: true,
    },
    podCollectedAmount: { type: Number },
    upiTransactionRef: { type: String },
    status: {
      type: String,
      enum: [
        'PLACED',
        'CONFIRMED',
        'PACKING',
        'READY_FOR_DELIVERY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'PLACED',
      index: true,
    },
    assignedDeliveryPersonId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedDeliveryPersonName: { type: String },
    assignedDeliveryPersonPhone: { type: String },
    vehiclePlateNumber: { type: String },
    estimatedDeliveryTime: { type: String },
    statusTimeline: [OrderStatusTimelineSchema],
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrderDoc>('Order', OrderSchema);
