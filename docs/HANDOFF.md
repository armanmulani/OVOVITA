# Ovovita — Client Handoff Guide

**Prepared:** 2026-10-21
**Stack:** Node 22 · Express 5 · MongoDB (Mongoose 9) · React 19 · Vite 8 · Tailwind 4 · Firebase Google Sign-In

---

## 1. Prerequisites

| Requirement | Version | Check |
| :--- | :--- | :--- |
| Node.js | 20.x or 22.x+ | `node -v` |
| npm | 10+ | `npm -v` |
| MongoDB | 7.0+ running locally | `mongosh --eval "db.runCommand({ping:1})"` |

MongoDB must be **running** before you seed. The API server connects on boot and exits with
`[Startup Error]` if it cannot reach it.

---

## 2. One-Time Setup

```bash
npm install
cp .env.example .env
npm run build
npm run seed
```

`npm run seed` **wipes and recreates** the demo `depots`, `users`, `products` and `orders`
collections. Re-run it any time you want a clean demo state.

---

## 3. Boot the Whole Ecosystem

### Production-style (built assets — what to demo from)

```bash
npm start
```

This runs all three concurrently:

| Service | URL | Notes |
| :--- | :--- | :--- |
| API server | http://localhost:4000 | |
| Health check | http://localhost:4000/health | Returns `{"status":"healthy",...}` |
| Swagger docs | http://localhost:4000/api/v1/docs | Interactive OpenAPI 3.0 |
| Admin portal | http://localhost:5173 | Depot Lead / Admin console |
| Mobile PWA | http://localhost:5174 | Customer app + Driver POS |

### Development mode (hot reload — for making changes)

```bash
npm run dev:api      # API on :4000, restarts on change
npm run dev:admin    # Admin portal on :5173
npm run dev:mobile   # Mobile PWA on :5174
```

Run those in three separate terminals. `npm run dev:api` must be running before the
frontends can reach it.

---

## 4. Demo Accounts

| Role | Mobile Number | Credential | Lands in |
| :--- | :--- | :--- | :--- |
| Customer | Google account | Google Sign-In | Customer app — catalog, checkout, tracking |
| Depot Lead / Owner | `9876500001` | PIN `1234` | Admin portal — packing queue, dispatch, cash drawer |
| Delivery Executive | `9876500002` | PIN `1234` | Mobile app → Driver mode — run sheet, UPI QR, buffer swap |
| System Admin | `9876500000` | PIN `1234` | Admin portal — global fleet & pricing |

The mobile app signs in the driver automatically with `9876500002` / `1234` when you open
**Driver mode**, so you can go straight to the run sheet.

---

## 5. Suggested Demo Script (5 minutes)

1. **Admin portal →** sign in as `9876500001` / `1234`. You land on the depot dashboard:
   live metrics, packing queue, available drivers, critical-stock alerts.
2. **Mobile app (customer) →** sign in with Google. Browse the catalog —
   note the live stock count on each product.
3. **Checkout →** add a dozen, choose MORNING_RUSH, place the order. Watch the stock
   counter drop. This is the atomic-lock path: it cannot oversell.
4. **Admin portal →** the new order appears in the packing queue. Assign it to
   Ramesh Kumar (`9876500002`). It moves to *Out for Delivery*.
5. **Mobile app → Driver mode.** The order is on the run sheet. Open the order:
   - **Payable** and the customer's address are shown.
   - Tap **Handle Cracked Egg** to demo the Zero-Crack buffer swap (no price change).
   - Tap **Collect** to demo the dynamic Bharat UPI QR, or confirm cash collection.
6. **Admin portal → Shift cash desk.** Close the driver's shift. Expected cash is computed
   from the delivered cash orders, UPI is excluded (it goes straight to your bank), and
   any variance is surfaced for sign-off.

---

## 6. API Reference

Interactive docs at **http://localhost:4000/api/v1/docs**.

