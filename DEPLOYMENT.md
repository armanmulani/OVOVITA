# 🚀 Ovovita • Production Deployment & Client Delivery Guide

This guide contains everything needed to deploy the Ovovita ecosystem to the cloud and distribute the mobile app to customers and drivers.

---

## 🏗️ Architecture & Cloud Hosting Map

| Component | Recommended Cloud Platform | Free Tier Available? | Purpose |
| :--- | :--- | :--- | :--- |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | ✅ Yes (M0 Free 512MB) | Multi-hub inventory, users, orders, and 2dsphere geo-indexing |
| **Backend API** | [Railway](https://railway.app) or [Render](https://render.com) | ✅ Yes | Express server, ACID locks, WhatsApp bot, Swagger docs |
| **Admin Portal** | [Vercel](https://vercel.com) or [Netlify](https://netlify.com) | ✅ Yes | Depot packing queue, rider dispatch, price master, shift cash desk |
| **Mobile PWA** | [Vercel](https://vercel.com) or [Netlify](https://netlify.com) | ✅ Yes | Customer storefront & rider POS with offline basement mode |
| **Native Android APK**| [Expo EAS Cloud](https://expo.dev/eas) | ✅ Yes (30 free builds/mo) | Standalone `.apk` file for direct WhatsApp sharing to customers |

---

## Part 1: Setting up MongoDB Atlas (Cloud Database)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create Deployment** → Select **M0 (Free)** → Choose region **AWS / Mumbai (`ap-south-1`)** for lowest latency in India.
3. Under **Security Quickstart**:
   - Create a database user (e.g. `ovovita_admin` and a strong password).
   - Under **Network Access**, click **Add IP Address** → Choose **Allow Access from Anywhere (`0.0.0.0/0`)** so your cloud API server can connect.
4. Click **Connect** → **Drivers** (Node.js) → Copy the connection string:
   ```text
   mongodb+srv://ovovita_admin:<password>@cluster0.xxxxx.mongodb.net/ovovita?retryWrites=true&w=majority
   ```
5. Seed your production database with products and Bangalore hubs:
   ```powershell
   $env:MONGODB_URI="mongodb+srv://ovovita_admin:<password>@cluster0.xxxxx.mongodb.net/ovovita?retryWrites=true&w=majority"
   npm run seed
   ```

---

## Part 2: Deploying the Backend API (e.g. on Railway or Render)

### Option A: Railway (Fastest, 2 minutes)
1. Push your code to GitHub.
2. Sign in to [Railway.app](https://railway.app) with GitHub.
3. Click **New Project** → **Deploy from GitHub repo** → Select your repository.
4. Under **Settings**:
   - **Root Directory:** `/` (leave as root)
   - **Build Command:** `npm install; npm run build`
   - **Start Command:** `node apps/api-server/dist/server.js`
5. Under **Variables**, add:
   ```text
   NODE_ENV=production
   PORT=4000
   MONGODB_URI=mongodb+srv://ovovita_admin:<password>@cluster0.xxxxx.mongodb.net/ovovita?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_production_key_here
   CORS_ALLOWED_ORIGINS=https://admin.yourdomain.com,https://app.yourdomain.com
   ```
6. Click **Generate Domain** (e.g. `https://ovovita-api.up.railway.app`).  
   Your Swagger API docs will be live at `https://ovovita-api.up.railway.app/api/v1/docs`!

---

## Part 3: Deploying Frontends on Vercel

### 1. Customer Mobile PWA (`apps/mobile`)
1. In Vercel, click **Add New** → **Project** → Import your GitHub repository.
2. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `apps/mobile`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   ```text
   VITE_API_URL=https://ovovita-api.up.railway.app/api/v1
   ```
4. Click **Deploy**. Vercel will assign a URL like `https://ovovita-mobile.vercel.app`.

### 2. Admin Depot Portal (`apps/admin-portal`)
1. Click **Add New** → **Project** → Import the same repository.
2. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `apps/admin-portal`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   ```text
   VITE_API_URL=https://ovovita-api.up.railway.app/api/v1
   ```
4. Click **Deploy**.

---

## Part 4: Generating Standalone Android APK for Customers

Your client can distribute the app **directly to customers via WhatsApp or a download link** as a standard Android APK without needing Google Play Store approval first.

### Step-by-Step APK Generation:
1. Install EAS CLI globally on your machine:
   ```powershell
   npm install -g eas-cli
   ```
2. Log into your free Expo account (create one at [expo.dev](https://expo.dev) if you don't have one):
   ```powershell
   eas login
   ```
3. Navigate to the mobile directory and trigger the standalone APK build:
   ```powershell
   cd apps/expo-mobile
   eas build -p android --profile preview
   ```
4. Expo's cloud build servers will compile the APK automatically (takes ~5-8 minutes).
5. When complete, EAS will print a direct download link:
   ```text
   ✔ Build artifact: https://expo.dev/artifacts/eas/.../ovovita.apk
   ```
6. **How the client shares it with customers:**
   - Share the direct download link via WhatsApp or SMS.
   - Or download `ovovita.apk` and send the file directly in WhatsApp groups or customer chats.
   - The customer taps the APK file, clicks **Install**, and the native app is immediately on their phone!

---

## Part 5: One-Click PWA Installation (Instant Alternative)

Every customer on Android or iPhone can also install the app **instantly without downloading a separate file**:
1. Customer visits the mobile web URL (e.g. `https://ovovita-mobile.vercel.app`) in Chrome or Safari.
2. Chrome automatically prompts: **"Install Ovovita App"** (or customer taps the 3 dots → **Add to Home screen**).
3. The app is installed as a full-screen, standalone app on their phone with offline support for basement parking and elevators!

---

## 🔑 Production Demo Accounts

| Role | Mobile Number | Password / PIN | Capabilities |
| :--- | :--- | :--- | :--- |
| **Customer** | `9876543210` | OTP: `123456` | Ordering, slot booking, live tracker, re-ordering |
| **Depot Lead (Koramangala)** | `9876500001` | PIN: `1234` | Packing queue, rider dispatch, price updates, shift cash close |
| **Depot Lead (Indiranagar)** | `9876500011` | PIN: `1234` | Indiranagar hub oversight & drawer balancing |
| **Depot Lead (Whitefield)** | `9876500021` | PIN: `1234` | Whitefield tech hub oversight & dispatch |
| **Delivery Executive** | `9876500002` | PIN: `1234` | Driver POS, Dynamic UPI QR, zero-crack buffer replacement |
| **System Admin** | `9876500000` | PIN: `1234` | Global system control across all depots & pricing |

---

## 🐳 Self-Hosted Docker Deployment (Alternative to Cloud Platforms)

If your client has a dedicated Linux VPS (DigitalOcean, Hetzner, AWS EC2):
```bash
# Clone and boot the entire stack (Database, Cache, API, Admin, Mobile)
git clone <repo_url>
cd ovovita
docker compose -f docker-compose.prod.yml up --build -d
```
All services will boot together:
- `http://your-server-ip:4000` — API Server & Swagger Docs
- `http://your-server-ip:80` — Admin Depot Portal
- `http://your-server-ip:8080` — Customer Mobile PWA
