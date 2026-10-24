# Ovovita Domain Glossary

This glossary defines the core domain language for Ovovita — a farm-to-doorstep fresh egg delivery ecosystem. All terms are defined free of implementation details; see ADRs for architectural decisions.

---

## Core Domain Entities

### **Shop** (or Depot)
The single central fulfillment location from which all customer orders are packed and dispatched. The owner operates one Shop. A Shop is defined by:
- Physical location and warehouse capacity
- Service coverage (list of serviceable pincodes)
- Operating hours (opening/closing times)
- Owner contact details

*See also: DeliveryRoute, ServiceZone*

**Implementation note**: Stored in `Depot` collection. Not to be confused with multiple warehouses or neighborhood sub-depots (single Shop model for now).

---

### **Product**
A specific type of egg inventory offered for sale, defined by:
- Type (WHITE, BROWN, DESI, ORGANIC, KADAKNATH)
- Description and marketing imagery (heroImageUrl, tags)
- Unit pricing tiers (SINGLE, DOZEN, TRAY_30)
- Current stock level (in individual egg count, not units)

A Product is **farm-agnostic** — the owner buys mixed batches from farms and sells under a single "Ovovita Fresh Eggs" brand. Individual farm origin is stored as `farmOriginName` (marketing string, not domain data).

*See also: Stock, UnitPricing, Batch*

**Lifecycle**: ACTIVE (available for sale) → DISABLED (out of stock or quality issue). Status is immutable until manually reset by owner.

---

### **Stock**
The quantity of individual eggs available for sale, tracked at the Product level (Shop-wide inventory). Stock is:
- Stored as a numeric count (individual eggs, not packages)
- Protected by atomic decrements (cannot exceed available quantity)
- Debited when an Order transitions to CONFIRMED (locks stock)
- Credited back when an Order is cancelled before packing

*See also: Product.currentStock, ReservedStock, AvailableStock*

**Inventory states**:
- **Available Stock** = `Product.currentStock` (can be purchased)
- **Reserved Stock** = eggs locked by CONFIRMED orders (cannot be purchased)
- **In-Transit Stock** = eggs on driver's vehicle (includes buffer eggs + order allocations)
- **Wasted Stock** = broken/damaged eggs during delivery (recorded but not resellable)

---

### **Order**
A customer's purchase contract for one or more egg products, created in a single checkout. An Order is:
- **Immutable after CONFIRMED** — line items, prices, and total are frozen (legal record)
- **Customer commitment** — binds customer to purchase at specified time/place for specified amount
- **Inventory lock** — upon CONFIRMED, deducts stock to prevent overselling during rush

An Order moves through these states:

| State | Meaning |
| :--- | :--- |
| **PLACED** | The customer has ordered; the shop has not accepted it yet. No stock is held. |
| **CONFIRMED** | The shop has accepted the order and locked its stock. |
| **PACKING** | The eggs are being packed into molded pulp trays at the shop. |
| **READY_FOR_DELIVERY** | Packing is complete; the order is waiting for a driver. |
| **OUT_FOR_DELIVERY** | A driver has the order and is on the road. |
| **DELIVERED** | The customer has the eggs and has paid (or owes cash on delivery). |
| **CANCELLED** | The order was called off. See OrderCancellation for what happens to the eggs. |

*See also: OrderLineItem, PurchaseContract, FulfillmentWorkflow, OrderCancellation, RefundOwed*

**Key fields frozen at CONFIRMED**:
- `items[]` (line items cannot be added/removed)
- `priceAtPurchase` (per item)
- `subtotal`, `deliveryCharge`, `packagingCharge` (cannot be modified)
- `scheduledDeliveryDate`, `deliverySlot` (SLA promise to customer)

**Payments are NOT stored on Order** — see PaymentCollection, ShiftReconciliation.

---

### **OrderLineItem**
A single line in an Order, representing one Product at one Unit in one Quantity. Captures:
- Product reference (frozen name, type, price)
- Unit (SINGLE, DOZEN, TRAY_30)
- Quantity (how many units)
- Total egg count (unit × quantity)
- Line total (frozen price)

LineItems are immutable after Order CONFIRMED.

*See also: Unit, UnitPricing*

