# Product Requirements Document (PRD) & Engineering Brief
## Ovovita Farm-to-Table Egg Ordering, Inventory & Delivery Management System

**Document Version:** 1.1.0 (Refined Architecture)  
**Status:** Approved for Implementation with Refinements  
**Target Platform:** Mobile (React Native / Expo iOS & Android) & Web Admin (React + Tailwind)  
**Author / Lead Architect:** Ovovita Engineering Core  

---

### 1. Executive Summary & Vision

**Ovovita** is an enterprise-grade, farm-to-doorstep egg distribution ecosystem designed for high-density urban markets (initial launch: Bengaluru, India). Unlike generic grocery delivery aggregators, Ovovita optimizes specifically for the fragile, perishable lifecycle of fresh eggs:
- **Zero-Crack Guarantee & Protocol**: Shock-proof molded pulp tray packaging with doorstep unboxing inspection. Delivery partners carry a buffer crate for instant replacement; fallback dynamic line-item price markdown enabled via driver app.
- **Freshness Traceability**: Real-time harvest timestamps ("Laid at sunrise today", "Candling quality test passed").
- **Pay on Delivery (POD) Trust Engine**: Flexible doorstep collection supporting both physical Cash on Delivery (COD) and Dynamic UPI QR Code scan-and-pay directly via the driver app to eliminate digital payment friction while curbing cash handling leakage.
- **Hyper-Local Inventory Atomicity & Geo-Fencing**: Depot hubs (e.g., Koramangala Central Depot) maintaining atomic stock locks to prevent overselling, polygon/pincode geo-fencing for instant depot routing, and automated WhatsApp restock triggers when crates fall below threshold.

---

### 2. User Personas & Role-Based Access Control (RBAC)

| Role | Primary Device | Key Objectives | Critical Permissions |
| :--- | :--- | :--- | :--- |
| **Customer** | Mobile App (iOS / Android) | Effortless egg ordering, subscription-style recurring orders, live order tracking, doorstep quality inspection. | Browse catalog, manage saved addresses, place Pay-on-Delivery orders, view personal order history, toggle morning reminders. |
| **Shopkeeper / Depot Lead** | Tablet / Desktop / Mobile Stack | Inward batch management, stock corrections, price updates, order packing queue, rider dispatch, end-of-shift drawer reconciliation. | Read/write local depot inventory, update live unit rates, mark orders packed, assign riders, receive low-stock alerts, approve cash drawer close. |
| **Delivery Executive** | Mobile App (Driver Mode) | Fast route execution, fragile parcel handling, doorstep inspection, dynamic UPI QR generation, cash collection and drawer deposit. | View assigned delivery runs only, customer click-to-call / WhatsApp, dynamic UPI QR generation, record exact cash/UPI collected, log broken egg replacements/markdowns. |
| **System Admin / Executive** | Desktop Web Console | Multi-depot oversight, pricing governance, fleet analytics, sales & revenue audit, WhatsApp template log audits. | Global system access, manage all users/roles, system config, low-stock threshold policies, export financial reports. |

---

### 3. Core Functional Modules & Specifications

#### 3.1. Customer Mobile Experience
1. **Catalog & Tray Customizer:**
   - Flexible purchase units: Single egg, Dozen (12), 30-Egg Molded Pulp Tray, and Custom Wholesale Crates.
   - Dynamic variant pricing with instant volume savings calculation (e.g., ₹7/pc vs. ₹195/tray).
   - Live availability counters ("Laid 6 hrs ago", "340 left in local depot").
2. **Cart & Slot Booking:**
   - Multiple saved delivery addresses with specific gate/security instructions.
   - Pincode & Geo-fencing validation mapping automatically to nearest servicing depot hub.
   - Slot selection: Morning Harvest Rush (6:30 AM – 8:00 AM) and Evening Drop (5:00 PM – 7:00 PM).
   - Transparent bill breakdown: Item subtotal, shock-proof packaging (Free), delivery fee with threshold waiver.
