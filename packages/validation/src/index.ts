import { z } from 'zod';

// ==========================================
// 1. Auth Schemas
// ==========================================
export const StaffLoginSchema = z.object({
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian 10-digit mobile number'),
  pin: z.string().min(4).max(6, 'PIN must be 4 to 6 digits'),
  role: z.enum(['SHOPKEEPER', 'DELIVERY_EXECUTIVE', 'SYSTEM_ADMIN']),
});

// ==========================================
// 2. Address & Geo Schemas
// ==========================================
export const AddressSchema = z.object({
  tag: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  recipientName: z.string().min(2, 'Name is required'),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit phone required'),
  flatPlotNumber: z.string().min(1, 'Flat/House number is required'),
  apartmentName: z.string().optional(),
  streetName: z.string().min(3, 'Street name is required'),
  landmark: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid 6-digit Indian pincode'),
  city: z.string().min(2).default('Bengaluru'),
  gateSecurityInstructions: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().default(false),
});

// ==========================================
// 3. Product & Inventory Schemas
// ==========================================
export const UpdateProductStockSchema = z.object({
  productId: z.string().min(1, 'Product ID required'),
  depotId: z.string().min(1, 'Depot ID required'),
  adjustmentQty: z.number().int('Stock adjustment must be an integer'),
  reason: z.enum(['NEW_BATCH_INWARD', 'BREAKAGE_LOSS', 'MANUAL_CORRECTION']),
  batchNote: z.string().optional(),
});

export const UpdateProductPriceSchema = z.object({
  productId: z.string().min(1, 'Product ID required'),
  unitPricing: z.array(
    z.object({
      unit: z.enum(['SINGLE', 'DOZEN', 'TRAY_30']),
      unitQty: z.number().positive(),
      price: z.number().positive('Price must be greater than zero'),
    })
  ).min(1, 'At least one pricing tier required'),
});

// ==========================================
// 4. Order & Checkout Schemas
// ==========================================
export const OrderItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID required'),
  unit: z.enum(['SINGLE', 'DOZEN', 'TRAY_30']),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const CreateOrderSchema = z.object({
  deliveryAddress: AddressSchema,
  deliverySlot: z.enum(['MORNING_RUSH', 'EVENING_DROP']),
  scheduledDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'UPI_ON_DELIVERY']),
  items: z.array(OrderItemInputSchema).min(1, 'Order must contain at least one item'),
  morningHarvestNotes: z.string().max(200).optional(),
});

// ==========================================
// 5. Doorstep Zero-Crack Refinements
// ==========================================
export const AdjustBrokenEggsSchema = z.object({
  orderId: z.string().min(1, 'Order ID required'),
  brokenEggsCount: z.number().int().min(0, 'Broken count cannot be negative'),
  resolutionType: z.enum(['BUFFER_REPLACED', 'PRICE_DISCOUNTED']),
  note: z.string().optional(),
});

export const DoorstepPaymentCollectSchema = z.object({
  orderId: z.string().min(1, 'Order ID required'),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'UPI_ON_DELIVERY']),
  amountCollected: z.number().positive('Collected amount must be positive'),
  upiTransactionRef: z.string().optional(),
  inspectionPassed: z.boolean().refine((val) => val === true, {
    message: 'Doorstep zero-crack inspection confirmation required',
  }),
});

// ==========================================
// 6. Shift Reconciliation Schemas
// ==========================================
export const CloseShiftReconciliationSchema = z.object({
  depotId: z.string().min(1, 'Depot ID required'),
  deliveryPersonId: z.string().min(1, 'Delivery person ID required'),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  physicalCashDeposited: z.number().min(0, 'Physical cash deposited cannot be negative'),
  managerNotes: z.string().optional(),
});

// ==========================================
// 7. Order Lifecycle Schemas
// ==========================================
/**
 * Cancelling an order. The reason is optional but strongly encouraged — it
 * is shown to the shop and, for a delivered order, is the note the owner
 * reads when deciding how to action the refund.
 */
export const CancelOrderSchema = z.object({
  reason: z.string().max(300, 'Cancellation reason is too long').optional(),
});

/**
 * Confirming a PLACED order. Takes no body — the stock lock happens
 * server-side from the order's own line items.
 */
export const ConfirmOrderSchema = z.object({}).passthrough();

/**
 * Moving an order into PACKING or READY_FOR_DELIVERY. An optional note lets
 * the shopkeeper record what happened (e.g. "2 trays short, replenished").
 */
export const PackingTransitionSchema = z.object({
  note: z.string().max(300, 'Note is too long').optional(),
});