---

### **Unit** (and UnitPricing)
A packaging grouping of eggs sold to customers:
- **SINGLE** — 1 individual egg (for tiny orders or testing)
- **DOZEN** — 12 eggs (standard purchase)
- **TRAY_30** — 30 eggs (bulk purchase, discounted per-egg price)

Each Product offers multiple Units at different price points. The unit is part of the customer's choice, not just quantity. For example: "I want 2 DOZENs" is different from "I want 24 SINGLEs."

*See also: Product.unitPricing*

---

### **DeliverySlot**
A customer-facing time window guarantee for when eggs will arrive. Options:
- **MORNING_RUSH** — 6:00 AM – 9:00 AM (peak demand window)
- **EVENING_DROP** — 5:00 PM – 8:00 PM (secondary delivery window)

The customer chooses a delivery slot at order time. This is the **SLA promise**, not a precise time. For live tracking, see EstimatedDeliveryTime.

*See also: ScheduledDeliveryDate, EstimatedDeliveryTime*

---

### **DeliveryDate**
The specific day on which an order is scheduled for delivery (e.g., "Oct 21, 2026"). Combined with DeliverySlot, this forms the customer's delivery contract: "Eggs will arrive on Oct 21 between 6–9 AM."

*See also: DeliverySlot, EstimatedDeliveryTime*

---

### **EstimatedDeliveryTime**
A **live tracking feature** — the driver's estimated arrival time at the customer's address, calculated en route (not at order time). This is updated as the driver progresses through the route and is NOT a contractual promise. Format: ISO timestamp with precision to minutes (e.g., "2026-10-21T07:15:00Z").

*See also: DeliverySlot, ActualDeliveryTime*

---

### **DeliveryRun** (or DeliveryWorkflow)
The operational workflow that fulfills an Order AFTER it is CONFIRMED. A Run includes:
- **Status progression**: PACKING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED
- **Assignment**: One or two drivers (DeliveryExecutives) assigned to the run
- **Orders**: A list of 1+ Orders to be delivered by the assigned drivers
- **Route**: Sequence of customer addresses covered by the drivers
- **Timeline**: Actual departure time, arrival times at each address

A Run is separate from an Order. Multiple Orders can belong to one Run (e.g., 8 orders delivered by a 2-driver team in the MORNING_RUSH slot). An Order's lifecycle is PLACED → CONFIRMED, then a DeliveryRun executes the delivery.

*See also: Order, DeliveryExecutive, Buffer*

---

### **DeliveryExecutive** (or Driver)
A staff member responsible for collecting order batches (runs) from the Shop and delivering them to customer addresses. A DeliveryExecutive:
- Has a User record with role = DELIVERY_EXECUTIVE
- Is assigned one or more DeliveryRuns per shift
- Carries a Buffer of spare eggs for quality guarantees
- Collects payment at doorstep (cash or UPI)
- Returns to Shop at shift end for cash reconciliation

*See also: User, DeliveryRun, Buffer, Shift, ShiftReconciliation*

---

### **Buffer** (or BufferCrate)
A physical crate of spare eggs carried by a DeliveryExecutive for doorstep quality remediation. The Buffer:
- Contains 10–15 spare eggs (owner decides quantity)
- Is issued to the driver at shift start (tracked as inventory on loan)
- Is used to swap cracked/broken eggs at doorstep (customer never sees the breach)
- Is returned to Shop at shift end (unused eggs return to inventory; used eggs recorded as wastage)

A buffer swap is a **zero-cost remediation** — no price adjustment to the customer, just a physical replacement.

**Not yet implemented.** The current driver screens display a hardcoded "6 Fresh Eggs Ready" that is not derived from any state. See [DOMAIN-GAP-ANALYSIS.md](docs/DOMAIN-GAP-ANALYSIS.md) Gap 7.

*See also: ZeroCrackGuarantee, InspectionEvent, RemediationAction, WasteRecord*

---

### **ZeroCrackGuarantee**
A marketing promise: "Every customer receives eggs intact, or we'll make it right immediately." Operationally, this means:
- At doorstep, driver and customer inspect eggs together (InspectionEvent)
- If cracks found: try buffer swap first (zero-cost)
- If buffer exhausted: apply price markdown (cost to business, not customer)
- If customer refuses: order rejection allowed