| Endpoint | Method | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `/health` | GET | — | Liveness probe |
| `/api/v1/auth/customer/google` | POST | — | Exchange verified Firebase Google ID token for JWT |
| `/api/v1/auth/staff/login` | POST | — | PIN login (staff) |
| `/api/v1/auth/profile` | GET | JWT | Current profile |
| `/api/v1/auth/addresses` | GET/POST/PUT/DELETE | JWT | Saved addresses |
| `/api/v1/products` | GET | — | Live catalog |
| `/api/v1/products/price` | PATCH | Shopkeeper/Admin | Update unit pricing |
| `/api/v1/products/batch-inward` | POST | Shopkeeper/Admin | Stock inward |
| `/api/v1/orders` | POST | Customer | Place order (creates a PLACED order; no stock held yet) |
| `/api/v1/orders/my-orders` | GET | JWT | Customer order history |
| `/api/v1/orders` | GET | Shopkeeper/Admin | All orders, filter + search |
| `/api/v1/orders/:id/confirm` | POST | Shopkeeper/Admin | PLACED → CONFIRMED (locks stock atomically) |
| `/api/v1/orders/:id/packing` | POST | Shopkeeper/Admin | CONFIRMED → PACKING |
| `/api/v1/orders/:id/ready` | POST | Shopkeeper/Admin | PACKING → READY_FOR_DELIVERY |
| `/api/v1/orders/:id/cancel` | POST | Own customer or staff | Cancel the order (stock released per policy) |
| `/api/v1/orders/:id/tracking` | GET | JWT | Live tracking |
| `/api/v1/orders/:id/upi-qr` | GET | JWT | Dynamic UPI deep link |
| `/api/v1/orders/adjust-broken` | POST | Driver/Shopkeeper | Zero-Crack buffer swap / markdown |
| `/api/v1/orders/collect-payment` | POST | Driver/Shopkeeper | Collect payment, mark delivered |
| `/api/v1/depots/dashboard` | GET | Shopkeeper/Admin | Depot metrics + queues |
| `/api/v1/depots/assign-rider` | POST | Shopkeeper/Admin | Dispatch an order |
| `/api/v1/depots/driver/run-sheet` | GET | Driver | Driver's own orders only |
| `/api/v1/depots/shift/reconciliation-close` | POST | Shopkeeper/Admin | Close the cash drawer |

---

## 7. Environment Variables

All variables live in `.env` (copy from `.env.example`).

| Variable | Required | Default | Notes |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `4000` | API port |
| `NODE_ENV` | **Yes in prod** | `development` | `production` enables stricter production behavior |
| `MONGODB_URI` | **Yes in prod** | `mongodb://127.0.0.1:27017/ovovita` | Atlas URI in production |
| `JWT_SECRET` | **Yes** | none | Required; minimum 32 characters |
| `JWT_EXPIRES_IN` | No | `7d` | |
| `CORS_ALLOWED_ORIGINS` | **Yes in prod** | `localhost:5173,5174` | Comma-separated frontend origins |
| `FIREBASE_WEB_API_KEY` | **Yes** | none | Firebase web API key used to verify Google ID tokens |
| `UPI_MERCHANT_VPA` | No | `ovovita.depot@okhdfcbank` | Your UPI handle |
| `UPI_MERCHANT_NAME` | No | `Ovovita Fresh Farms` | Shown on the pay sheet |
| `META_WHATSAPP_TOKEN` | For WhatsApp | empty | Meta system-user token |
| `META_PHONE_NUMBER_ID` | For WhatsApp | empty | |
| `META_WEBHOOK_VERIFY_TOKEN` | For WhatsApp | dev default | Must be changed in prod |
| `META_APP_SECRET` | For WhatsApp | empty | Verifies Meta's `X-Hub-Signature-256`. Without it, inbound webhooks are unverified. |

Frontend variables (build-time, `VITE_` prefix):

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:4000/api/v1` | Set on the host to your deployed API |
| `VITE_FIREBASE_API_KEY` | empty | Firebase web app API key |
| `VITE_FIREBASE_PROJECT_ID` | empty | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | empty | Firebase web app ID |

---

## 8. Production Deployment

See [`DEPLOYMENT.md`](../DEPLOYMENT.md) for the full guide (Atlas → Railway → Vercel → EAS).

Short version:

1. **MongoDB Atlas** — M0 free tier, region `ap-south-1` (Mumbai), allow access from anywhere.
2. **API** — deploy to Railway/Render. Build `npm install; npm run build`, start
   `node apps/api-server/dist/server.js`. Set all the production env vars above.
3. **Frontends** — deploy `apps/admin-portal` and `apps/mobile` to Vercel, framework Vite,
   output `dist`, with `VITE_API_URL=https://<your-api>/api/v1`.
4. **Android APK** — `cd apps/expo-mobile && eas build -p android --profile preview` for a
   standalone `.apk` you can share over WhatsApp.