3. **Pay-on-Delivery (POD) Checkout Policy:**
   - Doorstep payment guarantee: Choose between Physical Cash or Instant UPI QR at doorstep.
   - Doorstep Zero-Crack inspection contract: Customer inspects eggs before payment.
   - If eggs are cracked during transit:
     - *Primary Resolution:* Delivery executive replaces cracked eggs immediately from sterile buffer compartment.
     - *Secondary Resolution:* Delivery executive inputs broken egg count in app; bill is dynamically discounted on the spot.
4. **Live Order Tracking & Partner Connect:**
   - Multi-stage timeline: `Order Placed` ➔ `Confirmed` ➔ `Packing & Candling` ➔ `Handed to Partner` ➔ `Out for Delivery` ➔ `Delivered & Paid`.
   - Dedicated delivery partner card with vehicle plate, direct call, and WhatsApp live chat.

#### 3.2. Depot Inventory & Price Master (Admin / Shopkeeper)
1. **Atomic Stock Decrement & Geo-Fencing:**
   - Multi-document ACID transactions ensuring inventory is decremented synchronously at order confirmation.
   - Pincode-to-Depot service polygon validation. Orders reject or queue if customer location is out-of-service.
   - Automatic inventory rollback upon cancellation (`ORDER_CANCELLED_RESTORED`).
2. **Dynamic Live Rates:**
   - Capability to adjust base rates (e.g., ₹6.50 ➔ ₹7.00/egg) with immediate WebSocket propagation to customer apps.
   - Preserves historical purchase prices on existing orders (`priceAtPurchase` frozen snapshot).
3. **Automated Low-Stock Circuit Breaker:**
   - Configurable per-product thresholds (default: 100 eggs).
   - Instant automated WhatsApp alerts sent to the depot manager and farm logistics team when stock dips below threshold.

#### 3.3. Delivery Partner Run-Sheet & Reconciliation Engine
1. **Strict Order Isolation & Offline Run-Sheet:**
   - Delivery executives can only access tasks assigned to their authenticated user ID.
   - Offline caching of addresses and phone numbers for basement/lift delivery execution.
2. **Dynamic Doorstep UPI QR & Cash Logging:**
   - Driver app renders a real-time Bharat UPI / NPCI dynamic QR code encoding order ID and exact payable balance for instant payment scan (GPay, PhonePe, Paytm).
   - Records payment type: `CASH` vs `UPI` with transaction reference ID.
3. **Shift-End Cash Drawer Reconciliation (Handshake):**
   - At the conclusion of each delivery shift, the delivery executive deposits physical cash at the depot hub desk.
   - Depot manager inspects total runs, checks UPI settlements vs physical currency, verifies any broken egg write-offs, and signs off a digital `ShiftReconciliation` receipt.

#### 3.4. Multi-Channel Notification Engine
1. **Official WhatsApp Business Platform (Cloud API):**
   - New order placement receipt with order ID snapshot and POD due.
   - Out-for-delivery rider contact dispatch with live GPS link.
   - Low-stock urgent alert for depot leads.
2. **Firebase Cloud Messaging (FCM):**
   - Push notifications for stage changes, restock alerts, and daily morning replenishment reminders.

---

### 4. Technical Architecture & Data Models

#### 4.1. System Stack
- **Monorepo Architecture:** Turborepo managing shared types, Zod validators, and UI tokens.
- **Client Frontend:** React Native + Expo (TypeScript), NativeWind / Tailwind styling.
- **Admin Portal:** React (Vite + TypeScript) with Tailwind CSS and Lucide icons.
- **Backend API:** Node.js + Express (TypeScript), modular Clean Architecture (`/controllers`, `/services`, `/models`, `/routes`, `/jobs`).
- **Database:** MongoDB 7.0+ Replica Set with Mongoose ODM (enabling multi-document ACID transactions and 2dsphere geo-indexing).
- **Caching & Workers:** Redis + BullMQ for async WhatsApp message retries and low-stock polling sweeps.
- **Security:** Argon2/Bcrypt password hashing, short-lived JWT access tokens + HTTP-only refresh tokens, Zod schema validation.

