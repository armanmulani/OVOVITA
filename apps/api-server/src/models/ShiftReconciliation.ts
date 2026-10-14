import mongoose, { Document, Schema } from 'mongoose';

export interface IShiftReconciliationDoc extends Document {
  depotId: mongoose.Types.ObjectId;
  deliveryPersonId: mongoose.Types.ObjectId;
  deliveryPersonName: string;
  shiftDate: string;
  ordersDeliveredCount: number;
  expectedCashAmount: number;
  physicalCashDeposited: number;
  upiTotalAmount: number;
  brokenEggsTotalDeduction: number;
  varianceAmount: number;
  managerApprovalId?: mongoose.Types.ObjectId;
  managerNotes?: string;
  status: 'PENDING' | 'BALANCED' | 'DISCREPANCY';
  createdAt: Date;
  updatedAt: Date;
}

const ShiftReconciliationSchema = new Schema<IShiftReconciliationDoc>(
  {
    depotId: { type: Schema.Types.ObjectId, ref: 'Depot', required: true, index: true },
    deliveryPersonId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deliveryPersonName: { type: String, required: true },
    shiftDate: { type: String, required: true, index: true },
    ordersDeliveredCount: { type: Number, default: 0 },
    expectedCashAmount: { type: Number, default: 0 },
    physicalCashDeposited: { type: Number, default: 0 },
    upiTotalAmount: { type: Number, default: 0 },
    brokenEggsTotalDeduction: { type: Number, default: 0 },
    varianceAmount: { type: Number, default: 0 },
    managerApprovalId: { type: Schema.Types.ObjectId, ref: 'User' },
    managerNotes: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'BALANCED', 'DISCREPANCY'],
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: true }
);

export const ShiftReconciliation = mongoose.model<IShiftReconciliationDoc>(
  'ShiftReconciliation',
  ShiftReconciliationSchema
);
