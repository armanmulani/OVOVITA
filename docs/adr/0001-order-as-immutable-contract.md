# ADR-0001: Order as Immutable Contract After Confirmation

## Status
**Accepted** (2026-10-20)

## Context

Ovovita's Order model has evolved to serve multiple purposes:
1. **Legal record** — proof of purchase contract (customer commitment, price agreement)
2. **Operational workflow tracker** — status machine driving shop/driver actions
3. **Financial ledger** — payment collection, adjustments, reconciliation

This conflation creates problems:
- Mutable fields (`brokenEggsAdjusted`, `finalPayableAmount`) contaminate the legal record
- Payment status is coupled to Order status, but payment collection happens at doorstep (separate lifecycle)
- Adjustments and corrections must overwrite historical data, losing audit trail

From domain grilling session:
> "Customer orders eggs and it is stored and shown in admin panel, then it is assigned to a delivery agent."

This implies a **handoff** — the Order is the customer-facing commitment, and a separate operational process fulfills it.

## Decision

An Order is an **immutable purchase contract** after it transitions to CONFIRMED status.

**What is frozen at CONFIRMED**:
- `items[]` (line items cannot be added/removed)
- `priceAtPurchase` (per item)
- `subtotal`, `deliveryCharge`, `packagingCharge`
- `scheduledDeliveryDate`, `deliverySlot`
- `customerId`, `deliveryAddress`
- `totalAmount` (base amount before adjustments)

**What is NOT part of Order** (belongs to separate aggregates):
- Payment collection events → `PaymentCollection` aggregate
- Delivery workflow state → `DeliveryRun` aggregate
- Doorstep inspection outcomes → `InspectionEvent` aggregate
- Price adjustments → `RemediationAction` aggregate

**Order status progression**:
```
PLACED → CONFIRMED → PACKING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED
                                                    ↘ CANCELLED (from any state)
```

After CONFIRMED, the Order's *contract* does not change. The operational states
(PACKING, READY_FOR_DELIVERY, OUT_FOR_DELIVERY, DELIVERED) are tracked on the
Order itself for now rather than on a separate DeliveryRun aggregate — that
extraction is still the target state, but the packing workflow has to live
somewhere real, and the Order is where the shop already works.

**PLACED is a real state.** An order starts PLACED: the customer has asked, the
shop has not accepted it, and **no stock is held**. Stock is locked atomically
at CONFIRMED. This gives an order a window in which it can be cancelled before
it consumes anything, and it is what the 2-hour auto-cancel sweep acts on — a
PLACED order nobody confirmed is released rather than left to sit in the day's
plan indefinitely.

### Cancellation and the refund-owed concept

Cancellation is permitted at **any** point in an Order's life, by the order's own
customer or by shop staff. What happens to the eggs depends on how far the order
travelled — PLACED, CONFIRMED and PACKING return eggs to the shelf;
OUT_FOR_DELIVERY returns the eggs to the shelf *and* flags the driver to bring
the van's eggs back; and DELIVERED cannot return eggs because they are gone.

**RefundOwed** is the concept that covers the last case. A DELIVERED order that
is cancelled after the customer paid cannot give eggs back, so the order records
that money is owed to the customer: the amount, who cancelled it, and — for UPI
payments — the transaction reference to reverse. There is no payment gateway in
this app, so the refund is a **manual, offline action by the owner**; the
system's responsibility is to make sure it is recorded, visible in the admin
portal, and not forgotten. It is a deliberately incomplete automation: the
system tracks the debt, a human settles it.

A cancelled order is also not a *silent* one. The cancellation either completes
and the eggs are accounted for, or it is refused — a second cancellation of an
already-cancelled order is rejected rather than applied again, so the eggs are
never counted back into inventory twice.

## Consequences

### Positive
- **Audit integrity** — legal record is tamper-proof
- **Clear separation** — contract vs. fulfillment lifecycle
- **Easier reconciliation** — PaymentCollection references immutable Order
- **Better error recovery** — failed delivery doesn't corrupt Order data

### Negative
- **Migration required** — current `Order` model has operational fields mixed in
- **More aggregates** — need to create DeliveryRun, PaymentCollection, InspectionEvent
- **Query complexity** — must join Order + DeliveryRun for some views

### Neutral
- `Order.finalPayableAmount` becomes **initial amount** (may be adjusted via RemediationActions)
- `Order.status` stays for high-level tracking, but detailed status lives in DeliveryRun

## Implementation Notes

### Phase 1 (Immediate)
1. Stop mutating `Order` after CONFIRMED for any reason
2. Add `DeliveryRun` model with `orderIds[]`, `status`, `driverId`
3. Move operational status fields to DeliveryRun (PACKING, OUT_FOR_DELIVERY)

### Phase 2 (Next Sprint)
1. Create `PaymentCollection` aggregate (decouple from Order.paymentStatus)
2. Create `InspectionEvent` and `RemediationAction` for Zero-Crack protocol
3. Refactor API to return combined view (Order + DeliveryRun) for admin portal

### Phase 3 (Future)
1. Event sourcing for Order lifecycle (optional)
2. Historical snapshots for DeliveryRun status changes

## Alternatives Considered

1. **Keep Order mutable** — simpler at first, but loses audit trail and conflates contract with operations
2. **Event-sourced Order** — over-engineering for current scale, but future-proof
3. **Two-phase Order (Draft → Final)** — adds complexity without solving the core issue

## References
- GLOSSARY.md: Order, DeliveryRun, PaymentCollection, InspectionEvent, RemediationAction
- ARCHITECTURE.md: Section 3.2 (Doorstep Zero-Crack Inspection Protocol)