#### 4.2. Core Mongoose Schemas (Summary)
```typescript
// Product Schema
interface IProduct {
  name: string;
  type: 'WHITE' | 'BROWN' | 'DESI' | 'ORGANIC' | 'KADAKNATH';
  unitPricing: Array<{ unit: 'SINGLE' | 'DOZEN' | 'TRAY_30'; unitQty: number; price: number }>;
  currentStock: number; // Indexed
  lowStockThreshold: number; // default: 100
  isLowStockAlertSent: boolean;
  status: 'ACTIVE' | 'DISABLED';
}

// Order Schema (Strict Financial & Physical Snapshot)
interface IOrder {
  orderNumber: string; // e.g. EGG-20260829-0001
  customerId: Types.ObjectId;
  depotId: Types.ObjectId; // Routing hub
  items: Array<{
    productId: Types.ObjectId;
    productName: string; // Frozen
    unit: string;
    quantity: number;
    priceAtPurchase: number; // Frozen
    lineTotal: number;
  }>;
  subtotal: number;
  deliveryCharge: number;
  totalAmount: number;
  brokenEggsAdjusted?: number;
  brokenEggsDeductionAmount?: number;
  finalPayableAmount: number;
  deliveryAddress: Record<string, any>; // Frozen copy of address
  paymentMethod: 'CASH_ON_DELIVERY' | 'UPI_ON_DELIVERY';
  paymentStatus: 'PENDING' | 'COLLECTED' | 'RECONCILED';
  podCollectedAmount?: number;
  upiTransactionRef?: string;
  status: 'PLACED' | 'CONFIRMED' | 'PACKING' | 'READY_FOR_DELIVERY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  assignedDeliveryPersonId?: Types.ObjectId;
  statusTimeline: Array<{ status: string; timestamp: Date; updatedBy: Types.ObjectId; note?: string }>;
}

// Shift Reconciliation Schema
interface IShiftReconciliation {
  depotId: Types.ObjectId;
  deliveryPersonId: Types.ObjectId;
  shiftDate: Date;
  ordersDeliveredCount: number;
  expectedCashAmount: number;
  physicalCashDeposited: number;
  upiTotalAmount: number;
  brokenEggsTotalDeduction: number;
  varianceAmount: number;
  managerApprovalId: Types.ObjectId;
  status: 'PENDING' | 'BALANCED' | 'DISCREPANCY';
  notes?: string;
}
```

---

### 5. Implementation Roadmap & Phased Milestones

- **Phase 1: Foundation, Security & Meta WhatsApp Verification (Weeks 1–2)**
  - Monorepo scaffold (Turborepo), Dockerized MongoDB replica set, JWT auth, RBAC middleware, and Zod validators.
  - **Early Meta Business Verification & WhatsApp Cloud API HSM Template submission** to avoid downstream blockers.
- **Phase 2: Core Storefront, Pincode Routing & Atomic Orders (Weeks 3–4)**
  - Product catalog APIs, Depot polygon/pincode mapping, Cart computation engine, ACID transactional stock locks, and order generation.
- **Phase 3: Dispatch, Driver POS & Doorstep POD Engine (Weeks 5–6)**
  - Depot admin queue, rider assignment, delivery partner run-sheet UI, dynamic UPI QR generator, buffer egg replacement / broken-egg discount calculator.
- **Phase 4: Cash Drawer Balancing & Cloud API Integration (Weeks 7–8)**
  - Shift-end cash reconciliation console, Meta Business WhatsApp Cloud API webhook integrations, BullMQ background workers, and FCM push notifications.
- **Phase 5: Field Testing & Production Readiness (Weeks 9–10)**
  - Load testing high-concurrency 6:00 AM ordering spikes, offline COD/POD caching, battery-efficient GPS pinging, and Koramangala hub live pilot.

