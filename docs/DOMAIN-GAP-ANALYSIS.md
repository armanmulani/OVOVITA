# Ovovita Domain Gap Analysis

**Date:** 2026-10-20
**Method:** Design-tree grilling session + code audit against the new domain model
**Reference:** [GLOSSARY.md](../GLOSSARY.md), [ADR-0001](adr/0001-order-as-immutable-contract.md), [ADR-0002](adr/0002-stock-atomicity-single-shop.md), [ADR-0003](adr/0003-payment-collection-reconciliation.md)

This document maps where the **implemented code diverges** from the **agreed domain model**, and what it costs you to leave it that way.

---

## Summary

| # | Gap | Severity | Blast Radius | Est. Fix |
|---|-----|----------|--------------|----------|
| 1 | Two parallel data paths (MongoDB API vs Firestore service) | 🔴 Critical | Whole system | Delete Firestore path |
| 2 | Order mutated as operational scratchpad | 🔴 Critical | Order, Payment, Reconciliation | Extract 3 aggregates |
| 3 | No `DeliveryRun` aggregate | 🟠 High | Dispatch, run-sheet, driver app | New model + endpoints |
| 4 | No `PaymentCollection` aggregate | 🟠 High | Payment audit, reconciliation | New model + endpoint rewrite |
| 5 | `OWNER` role doesn't exist; `SHOPKEEPER` is ambiguous | 🟠 High | Auth, RBAC, all staff routes | Role rename + matrix |
| 6 | Zero-Crack protocol mutates Order instead of recording events | 🟡 Medium | Audit trail, quality metrics | InspectionEvent + RemediationAction |
| 7 | Buffer eggs entirely untracked | 🟡 Medium | Inventory accuracy, wastage | Buffer issue/return endpoints |
| 8 | `restoreStock` written but never called | 🟡 Medium | Stock accuracy on cancel | Wire cancellation path |
| 9 | Dead UI states (`PACKING`, `READY_FOR_DELIVERY`) | 🟡 Medium | Confusing admin UI | Either implement or remove |
| 10 | Two identity systems (Better Auth + own User model) | 🟡 Medium | Auth correctness | Consolidate on Better Auth |
| 11 | `estimatedDeliveryTime` is a string, set at order time | 🔵 Low | Live tracking accuracy | Move to DeliveryRun, ISO timestamp |
| 12 | No stale-PLACED auto-cancel | 🔵 Low | Stock locked forever | Scheduled job |
| 13 | `isCandlingPassed` field is unused | 🔵 Low | Confusion | Remove or implement |
| 14 | Third app (`apps/expo-mobile`) is a hardcoded mock | 🟡 Medium | Confusing codebase | Delete or wire to API |

---

## Gap 1 — Two Parallel Data Paths 🔴 CRITICAL

**Domain model says:** One source of truth. MongoDB via the API server.

**Code has:**

| | MongoDB (API server) | Firestore (mobile) |
|---|---|---|
| Orders | `apps/api-server/src/models/Order.ts` | `orders` collection |
| Products | `apps/api-server/src/models/Product.ts` | `products` collection |
| Order status enum | `PLACED \| CONFIRMED \| PACKING \| READY_FOR_DELIVERY \| OUT_FOR_DELIVERY \| DELIVERED \| CANCELLED` | `PENDING \| CONFIRMED \| OUT_FOR_DELIVERY \| DELIVERED \| CANCELLED` |
| Payment status | `PENDING \| COLLECTED \| RECONCILED` | `PENDING \| PAID` |
| Pack unit | `unit: SINGLE \| DOZEN \| TRAY_30`, `quantity`, `unitQty` | `packType: string`, `quantity` |
| Price field | `priceAtPurchase` | `price` |
| Product status | `ACTIVE \| DISABLED` | `ACTIVE \| OUT_OF_STOCK \| DISCONTINUUM` |