*See also: InspectionEvent, RemediationAction, Remediation.BUFFER_REPLACED, Remediation.PRICE_DISCOUNTED*

---

### **InspectionEvent**
A record created at the doorstep when driver and customer inspect the egg package together. The event captures:
- Inspection datetime
- Number of cracked/broken eggs (if any)
- Inspection outcome: PASSED (all intact) or FAILED_WITH_CRACKS (N eggs damaged)

This is distinct from the Order itself — the Order is the purchase contract, the InspectionEvent is the delivery reality.

*See also: ZeroCrackGuarantee, RemediationAction*

---

### **RemediationAction**
The owner's chosen response to a failed InspectionEvent (cracked eggs). Options:
- **BUFFER_REPLACED** — Driver swaps cracked egg from buffer crate. No price change. (Zero-cost to business if damage is within buffer capacity)
- **PRICE_DISCOUNTED** — Buffer exhausted or owner prefers cash rebate. Customer receives ₹X deduction. (Cost to business)
- **ORDER_REJECTED** — Customer refuses delivery entirely. Order cancels, stock returns to inventory, customer pays ₹0.

*See also: InspectionEvent, ZeroCrackGuarantee*

---

### **PaymentCollection**
The event where a driver receives money from a customer at the doorstep. Captures:
- Collected datetime
- Collected amount (₹)
- Payment method (CASH or UPI)
- Payment reference (CASH = physical receipt number; UPI = transaction ID)
- Order ID (which order this payment is for)

A PaymentCollection is recorded IMMEDIATELY when the customer pays, independent of Order status changes. Multiple PaymentCollections can exist for one Order (if original payment fails, customer pays again).

*See also: PaymentIntent, PaymentStatus*

---

### **PaymentIntent**
The customer's obligation to pay for an Order. Created at Order CONFIRMED and immutable:
- Order ID
- Amount due (= `Order.finalPayableAmount`)
- Payment method (CASH_ON_DELIVERY or UPI_ON_DELIVERY)
- Deadline (typically same day as DeliveryDate)

A PaymentIntent is a contract requirement, not a transaction. Actual payment happens via PaymentCollection.

*See also: PaymentCollection, PaymentStatus, Order.finalPayableAmount*

---

