# ADR-0003: Three-Stage Payment Flow (Intent → Collection → Reconciliation)

## Status
**Accepted** (2026-10-20)

## Context

Ovovita uses **Pay-on-Delivery (POD)** — customers pay at doorstep via cash or UPI. The current Order model conflates three distinct payment concepts:

1. **Payment obligation** — what the customer owes (`Order.finalPayableAmount`)
2. **Collection event** — driver receives money at doorstep
3. **Reconciliation** — shop owner verifies driver's cash drawer at shift end

From domain grilling session:
> "When customer pays it's marked as COLLECTED"  
> "RECONCILED means shop verified it — yes"  
> "UPI goes directly to owner's bank"  
> "Driver must explain variances at shift end"

Current problems:
- `Order.paymentStatus` is updated by driver (trust-based, no audit trail)
- `Order.podCollectedAmount` stores one number, but collection and reconciliation are separate events
- UPI vs cash have different reconciliation paths (UPI bypasses driver's drawer)
- No record of WHO collected the money, WHEN, or with what proof

## Decision

### Three-Stage Payment Model

```
PaymentIntent (immutable obligation)
       ↓
PaymentCollection (driver records collection at doorstep)
       ↓
ShiftReconciliation (owner verifies all collections at shift end)
```

### Stage 1: PaymentIntent
Created when Order is CONFIRMED. Immutable record of what the customer owes.

```typescript
interface PaymentIntent {
  orderId: ObjectId;
  amountDue: number;           // = Order.finalPayableAmount
  paymentMethod: 'CASH_ON_DELIVERY' | 'UPI_ON_DELIVERY';
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED';
  createdAt: Date;
}
```

**This is the contract**, not the transaction.

### Stage 2: PaymentCollection
Created by driver at doorstep when customer hands over money.

```typescript
interface PaymentCollection {
  orderId: ObjectId;
  collectedBy: ObjectId;       // Driver userId
  collectedAt: Date;
  amount: number;              // What driver received
  method: 'CASH' | 'UPI';
  reference?: string;          // UPI transaction ID, or cash receipt number
  notes?: string;              // Driver notes (e.g., "customer gave ₹200, returned ₹5")
}
```

**Key behavior**:
- Driver gives exact change (customer pays ₹200, driver returns ₹5, records ₹195)
- Creating a PaymentCollection updates `PaymentIntent.status` to FULFILLED
- UPI payments include `reference` (transaction ID from payment app)
- Cash payments are reconciled at shift end

### Stage 3: ShiftReconciliation
Owner verifies all cash collections for a driver's shift.

```typescript
interface ShiftReconciliation {
  driverId: ObjectId;
  shiftDate: Date;
  shiftType: 'MORNING' | 'EVENING';
  expectedCash: number;        // Sum of all CASH PaymentCollections
  actualCash: number;          // Physical cash driver brings to shop
  variance: number;            // expectedCash - actualCash
  status: 'PENDING' | 'BALANCED' | 'DISCREPANCY' | 'RESOLVED';
  resolvedBy?: ObjectId;       // Owner who signed off
  resolvedAt?: Date;
  resolutionNotes?: string;    // Explanation for variance
}
```

**Reconciliation rules**:
- UPI payments are excluded (money went directly to owner's bank)
- If `variance = 0` → status = BALANCED
- If `variance ≠ 0` → status = DISCREPANCY, owner must resolve
- Driver is not cleared for next shift until reconciliation is RESOLVED

### UPI vs Cash Paths

**UPI Payment Flow**:
```
Customer scans QR → Pays via GPay/PhonePe → Money to owner's bank
                    ↓
Driver sees confirmation → Creates PaymentCollection (method: UPI, reference: txn123)
                    ↓
No reconciliation needed (money not in driver's drawer)
```

**Cash Payment Flow**:
```
Customer hands cash → Driver gives change → Creates PaymentCollection (method: CASH)
                    ↓
Driver keeps cash in drawer all shift
                    ↓
Shift ends → Driver returns to shop → Owner counts cash → ShiftReconciliation
```

## Consequences

### Positive
- **Clear audit trail** — every payment has who, when, how much, proof
- **Separation of concerns** — obligation, collection, verification are distinct
- **Fraud prevention** — variance tracking catches missing cash
- **UPI transparency** — no confusion about where money went

### Negative
- **More collections** — PaymentCollection is a new aggregate
- **UI changes** — driver app must record collection separately from Order status
- **Historical migration** — existing Orders with paymentStatus need backfilled PaymentCollections

### Neutral
- `Order.paymentStatus` becomes derived from PaymentIntent.status
- `Order.podCollectedAmount` is removed (data lives in PaymentCollection)

## Implementation Notes

### Phase 1 (Immediate)
1. Create `PaymentCollection` model
2. Add API endpoint: `POST /orders/:id/collect-payment` → creates PaymentCollection
3. Update driver app: add "Collect Payment" button that creates PaymentCollection

### Phase 2 (Next Sprint)
1. Create `ShiftReconciliation` model
2. Add admin portal view: "Driver Cash Drawer" showing all pending collections
3. Add reconciliation workflow: owner enters actual cash, system calculates variance

### Phase 3 (Future)
1. UPI webhook integration (optional) — auto-verify UPI transactions
2. Driver performance metrics — on-time collection rate, variance history
3. Customer receipt via WhatsApp after PaymentCollection

### Database Migration
```javascript
// Backfill existing Orders with PaymentCollections
db.orders.find({ status: 'DELIVERED', paymentStatus: 'COLLECTED' }).forEach(order => {
  db.paymentcollections.insertOne({
    orderId: order._id,
    collectedBy: order.assignedDeliveryPersonId,
    collectedAt: order.updatedAt,
    amount: order.finalPayableAmount,
    method: order.paymentMethod === 'UPI_ON_DELIVERY' ? 'UPI' : 'CASH',
    reference: order.upiTransactionRef,
  });
});
```

## Edge Cases

### What if customer pays MORE than amount due?
Driver records actual amount, gives change, PaymentCollection.amount = amountDue.

### What if UPI payment succeeds but driver crashes app before recording?
Customer shows UPI confirmation screenshot. Owner manually verifies via bank statement, creates PaymentCollection with notes.

### What if driver collects cash but forgets to mark it in app?
ShiftReconciliation catches it: expectedCash ≠ actualCash. Driver explains variance, owner resolves.

### What if customer refuses to pay?
Order transitions to DELIVERED anyway (driver already handed over eggs). PaymentIntent stays PENDING. Owner follows up separately (customer support issue, not domain logic).

## Alternatives Considered

1. **Single PaymentStatus on Order** — loses audit trail, no variance tracking
2. **Event-sourced payment ledger** — over-engineering for current scale
3. **External payment gateway** — conflicts with POD model, adds third-party dependency

## References
- GLOSSARY.md: PaymentIntent, PaymentCollection, PaymentStatus, ShiftReconciliation
- ARCHITECTURE.md: Section 4 (Shift-End Cash Drawer Reconciliation Handshake)
- Domain grilling session: Q5 (Payment vs Collection vs Reconciliation)
