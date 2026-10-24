# ADR-0002: Single-Shop Inventory Model with Atomic Stock Locking

## Status
**Accepted** (2026-10-20)

## Context

Ovovita operates with **one central Shop** (owner's facility) from which all customer orders are fulfilled. Delivery drivers pick up from this single location and fan out to different neighborhoods.

From domain grilling session:
> "Yes from one shop to customer's address."

Current inventory model stores `Product.currentStock` as a global counter per product type. The architecture document emphasizes:
> "Atomic Stock Atomicity: Multi-document ACID inventory locks guaranteeing zero overselling during 6:00 AM morning rush spikes."

However, the `Depot` model exists with `servicedPincodes`, suggesting multiple locations. This is misleading — depots are currently just **service zones**, not inventory locations.

## Decision

### 1. Single-Shop Inventory Model
All inventory lives at ONE physical location (the Shop). `Product.currentStock` is the source of truth for available eggs.

**Naming clarification**:
- `Depot` in code = **ServiceZone** in domain language (a delivery coverage area)
- Only ONE depot/location has inventory
- `Depot.servicedPincodes` defines where the owner delivers, not where eggs are stored

### 2. Atomic Stock Decrement at Order Confirmation
When an Order transitions from PLACED → CONFIRMED:
```typescript
const query = {
  _id: item.productId,
  currentStock: { $gte: item.totalEggsCount }, // Guard condition
  status: 'ACTIVE',
};
const update = { $inc: { currentStock: -item.totalEggsCount } };
```

If ANY line item fails the guard condition, the entire Order confirmation fails and NO stock is deducted.

### 3. Rush Handling: Reject with Clear Error
From domain grilling session:
> "Reject orders beyond available stock in real-time? (Show 'only 100 left, sorry') — yes"
> "Auto-cancel after 2 hours? — right"

When a customer attempts to order during rush:
- Frontend shows live stock count before checkout
- If stock becomes insufficient during checkout, order is REJECTED with error: "Sorry, only X eggs left. Please reduce quantity."
- PLACED orders that cannot be CONFIRMED within 2 hours are auto-cancelled (stock never locked)

### 4. Stock Restoration on Cancellation
Cancelled orders release stock back to inventory:
```typescript
// When Order transitions to CANCELLED (and was previously CONFIRMED)
await Product.updateMany(
  { _id: { $in: order.items.map(i => i.productId) } },
  { $inc: { currentStock: order.items.reduce((sum, i) => sum + i.totalEggsCount, 0) } }
);
```

## Consequences

### Positive
- **Simple mental model** — one inventory pool, no cross-location transfers
- **No race condition bugs** — MongoDB atomic increment with guard condition
- **Clear customer UX** — rejected immediately if insufficient stock

### Negative
- **Cannot scale to multiple locations** — adding a second shop requires major refactor
- **Single point of failure** — if Shop is inaccessible, all orders fail
- **No per-location pricing** — same price for all pincodes

### Neutral
- `Depot` model remains for service zone definition, but not inventory tracking
- Future multi-shop requires new `ShopInventory` join table

## Implementation Notes

### Immediate Fixes
1. Add frontend stock indicator during checkout
2. Implement 2-hour timeout for PLACED → CONFIRMED transition
3. Add stock restoration on Order cancellation
4. Rename confusing `Depot` references in comments/docs to "Service Zone"

**Status note (2026-10-20 audit):** `InventoryService.restoreStock` exists and is correct, but **has no call site anywhere in the repo** — cancellation currently never releases stock. There is also no PLACED state: `createOrder` decrements stock and writes the Order as `CONFIRMED` in one step, so there is no window in which the 2-hour timeout could apply. Items 2 and 3 above are therefore both blocked on introducing the real PLACED → CONFIRMED transition. See [DOMAIN-GAP-ANALYSIS.md](../DOMAIN-GAP-ANALYSIS.md) Gap 8.

### Inventory States (Future)
```typescript
interface StockState {
  productId: ObjectId;
  availableStock: number;      // Can be purchased
  reservedStock: number;       // Locked by CONFIRMED orders
  inTransitStock: number;      // Allocated to DeliveryRuns (driver has eggs)
  wastedStock: number;         // Damaged, not resellable
}
```

For now, `Product.currentStock` = `availableStock - reservedStock` (implicit).

### Monitoring
- Alert when `Product.currentStock < Product.lowStockThreshold`
- Dashboard: "Stock velocity" = orders per hour during rush
- Circuit breaker: disable orders if stock < 50 eggs at 5:30 AM (morning prep)

## Alternatives Considered

1. **Per-depot inventory with cross-location fulfillment** — over-engineering for single-shop reality
2. **Queue-based ordering (first-come-first-served)** — customer doesn't know if they'll get eggs; bad UX
3. **Soft reservations with 10-minute hold** — adds complexity, doesn't solve fundamental race condition

## References
- GLOSSARY.md: Stock, Product, ServiceZone, OrderCancellation
- ARCHITECTURE.md: Section 3.1 (Atomic Inventory Decrement)
- apps/api-server/src/models/Product.ts: currentStock field