### Production checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` set to a long random value (the API refuses to boot if it is missing or under 32 characters)
- [ ] `CORS_ALLOWED_ORIGINS` set to your real frontend origins (not `*`)
- [ ] `MONGODB_URI` pointing at Atlas
- [ ] Meta WhatsApp token + phone number ID + `META_APP_SECRET` set (if using WhatsApp)
- [ ] CSRF check is re-enabled automatically in production

---

## 9. Test Suites

```bash
npm run test:core          # Zod schemas, broken-egg deduction math, UPI link format
npm run test:cancel        # Cancellation policy and order-state regression tests
npm run test:concurrency   # 10 concurrent orders against 60 eggs — zero overselling
npm run test:webhook       # Meta Cloud API handshake + tracking chatbot
npm run test:e2e           # Full 7-stage lifecycle
npm run test:all           # All five in sequence
```

`test:e2e`, `test:webhook`, `test:cancel` and `test:concurrency` hit a **running** API server
and a **running** MongoDB. Start `npm run dev:api` first.

### Verified status at handover

| Suite | Status |
| :--- | :--- |
| `test:core` | ✅ passed |
| `test:e2e` | ✅ passed (full 7-stage lifecycle, shift drawer BALANCED) |
| `test:concurrency` | ⚠️ **not re-run** after the auth fixes — the fixes do not touch `InventoryService`, so the atomic-lock path is unchanged. Run it to confirm. |
| `test:webhook` | ⚠️ **not re-run** after the auth fixes — unrelated to auth. Run it to confirm. |

The three un-run suites were blocked by a tooling outage at the end of the handover
session, not by a code failure. Run `npm run test:all` once before the client demo to
get a full green board.

---

## 10. Known Limitations (state these honestly to the client)

These are real and worth being upfront about rather than discovering in a demo.

1. **The Expo app (`apps/expo-mobile`) is a UI prototype.** It renders a static mock of
   the customer/driver experience with hardcoded data. It is not wired to the API. The
   functional app is the **mobile PWA** on port 5174. Treat the Expo app as a visual
   reference for the future native build.
2. **Order workflow is flat.** There is no `DeliveryRun` aggregate — one driver assignment
   is stored per order, so a multi-order route is not modelled as a route.
3. **Refunds are a manual, offline process.** If a *delivered* order is cancelled after the
   customer has paid, the eggs cannot be returned, so the order is flagged **Refund Owed**
   with the amount, who cancelled it, and the UPI transaction reference to reverse. There
   is no payment gateway in this app, so **the owner must give the money back by hand**.
   The system tracks the debt and shows it on the admin portal (a "Refunds Owed" filter on
   Order History, plus a count and total on the dashboard) so it is not forgotten — but
   nothing settles it automatically. The driver still hands over the cash they collected,
   so the shift drawer stays accurate; the refund comes out of the shop till, not the
   driver's pocket.
4. **Buffer eggs are not tracked.** The driver screen shows a hardcoded "6 Fresh Eggs Ready".
   There is no buffer-issue/return record, so buffer consumption and waste are not measured.
5. **Separate customer and staff sign-in.** Customers authenticate with Google via
   Firebase and receive an Ovovita JWT; staff continue to use the PIN login endpoint.
6. **UPI payments are reconciled manually.** Money goes to your bank account directly, so
   the system records the driver's claim but cannot independently verify it.
7. **WhatsApp notifications are fire-and-forget.** Without Meta credentials they are
   skipped silently.
8. **GPS tracking is simulated**, not real.

Items 1, 2, 4, 5 and 6 are tracked in detail in
[`docs/DOMAIN-GAP-ANALYSIS.md`](DOMAIN-GAP-ANALYSIS.md) with severity and a recommended
sequencing.

---

## 11. Project Documentation

| Document | What it covers |
| :--- | :--- |
| [`README.md`](../README.md) | Overview, quick start, demo accounts |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | System design, protocols, RBAC matrix |
| [`DEPLOYMENT.md`](../DEPLOYMENT.md) | Cloud deployment walkthrough |
| [`GLOSSARY.md`](../GLOSSARY.md) | Domain vocabulary and invariants |
| [`docs/adr/`](adr/) | Architecture decision records |
| [`docs/DOMAIN-GAP-ANALYSIS.md`](DOMAIN-GAP-ANALYSIS.md) | Code-vs-domain gaps, prioritised |
| [`docs/SECURITY-REVIEW.md`](SECURITY-REVIEW.md) | Auth & API security findings, with fixes applied |
| [`docs/HANDOFF.md`](HANDOFF.md) | This document |