**Evidence:**
- `apps/mobile/src/services/firestoreService.ts` — 148 lines, complete CRUD + realtime subscriptions
- `apps/mobile/src/config/firebase.ts` — Firestore client init
- `firestore.rules`, `firestore.indexes.json`, `firebase.json` — deployed Firebase config
- `apps/api-server/src/models/betterAuthModels.ts` — separate identity collections too

**Good news:** `firestoreService` is **never imported** by any screen. Grep across `apps/mobile/src` returns only its own definition. The mobile app talks to the MongoDB API via `apps/mobile/src/api.ts` for all real work.

**So this is dead code with live infrastructure behind it.** Firebase project, rules, indexes, and 148 lines of a service that will never be called — but that a developer (or agent) will one day wire up and split your data in half.

**Cost of leaving it:** The trap. Someone will "finish the realtime feature" by wiring `subscribeToOrderTracking` in, and suddenly order tracking reads from a Firestore collection that nothing writes to.

**Fix:** Delete `firestoreService.ts`, `config/firebase.ts`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`. If you want realtime order tracking, do it properly — SSE or WebSocket from the API server against MongoDB.

---

## Gap 2 — Order Mutated as Operational Scratchpad 🔴 CRITICAL

**Domain model says (ADR-0001):** Order is an immutable contract after CONFIRMED.

**Code violates it in three places:**

**a) `orderController.ts:160-187` — `adjustBrokenEggs`**
```typescript
order.brokenEggsAdjusted = brokenEggsCount;        // mutates contract
order.brokenEggsDeductionAmount = deduction;         // mutates contract
order.finalPayableAmount = Math.max(0, order.totalAmount - deduction);  // mutates contract
await order.save();
```
Note also: `finalPayableAmount` is recomputed from `totalAmount`, **discarding any prior markdown**. Two consecutive broken-egg adjustments silently discard the first deduction.

**b) `orderController.ts:217-221` — `collectPaymentAndDeliver`**
```typescript
order.paymentMethod = paymentMethod;       // mutates the agreed payment method
order.podCollectedAmount = amountCollected;
order.upiTransactionRef = upiTransactionRef;
order.paymentStatus = 'COLLECTED';
order.status = 'DELIVERED';
```
Overwriting `paymentMethod` after the fact destroys the contract term. The customer agreed to pay one way; the app can rewrite it to another.

**c) `depotController.ts:110-124` — `assignRider`**
```typescript
order.assignedDeliveryPersonId = driver._id;
order.estimatedDeliveryTime = `${estimatedMinutes || 15} mins`;
order.status = 'OUT_FOR_DELIVERY';
```

**Cost:** No audit trail. A dispute with a customer ("I paid ₹195, the app says ₹180") cannot be resolved from the Order document. Reconciliation computes expected cash from mutable Order fields, so a late mutation silently changes what the driver is expected to have.

**Fix:** Extract `DeliveryRun`, `PaymentCollection`, `InspectionEvent`, `RemediationAction`. Order becomes append-only.

---

## Gap 3 — No `DeliveryRun` Aggregate 🟠 HIGH

**Domain model says:** 1–2 drivers per run, N orders per run, all sharing DeliveryDate + DeliverySlot, one run per order.

**Code has:** `assignedDeliveryPersonId` on each Order. `assignRider` handles exactly one order. `getDriverRunSheet` queries Orders directly:

```typescript
// depotController.ts:148-151
const runs = await Order.find({
  assignedDeliveryPersonId: driverId,
  status: { $in: ['OUT_FOR_DELIVERY', 'DELIVERED'] },
});
```

**Evidence of the concept already half-existing:** `depotController.ts:73` returns `activeRunsCount: outForDeliveryOrders.length` — counting *orders* and calling it "runs". The admin dashboard's "activeRuns" array is an array of Orders, not Runs.

**Consequences:**
- Can't assign 8 orders to a 2-driver team in one operation
- Can't record a route sequence (stop 1, 2, 3)
- Can't track "run departed at 6:15 AM" as a single fact
- `estimatedDeliveryTime` can't be per-stop

**Fix:** New `DeliveryRun` model: `{ slot, deliveryDate, driverIds[], orderIds[], status, route[] }`. `assignRider` becomes `createOrAssignToRun`.

---

## Gap 4 — No `PaymentCollection` Aggregate 🟠 HIGH

**Domain model says (ADR-0003):** PaymentIntent (obligation) → PaymentCollection (driver records at doorstep) → ShiftReconciliation (owner verifies).

**Code has:** `Order.paymentStatus` + `Order.podCollectedAmount`. The `collect-payment` endpoint writes them directly. No `PaymentCollection` model exists.

**The reconciliation problem this creates** (`depotController.ts:181-194`):
```typescript
const expectedCash = deliveredOrders
  .filter((o) => o.paymentMethod === 'CASH_ON_DELIVERY')
  .reduce((sum, o) => sum + (o.podCollectedAmount || 0), 0);
