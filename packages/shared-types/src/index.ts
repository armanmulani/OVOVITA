/**
 * Ovovita Shared Type Definitions
 * Source of Truth across API Server, Admin Web Portal, and Mobile Apps
 */

// ==========================================
// 1. User & Authentication Types
// ==========================================
export type UserRole = 'CUSTOMER' | 'SHOPKEEPER' | 'DELIVERY_EXECUTIVE' | 'SYSTEM_ADMIN';

export interface IUserAddress {
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

export interface IUser {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  depotId?: string; // Assigned depot hub for shopkeepers & delivery drivers
  savedAddresses: IUserAddress[];
  isMorningReminderEnabled: boolean;
  totalOrdersCount: number;
  zeroCrackRating: number;
  createdAt: string;
  updatedAt: string;
}

export interface IAuthSession {
  user: IUser;
  accessToken: string;
  refreshToken?: string;
}

// ==========================================
// 2. Depot Hub Types
// ==========================================
export interface IDepot {
  id: string;
  code: string; // e.g. "KOR-DEPOT-01"
  name: string; // e.g. "Koramangala Central Depot"
  contactPerson: string;
  contactPhone: string;
  address: string;
  servicedPincodes: string[]; // e.g. ["560034", "560095", "560068"]
  coordinates: {
    latitude: number;
    longitude: number;
  };
  isActive: boolean;
  openingTime: string; // "05:30"
  closingTime: string; // "21:00"
}

// ==========================================
// 3. Product & Inventory Types
// ==========================================
export type EggType = 'WHITE' | 'BROWN' | 'DESI' | 'ORGANIC' | 'KADAKNATH';
export type PackagingUnit = 'SINGLE' | 'DOZEN' | 'TRAY_30';

export interface IUnitPrice {
  unit: PackagingUnit;
  unitQty: number; // e.g. 1, 12, 30
  label: string; // e.g. "Single Egg", "12-Egg Dozen", "30-Egg Farm Tray"
  price: number; // Price in INR (e.g. 7.00, 80.00, 195.00)
  savingsPercent?: number; // e.g. 7% savings
  isPopular?: boolean;
}

export interface IProduct {
  id: string;
  name: string;
  type: EggType;
  description: string;
  heroImageUrl: string;
  farmOriginName: string;
  laidTimestampText: string; // e.g. "Laid at sunrise today (06:00 AM)"
  isCandlingPassed: boolean;
  unitPricing: IUnitPrice[];
  currentStock: number; // In individual egg count
  lowStockThreshold: number; // Default 100
  isLowStockAlertSent: boolean;
  status: 'ACTIVE' | 'DISABLED';
  tags: string[]; // ["Free-Range", "Zero-Antibiotics", "Rich Yolk"]
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. Order & Pay-on-Delivery Types
// ==========================================
export type DeliverySlot = 'MORNING_RUSH' | 'EVENING_DROP';

export type PaymentMethod = 'CASH_ON_DELIVERY' | 'UPI_ON_DELIVERY';
export type PaymentStatus = 'PENDING' | 'COLLECTED' | 'RECONCILED';

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PACKING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface IOrderItem {
  productId: string;
  productName: string; // Frozen snapshot
  eggType: EggType;
  unit: PackagingUnit;
  unitQty: number;
  quantity: number; // Quantity of unit packs
  totalEggsCount: number; // quantity * unitQty
  priceAtPurchase: number; // Frozen price per pack
  lineTotal: number;
}

export interface IOrderStatusTimeline {
  status: OrderStatus;
  timestamp: string;
  updatedByUserId?: string;
  note?: string;
}

export interface IOrder {
  id: string;
  orderNumber: string; // e.g. "EGG-20261014-0001"
  customerId: string;
  customerName: string;
  customerPhone: string;
  depotId: string;
  items: IOrderItem[];
  subtotal: number;
  deliveryCharge: number;
  packagingCharge: number; // Default: 0 (Zero-Crack Molded Tray Free)
  totalAmount: number;
  
  // Doorstep Zero-Crack Refinements
  brokenEggsAdjusted: number; // e.g. 2 eggs damaged in transit
  brokenEggsDeductionAmount: number; // e.g. ₹14 deduction
  finalPayableAmount: number; // totalAmount - brokenEggsDeductionAmount

  deliveryAddress: IUserAddress; // Frozen snapshot
  deliverySlot: DeliverySlot;
  scheduledDeliveryDate: string; // YYYY-MM-DD

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  podCollectedAmount?: number;
  upiTransactionRef?: string;

  status: OrderStatus;
  assignedDeliveryPersonId?: string;
  assignedDeliveryPersonName?: string;
  assignedDeliveryPersonPhone?: string;
  vehiclePlateNumber?: string;

  estimatedDeliveryTime?: string;
  statusTimeline: IOrderStatusTimeline[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 5. Shift & Cash Drawer Reconciliation Types
// ==========================================
export type ReconciliationStatus = 'PENDING' | 'BALANCED' | 'DISCREPANCY';

export interface IShiftReconciliation {
  id: string;
  depotId: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  shiftDate: string; // YYYY-MM-DD
  ordersDeliveredCount: number;
  expectedCashAmount: number;
  physicalCashDeposited: number;
  upiTotalAmount: number;
  brokenEggsTotalDeduction: number;
  varianceAmount: number; // expectedCashAmount - physicalCashDeposited
  managerApprovalId?: string;
  managerNotes?: string;
  status: ReconciliationStatus;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 6. Generic API Response Envelope
// ==========================================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
