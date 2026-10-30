# 🥚 Ovovita • Farm-to-Table Fresh Egg Ordering & Delivery Ecosystem

[![CI Pipeline](https://github.com/ovovita/ovovita-core/actions/workflows/ci.yml/badge.svg)](https://github.com/ovovita/ovovita-core/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0%2F8.0%20ReplicaSet-brightgreen.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-Proprietary-amber.svg)]()

> **Ovovita** is an enterprise-grade, farm-to-doorstep egg distribution ecosystem designed for high-density urban markets (initial launch: Bengaluru, India). Unlike generic quick-commerce aggregators, Ovovita optimizes specifically for the fragile, perishable lifecycle of fresh eggs: atomic inventory locking, molded pulp tray shock packaging, lay-date freshness traceability, and a Pay-on-Delivery (POD) trust engine.

---

## 🌟 Key Differentiators

- **Zero-Crack Guarantee & Protocol:** Delivered in shock-absorbing molded pulp trays with doorstep unboxing inspection. Delivery partners carry a buffer crate for on-the-spot single-egg swaps; fallback dynamic price markdowns are calculated directly in the app.
- **Pay on Delivery (POD) Trust Engine:** Flexible doorstep collection supporting physical Cash on Delivery and dynamic NPCI Bharat UPI QR codes generated on the driver's phone.
- **Atomic Stock Atomicity:** Multi-document ACID inventory locks guaranteeing zero overselling during 6:00 AM morning rush spikes.
- **Automated WhatsApp Business Cloud API:** Automated order receipts, live GPS dispatch alerts, depot low-stock circuit breakers, and an inbound customer tracking chatbot.
- **Shift-End Cash Drawer Reconciliation:** Digital handshake closing driver cash drawers with automatic variance tracking and supervisor sign-offs.

---

## 🏛️ Monorepo Architecture

```
ovovita/
├── packages/
│   ├── shared-types/        # TypeScript interfaces (IOrder, IProduct, IUser, IDepot, IShiftReconciliation)
│   ├── validation/          # Zod validation schemas for Staff PIN, Orders, Adjustments
│   └── ui-tokens/           # Warm Modern Organic theme tokens from DESIGN.md
├── apps/
│   ├── api-server/          # Express + TypeScript + Mongoose + BullMQ clean architecture backend
│   │   ├── src/docs/        # OpenAPI 3.0 / Swagger UI definition
│   │   ├── src/models/      # User, Depot, Product, Order, ShiftReconciliation schemas
│   │   ├── src/services/    # InventoryService (ACID locks), PricingService, RoutingService, NotificationService
│   │   ├── src/controllers/ # Auth, Products, Orders, Depots, Webhooks
│   │   └── src/__tests__/   # Automated core, concurrency, webhook, and E2E lifecycle suites
│   ├── admin-portal/        # React + Vite + Tailwind web app for Depot Leads & Admins
│   └── mobile/              # Mobile web & responsive PWA for Customers & Driver POS
├── .github/workflows/ci.yml # Automated CI pipeline testing on Node 20 & 22
├── docker-compose.yml       # Local dev setup with MongoDB Replica Set & Redis
├── docker-compose.prod.yml  # Multi-stage production container orchestration
└── package.json             # Root workspace orchestration
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js:** `v20.x` or `v22.x`+
- **MongoDB:** `v7.0`+ (standalone local service or replica set container)

### 2. Installation
```bash
git clone https://github.com/ovovita/ovovita-core.git
cd ovovita
npm install
```

### 3. Build & Seed Demo Database
```bash
# Compile all 5 workspace modules
npm run build

# Seed Koramangala Depot, demo accounts, and fresh egg inventory
npm run seed
```

### 4. Start the Unified Ecosystem
```bash
npm start
```

This single command boots all services concurrently:
- **Backend API:** [http://localhost:4000](http://localhost:4000/health)
- **Interactive Swagger Docs:** [http://localhost:4000/api/v1/docs](http://localhost:4000/api/v1/docs)
- **Admin Depot Portal:** [http://localhost:5173](http://localhost:5173)
- **Mobile Client App:** [http://localhost:5174](http://localhost:5174)

---

## 🧪 Automated Test Suites

Ovovita comes equipped with four levels of automated verification:

```bash
# Run all test suites in sequence
npm run test:all

# Or run individual test suites:
npm run test:core          # Zod schema validation & broken egg deduction math
npm run test:concurrency   # 6:00 AM rush contention test (10 concurrent requests; zero overselling)
npm run test:webhook       # Meta Cloud API handshake & tracking chatbot reply
npm run test:e2e           # Full 7-stage lifecycle (Order -> Dispatch -> Doorstep -> Shift Close)
```

---

## 🔑 Pre-Configured Demo Accounts

| Role | Mobile Number | Password / PIN | Description |
| :--- | :--- | :--- | :--- |
| **Customer** | Google account | Google Sign-In | Doorstep Ordering, Slot Booking & Live Tracking |
| **Depot Lead / Shop** | `9876500001` | PIN: `1234` | Depot Inventory, Packing Queue & Shift Drawer Close |
| **Delivery Executive** | `9876500002` | PIN: `1234` | Driver POS, Dynamic UPI QR & Zero-Crack Buffer Kit |
| **System Admin** | `9876500000` | PIN: `1234` | Global Fleet & Pricing Master Console |

> These accounts are created by `npm run seed`, which also wipes and re-creates
> the demo `depots`, `users`, `products` and `orders` collections.

### Google Sign-In setup

The mobile web app includes Google sign-in through Firebase Authentication.
In Firebase Console for the project selected in `.firebaserc`, enable the
**Google** provider, add `localhost` under Authentication → Settings →
Authorized domains, and copy the Firebase web app settings into the root
`.env`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
`VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`. Set
`FIREBASE_WEB_API_KEY` to the same web API key (or use
`VITE_FIREBASE_API_KEY` for both). Restart the mobile app and API after
updating `.env`.

---

## 🐳 Docker Deployment

### Production Stack
```bash
docker compose -f docker-compose.prod.yml up --build -d
```
Orchestrates:
- MongoDB 7.0 Replica Set with automatic cluster initiation
- Redis 7.2 Alpine cache & message queue
- Node 22 Alpine API server running as non-privileged `node` user
- Nginx Alpine container serving the Admin Web Portal on port 80.

---

## 📄 License
Proprietary & Confidential • Ovovita Farm-to-Table Egg Delivery Ecosystem