const variance = expectedCash - physicalCashDeposited;
```

Three issues:
1. **Filter uses `paymentMethod`, which `collectPaymentAndDeliver` just overwrote.** An order the customer agreed to pay by UPI but the driver recorded as cash counts toward the cash drawer.
2. **`|| 0` swallows missing data.** If the driver forgot to record an amount, expected cash silently drops — variance looks *smaller*, and the owner accepts a drawer that's short. A missing collection must be a loud error, not a zero.
3. **No attribution.** You can't tell which driver collected what, when, or with what proof.

**Also:** the domain model says UPI goes directly to the owner's bank, so UPI is excluded from the cash drawer. The code computes `totalUpi` separately (good) but derives it from the same mutable `paymentMethod` field.

**Fix:** New `PaymentCollection` model. `collect-payment` creates one. Reconciliation sums PaymentCollections where `method === 'CASH'` for that driver+shift, and fails loudly if a delivered order has no collection.

---

## Gap 5 — `OWNER` Role Doesn't Exist 🟠 HIGH

**Domain model says:** `OWNER` (the business owner, one person, also the shop/depot lead), `DELIVERY_EXECUTIVE`, `CUSTOMER`, `SYSTEM_ADMIN`.

**Code has:** `CUSTOMER | SHOPKEEPER | DELIVERY_EXECUTIVE | SYSTEM_ADMIN` (`User.ts:24`).

You confirmed: the shopkeeper **is the owner himself**, there's only one, and he is also the person who verifies the cash drawer.

**Why this matters beyond naming:**

- **`SYSTEM_ADMIN` is doing the owner's job.** `depotRoutes.ts` gates `assign-rider`, `shift/reconciliation-close` and the dashboard on `SHOPKEEPER` + `SYSTEM_ADMIN`. `orderRoutes.ts:17` gates order history on the same. If SYSTEM_ADMIN is a cloud/ops concept, the owner has a role that doesn't exist, and there's a second privileged identity that isn't the business.
- **"SHOPKEEPER" reads as a shop employee, not the owner.** Any future dev will build "shopkeeper accounts" — plural — for a business with exactly one owner.
- **Staff login selects the role from the client** (`authController.ts:156-159`):
  ```typescript
  const { phoneNumber, pin, role } = req.body;
  const user = await User.findOne({ phoneNumber, role });
  ```
  The client tells the server which role to authenticate as. Not a direct privilege escalation (the PIN still must match that user's hash), but it's the wrong shape: role should be *derived* from the credential, never supplied by the client.

**Fix:** Rename `SHOPKEEPER` → `OWNER`. Reconsider whether `SYSTEM_ADMIN` is a separate person or the same one with broader reach. Change staff login to `User.findOne({ phoneNumber })` then verify the account may use PIN login, ignoring any client-supplied role.

---

## Gap 6 — Zero-Crack Protocol Mutates Order 🟡 MEDIUM

**Domain model says:** `InspectionEvent` (what was observed) + `RemediationAction` (what was done) are separate from the Order.

**Code has:** `adjustBrokenEggs` (orderController.ts:149-201) writes directly to Order fields. No inspection event, no remediation record.

**What you lose:**
- **Quality analytics.** "Ramesh cracked 4% of eggs this week" is unanswerable — you only have the current Order's count, and it's overwritten on each adjustment.
- **The 3-way distinction.** `resolutionType` accepts `BUFFER_REPLACED` vs everything-else, but there's no `ORDER_REJECTED`. The domain model says rejection is a valid outcome (customer refuses, order cancels, stock returns) — **it isn't implemented at all**, and `PricingService.computeBrokenEggDeduction` is only ever reached for markdown.
- **No separation of "how many broke" from "what we did about it."** Today `brokenEggsAdjusted` means both.

**Cost:** The zero-crack promise is your brand. Right now you can't prove you honor it or measure whether it's working.

**Fix:** `InspectionEvent` { orderId, driverId, brokenCount, outcome, at } + `RemediationAction` { inspectionId, type: BUFFER_REPLACED | PRICE_DISCOUNTED | ORDER_REJECTED, amount }. Order keeps a *projection* of the final payable for read convenience, but the source is the events.

---

## Gap 7 — Buffer Eggs Entirely Untracked 🟡 MEDIUM

**Domain model says:** Buffer is inventory on loan to a driver for a shift. Issued at shift start, used for swaps, returned at shift end, unused eggs go back to stock, broken eggs come back as waste.

**Code has:** Nothing. Grep for "buffer" finds only prose in `ARCHITECTURE.md` and a `resolutionType === 'BUFFER_REPLACED'` branch in the controller — which changes no inventory.

**Consequences:**
- Swapping a cracked egg from the buffer **doesn't decrement stock** (correct — the egg was already decremented at order time) but also **doesn't record that a buffer egg was consumed** (wrong — that egg left your building).
- The buffer crate size is undefined. The owner must eyeball how many eggs to hand each driver.
- "Ramesh came back with 7 unused buffer eggs" has no home. They re-enter stock by... nothing.
- Broken eggs swapped out are supposed to come back to the shop as waste. Nothing tracks that either.

**Fix:** `BufferIssue` { driverId, shiftDate, productId, quantity } at shift start (decrement stock), `BufferReturn` { issueId, returnedQuantity, brokenReturned, wastedQuantity } at shift end (increment stock for returned, record waste for broken). This is also the cheapest possible input to the "which driver breaks the most eggs" question.

---

## Gap 8 — `restoreStock` Written But Never Called 🟡 MEDIUM — ✅ RESOLVED 2026-10-22

**Was:** `InventoryService.restoreStock` existed and was correct, but nothing called it.
Cancelled orders never released their stock — the eggs were physically on a shelf
while the app thought they were sold. `createOrder` also decremented stock and
wrote the Order as `CONFIRMED` in one step, so there was no PLACED state and no
window in which a cancellation could occur.

**Now resolved.** What was built:

- **A real `PLACED` state.** `createOrder` now creates the order as `PLACED` and
  does **not** decrement stock. Stock is locked atomically at CONFIRMED, via
  `POST /orders/:id/confirm` → `OrderService.confirmOrder`, which calls the
  existing `InventoryService.atomicDecrementStock`. If the eggs are gone by then
  the order is put back to PLACED and the confirmation fails.
- **A cancellation endpoint** — `POST /orders/:id/cancel` → `OrderService.cancelOrder`,
  which calls `InventoryService.restoreStock` for the states that held stock.
- **A 2-hour auto-cancel sweep** — `OrderService.sweepStalePlacedOrders()`, run
  every 5 minutes by a `setInterval` started in `server.ts` (`startPlacedOrderSweep`).
  No external service and no new dependency.
- **Atomic, non-repeating cancellation.** The order is *claimed* with a single
  conditional update (`status: { $in: [...] }`) before any stock is released, so a
  second cancellation finds nothing to claim and is rejected with 409. The eggs
  can never be counted back into inventory twice. If the stock release itself
  fails, the claim is rolled back so the order is never left cancelled with its
  eggs missing from stock.
- **Ownership enforced in the controller**, not just by the role guard: a
  customer may only cancel their own order.
- **RefundOwed** for a DELIVERED order cancelled after payment — the amount, who
  cancelled it, and the UPI reference to reverse. Surfaced in the admin portal
  as a "Refunds Owed" filter and a per-order badge.
- **EggReturn flag** for an OUT_FOR_DELIVERY cancellation, so the driver's run
  sheet says the eggs must come back to the shop.

Covered by `apps/api-server/src/__tests__/test_cancellation.ts`
(`npm run test:cancel`).

---

## Gap 9 — Dead UI States 🟡 MEDIUM — ✅ RESOLVED 2026-10-22

**Was:** `PACKING` and `READY_FOR_DELIVERY` were in the `Order.status` enum and
rendered by the admin portal, but no code ever set them. The "Packing Queue"
board actually showed CONFIRMED orders, so there was no way to know an order was
*being* packed.

**Now resolved.** The states are real transitions, each with an admin-portal
control:

| Transition | Endpoint | Admin control |
| :--- | :--- | :--- |
| PLACED → CONFIRMED | `POST /orders/:id/confirm` | "Confirm" button on the queue board |
| CONFIRMED → PACKING | `POST /orders/:id/packing` | "Start Packing" button |
| PACKING → READY_FOR_DELIVERY | `POST /orders/:id/ready` | "Packing Done" button |
| READY_FOR_DELIVERY → OUT_FOR_DELIVERY | `POST /depots/assign-rider` | "Dispatch" button (existing) |

The board now shows each order with the action its state calls for, and the
dashboard's packing-queue query includes `PLACED`, `CONFIRMED`, `PACKING` and
`READY_FOR_DELIVERY` — so it is genuinely the packing board.

`assignRider` was tightened to dispatch **only** from `READY_FOR_DELIVERY`, using
a conditional update so two dispatchers cannot both put the same order on the
road.

Also: the driver's run sheet now shows a cancelled order flagged for egg return
in the ACTIVE tab (not hidden under completed), and the admin Order History has a
"Refunds Owed" filter and badge.

---

## Gap 10 — Two Identity Systems 🟡 MEDIUM

**Code has:**

1. **Better Auth** (`config/better-auth.ts`, `models/betterAuthModels.ts`) — owns `user`, `session`, `account`, `verification` collections. Handles phone OTP.
2. **Own `User` model** (`models/User.ts`) — the app profile: role, saved addresses, ratings, `pinHash`, `totalOrdersCount`, `betterAuthUserId`, `phoneNumberVerified`.

They are linked by a **shared phone number string** plus a `betterAuthUserId` field, with a comment stating the intent clearly:
> *"Keep the existing Ovovita `User` document as the source of truth for the app profile... Better Auth owns the identity record; the link is the shared phone number."*

**The problem:** the link is a string, not a constraint. `authController.ts:99-101` does:
```typescript
const existingUser = await User.findOne({
  $or: [{ phoneNumber: e164 }, { phoneNumber: e164.replace('+', '') }],
});
```
It looks up by a phone number that may be stored **two ways** — with and without the `+91` prefix. It then creates a `User` if none is found, and links `betterAuthUserId` afterwards. The `User.phoneNumber` field is `unique`, but a `User` created before Better Auth (staff, seeded) may store `9876543210` while the OTP flow looks for `+919876543210` — and the `$or` handles it, but only in this one code path.

**Also:** Better Auth's `user` model is configured with `additionalFields: { role }` (better-auth.ts:60-67) — so a role exists on the Better Auth user *too*, and it is not the same source of truth as `User.role`. Two role fields.

**Cost:** Every auth-related bug becomes a question of "which system?" Staff never touch Better Auth (they use PIN). Customers always do. The `User` doc is created by *two* different paths. And `phoneNumberVerified` is duplicated on both sides.

**Fix:** Pick one. Recommendation: keep Better Auth as the sole identity system; make `User` a pure application profile keyed by `betterAuthUserId` (a real unique index), drop the `role` from Better Auth's additionalFields, drop `phoneNumberVerified` from `User`, and standardize on one phone format (store E.164 everywhere, migrate existing).

---

## Gap 11 — `estimatedDeliveryTime` Is a String, Set at Order Time 🟵 LOW

**Domain model says:** It's a live tracking feature, set when the driver is en route.

**Code:** `orderController.ts:65` sets it at order creation as `"${estimatedMinutes} mins"` — a string. `depotController.ts:114` overwrites it at dispatch. The type is `string` in the model.

**Consequences:** you can't sort by ETA, can't compare to a time window, can't show "arriving in 12 min" without parsing a string. A stale value from order creation survives until dispatch.

**Fix:** move to `DeliveryRun` (or a per-stop structure on the run), type as `Date`, set on dispatch and update en route.

---

## Gap 12 — No Stale-PLACED Auto-Cancel 🔵 LOW

You confirmed: *"Auto-cancel after 2 hours? — right."*

**Code:** `createOrder` sets `status: 'CONFIRMED'` immediately. There is no PLACED state, no timeout job, no cron anywhere in the repo. The 2-hour rule isn't implemented because there's nothing to time out.

**Fix:** same as Gap 8 — real PLACED state + a scheduled sweep.

---

## Gap 13 — `isCandlingPassed` Unused 🟵 LOW

`Product.isCandlingPassed` (Product.ts:18) defaults to `true` and is never read or written meaningfully. You said: *"don't know do whatever is the best, we just check the eggs at shop and then deliver."*

**Your actual process is a shop-side visual check, not farm-side candling.** Two honest options:
- **Remove the field.** The domain model should describe what you do. The glossary already notes candling as a *future* concept.
- **Repurpose it** as `qualityCheckedAt` / `qualityCheckedBy` — a timestamped shop-side QC on the batch you're about to sell. This is more useful: it tells you when stock was last eyeballed.

Recommendation: **remove `isCandlingPassed`**, since the GLOSSARY places candling in "not defined yet" and the field implies a control you don't perform. Keep `laidTimestampText` — but note it's marketing copy, which the glossary already says.

---

## Gap 14 — A Third App That Is a Hardcoded Mock 🟡 MEDIUM

`apps/expo-mobile/` is a separate Expo/React Native app: `App.tsx`, `app.json`, `eas.json`, `package.json`, `tsconfig.json`. The README lists it as *"Mobile web & responsive PWA"* under `apps/mobile`, and ARCHITECTURE.md lists *"Customer App (Port 5174 / Expo Native)"* — so the two are presented as one thing.

They are not. `apps/mobile` is a real Vite web app hitting the API. `apps/expo-mobile` is a static mock:

- `apps/expo-mobile/App.tsx:181` — `Vehicle: KA-01-EQ-9872 • Buffer Stock: 6 Eggs` — literal strings
- `apps/expo-mobile/App.tsx:188` — `Handle Cracked Egg (Buffer Swap)` — a button that goes nowhere

And `apps/mobile` hardcodes its own buffer count the same way:

- `apps/mobile/src/screens/DriverModeScreen.tsx:245` — `<span>Driver Buffer Stock: <strong>6 Fresh Eggs Ready</strong></span>`

The buffer is a **displayed fiction** in both apps. It does not come from the server, is not per-driver, and does not change when eggs are used. (See Gap 7 — buffer tracking doesn't exist at all, so there is nothing for this to read.)

**Cost:** A reader — or an agent — will reasonably believe there are two mobile frontends that both work. One is a dead mock with hardcoded data. When the driver screen shows "6 Fresh Eggs Ready" on every run, the number is a constant, not a state.

**Fix:** Decide which app is real. Recommendation: **`apps/mobile` (Vite PWA) is the real one** — it is the one wired to the API and the one the README's `npm start` serves on port 5174. Delete `apps/expo-mobile/`, or keep it as an explicit prototype with a README saying so.

---

## What The Code Already Gets Right

Not everything needs rework. Credit where due:

| Area | Evidence |
|---|---|
| Atomic stock decrement with guard condition | `InventoryService.ts:39-47` — `currentStock: { $gte: required }` + `$inc` |
| Transaction + standalone compensation rollback | `InventoryService.ts:23-32, 86-96` — real transactions on replica set, saga rollback on standalone |
| Low-stock circuit breaker | `InventoryService.ts:62-78` — alert fires once, resets on inward |
| Batch inward | `InventoryService.ts:118-133` |
| UPI deep link generation | `orderController.ts:126-133` — correct NPCI format |
| Shift reconciliation variance math | `depotController.ts:194-195` — `Math.abs(variance) < 0.01` tolerance, UPI separated from cash |
| Strict Indian phone validation | `better-auth.ts:111` — `/^\+91[6-9]\d{9}$/` |
| Offline driver queue with replay | `apps/mobile/src/services/offlineSync.ts` — real localStorage queue, replay on reconnect |
| Frozen price snapshots on line items | `Order.ts:11-12` — `priceAtPurchase`, `productName` |
| Status timeline | `Order.ts:15-19` — append-only history |
| E.164 normalisation | `better-auth.ts:15-24` |

---

## Recommended Sequencing

The gaps have dependencies. Doing them out of order means touching the same files twice.

**Phase 1 — Stop the bleeding (no new models)**
1. **Gap 1**: delete the Firestore path. *Removes a trap; no dependencies.*
2. **Gap 8 + 12**: real PLACED state, wire `restoreStock`, add the 2-hour sweep. *Self-contained.*
3. **Gap 5**: rename `SHOPKEEPER` → `OWNER`, fix staff login to derive role. *Touches auth only.*
4. **Gap 13**: delete `isCandlingPassed`. *One-line.*
5. **Gap 10**: fix the phone-number lookup in `authController.ts:99-101` to match one format. *One-line, defers the full consolidation.*

**Phase 2 — Extract the aggregates (the real refactor)**
6. **Gap 3**: `DeliveryRun` model + endpoints. *Also carries Gap 11 (ETA moves here).*
7. **Gap 4**: `PaymentCollection` model + rewrite `collect-payment` + fix reconciliation to read from it. *Depends on nothing from 6.*
8. **Gap 6**: `InspectionEvent` + `RemediationAction`, add `ORDER_REJECTED`. *Depends on 4 (rejection must also restore stock).*
9. **Gap 7**: `BufferIssue` / `BufferReturn`. *Depends on 6 (buffer usage is a remediation action).*

**Phase 3 — Deeper cleanup**
10. **Gap 14**: delete `apps/expo-mobile/` or mark it clearly as a prototype.
11. **Gap 9**: implement real packing states on the run, or delete them.
12. **Gap 10** (full): consolidate identity on Better Auth, migrate phone format, drop duplicated role/verification fields.
13. **Gap 2 completion**: strip the operational fields off Order now that their new homes exist.

**Phase 3 note:** Phase 2 is where the value is. Phases 1 and 3 are hygiene. If you only have time for one, do Phase 2 — but do Gap 1 first, because leaving a second data path in place while you refactor the first is how you end up with orders in two systems.

---

## Open Questions Not Yet Resolved

These came up during the audit and are genuinely undecided — they need your call:

1. **Is `SYSTEM_ADMIN` a real person who is not the owner?** If it's the same person as OWNER, collapse them. If it's a separate cloud/ops account, the owner needs a role that exists.
2. **Does the owner ever act as a driver?** Your demo accounts have four roles, and the owner also runs the shop. If the owner covers deliveries, `OWNER` needs driver permissions too.
3. **Is a driver's shift a morning/evening pair, or does it span a day?** `ShiftReconciliation.shiftDate` is a string; `deliverySlot` implies two shifts. A driver doing both is two shifts or one?
4. **Should a customer be able to cancel, and does stock go back?** You confirmed stock returns to inventory on cancel, but you haven't said who can cancel and at what point. The GLOSSARY currently allows it up to PACKING.
5. **What happens to the order if the driver never delivers** (customer unreachable, address wrong)? No domain rule yet, and it's the most common real-world failure.