### **PaymentStatus** (on Order or PaymentIntent)
The state of payment fulfillment for an Order:
- **PENDING** — Payment not yet collected (Order placed but driver hasn't collected money yet)
- **COLLECTED** — Driver collected money at doorstep (PaymentCollection created)
- **RECONCILED** — Shop owner verified the collected amount during ShiftReconciliation

*See also: PaymentCollection, ShiftReconciliation*

---

### **Shift**
A work period for one DeliveryExecutive, typically spanning:
- **Morning shift** — 6:00 AM – 11:00 AM (MORNING_RUSH deliveries)
- **Evening shift** — 4:00 PM – 9:00 PM (EVENING_DROP deliveries)

A Shift is assigned DeliveryRuns, and at shift end, all cash collected during that shift is reconciled.

*See also: DeliveryRun, ShiftReconciliation*

---

### **ShiftReconciliation**
The end-of-shift cash drawer balance process. The owner (or supervisor) verifies:
1. **Expected cash** = sum of all PaymentCollections marked COLLECTED during the shift
2. **Physical cash** = actual currency the driver brings back to the Shop
3. **Variance** = Expected - Physical (should be ₹0; if not, driver must explain)
4. **Settlement** = Owner signs off and marks all PaymentCollections as RECONCILED

If variance is non-zero, the reconciliation is flagged for review before the driver is cleared for the next shift.

*See also: Shift, PaymentCollection, PaymentStatus.RECONCILED*

---

### **User** (and Roles)
A human actor in the system with login credentials and role-based permissions. Roles:
- **SYSTEM_ADMIN** — Global admin (can create depots, manage all users, override prices)
- **OWNER** — The business owner (can access all features except user management; primary role for reconciliation)
- **DELIVERY_EXECUTIVE** — Driver (can collect deliveries, receive payments, sign shift reconciliation)
- **CUSTOMER** — End consumer (can place orders, track deliveries, see history)

*Note*: In the current single-shop model, there is one OWNER. DELIVERY_EXECUTIVEs are staff. CUSTOMERs are buyers.

**Not yet implemented.** The code currently calls the owner `SHOPKEEPER` and has no `OWNER` role. See [DOMAIN-GAP-ANALYSIS.md](docs/DOMAIN-GAP-ANALYSIS.md) Gap 5.

---

## Supporting Concepts

### **ServiceZone** (or ServicedPincodes)
The geographic area served by the Shop. Defined as a list of postal codes (pincodes) that the Shop is willing to deliver to. Customers outside these pincodes cannot place orders.

*See also: Shop, DeliveryRoute*

---

### **DeliveryCharge**
The fee (₹) added to an Order for delivery logistics. Typically fixed per order (not per distance, as service zones are small). Example: ₹15 per order.

*See also: Order.deliveryCharge*

---

### **PackagingCharge**
The fee (₹) for the zero-crack molded pulp tray. In Ovovita's model, this is **absorbed** (₹0 to customer), but tracked separately in accounting to understand true cost-per-order.

*See also: Order.packagingCharge, ZeroCrackGuarantee*

---

### **UnitPricing**
A pricing tier for a specific Unit of a Product. Example:
- 1 SINGLE brown egg = ₹20
- 1 DOZEN brown eggs = ₹180 (per dozen, or ₹15 per egg = savings vs singles)
- 1 TRAY_30 brown eggs = ₹420 (per tray, or ₹14 per egg)

UnitPricing is set by the owner and can change over time (dynamic pricing). It is NOT retroactively applied to past orders — past orders freeze the price at CONFIRMED time.

*See also: Product, Unit, OrderLineItem.priceAtPurchase*

---

### **WasteRecord** (or Wastage)
A log entry for eggs that cannot be resold:
- Broken during buffer swaps at doorstep (quantity, datetime, driver, reason)
- Discovered during packing (quantity, reason, product)
- Returned by driver (unused buffer, reason)

Wastage is tracked for analytics (quality metrics, buffer usage patterns) and owner decision-making (which drivers have high damage rates, which products are fragile).

*See also: Buffer, InspectionEvent, RemediationAction*

---

### **OrderCancellation**
The calling off of an Order. **The customer and the owner may cancel an Order at any
point in its life** — there is no time limit. Only the Order's own customer or a
member of shop staff may cancel it; a customer can never cancel somebody else's
Order.

What happens to the eggs depends on how far the Order had travelled:

| Cancelled from | Stock | Eggs | Money |
| :--- | :--- | :--- | :--- |
| **PLACED** | Not released — none was ever locked. | Never left the shelf. | Nothing owed. |
| **CONFIRMED** | Released back to inventory. | Back on the shelf. | Nothing owed. |
| **PACKING** | Released back to inventory. | The packed eggs go back to the shelf; the owner decides restock vs waste. | Nothing owed. |
| **READY_FOR_DELIVERY** | Released back to inventory. | The driver is holding them and must return them. | Nothing owed. |
| **OUT_FOR_DELIVERY** | Released back to inventory. | The driver is holding them and must return them. | Nothing owed. |
| **DELIVERED** | **Not** released — the eggs are gone. | With the customer. | A **RefundOwed** is recorded. |

Two invariants:
- **Stock is released exactly once.** A second cancellation of an already-cancelled
  Order is refused, so the eggs can never be counted back into inventory twice.
- **A cancellation is never silently ignored.** Either the Order is cancelled and
  the eggs are accounted for, or the request is refused and nothing changes.

*See also: Order.status, Stock, RefundOwed, EggReturn*

---

### **RefundOwed**
A record that the customer is owed money back, arising when a DELIVERED Order is
cancelled after the customer has already paid.

Because the eggs are gone, the stock is not returned — but the customer paid, so
the money must come back. Ovovita has no payment gateway, so **the refund is a
manual, offline action by the owner**: the system's job is to make sure it is
recorded, is visible, and is not forgotten. A RefundOwed records the amount owed,
who cancelled the order and when, and — when the customer paid by UPI — the
transaction reference so the owner knows what to reverse.

Until the owner marks it settled, the RefundOwed is outstanding. A driver's
shift close still counts the cash they collected for that order, because the
driver handed the money over; the owner pays the refund from the shop till, not
from the driver's drawer.

*See also: OrderCancellation, PaymentCollection, ShiftReconciliation*

---

### **EggReturn**
The eggs a driver physically holds for an Order that was cancelled while it was
out for delivery.

The stock is returned to the shop the moment the Order is cancelled, but the
eggs are still in the driver's van. The driver must bring them back, and the run
sheet says so, because otherwise the stock count and the van contents disagree.

*See also: OrderCancellation, Buffer, DeliveryExecutive*

---

### **CandlingRecord** (or QualityInspection)
A farm-side quality check (not domain data in the current system, but noted for future). Candling is the process of checking each egg for cracks/defects under light before distribution. Currently, Ovovita does NOT track per-batch candling records; the owner does visual QC at the Shop before packing. Future: if sourcing multiple farms, candling data from farms should be tracked separately.

*See also: Product (currently isCandlingPassed is not used meaningfully)*

---

### **LayDate** (or FreshnessClaim)
A marketing message displayed to customers (e.g., "Laid at sunrise today"). This is NOT domain data — it's not immutable, not timestamped, and not used for business logic. It's the owner's marketing copy. The actual freshness is implied by daily farm sourcing (not tracked individually per batch in the current system).

*See also: Product.laidTimestampText*

---

## Relationships & Invariants

### **Order Integrity**
- An Order MUST have at least 1 OrderLineItem.
- An OrderLineItem MUST reference a ACTIVE Product.
- Once an Order transitions to CONFIRMED, its OrderLineItems and prices are immutable.
- An Order's `finalPayableAmount` is calculated as: `subtotal + deliveryCharge + packagingCharge - brokenEggsDeductionAmount`.

### **Stock Atomicity**
- When an Order is CONFIRMED, stock is decremented by `sum(OrderLineItem.totalEggsCount)`.
- This decrement is **atomic** — either all line items succeed, or the entire Order confirmation fails.
- If stock becomes insufficient between PLACED and CONFIRMED, the CONFIRMED action fails with an error.
- Cancelled Orders restore stock to available inventory.

### **Payment Invariants**
- A PaymentIntent (Order) has exactly ONE PaymentStatus at a time (PENDING → COLLECTED → RECONCILED).
- A PaymentCollection must reference an existing Order and match (or be close to) the Order's amount due.
- A ShiftReconciliation can only be completed AFTER all PaymentCollections in the shift are marked COLLECTED.
- UPI payments bypass the driver's cash drawer (direct to owner's bank); cash payments are reconciled at shift end.

### **Delivery Invariants**
- A DeliveryRun is assigned 1–2 DeliveryExecutives.
- A DeliveryRun contains 1+ Orders, all with the same DeliveryDate and DeliverySlot.
- An Order can only be assigned to ONE DeliveryRun (no split deliveries across runs).
- An InspectionEvent occurs after an Order is OUT_FOR_DELIVERY and the driver reaches the customer address.

---

## Terminology Notes

- **"Depot"** in code ≈ **"Shop"** in business language (single location, all inventory, fulfillment hub)
- **"Product"** ≈ egg type/variety (WHITE, BROWN, DESI, etc.) + pricing tiers
- **"Order"** = purchase contract (immutable after CONFIRMED)
- **"Delivery Run"** = operational workflow (packing, dispatch, delivery)
- **"DeliveryExecutive"** = driver / delivery staff
- **"PaymentCollection"** = actual payment event at doorstep (separate from Order status)
- **"ShiftReconciliation"** = end-of-shift cash verification (separate from Order payment status)

---

## What's NOT Defined Yet (Future)

- Multi-shop scaling (currently single Shop only)
- Farm sourcing relationships and batch traceability
- Customer loyalty / repeat purchase metrics
- Dynamic pricing algorithms (currently static per Unit)
- Route optimization (currently manual assignment)
- Real-time GPS tracking (currently simulated)
- Return/refund policies post-delivery
- Subscription plans (weekly egg boxes)

---
