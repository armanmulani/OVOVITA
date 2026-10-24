# Ovovita Security Review — Authentication & API Surface

**Date:** 2026-10-22
**Scope:** API server auth surface (Better Auth phone OTP, staff PIN login, order access control, WhatsApp webhook, CORS, rate limiting).
**Method:** ECC `security-review` skill checklist applied by reading each surface, plus targeted code tracing. Every finding below was verified against the source, not assumed.

---

## Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Demo OTP `123456` fail-open on `NODE_ENV` | **CRITICAL** | ✅ Fixed |
| 2 | Hardcoded JWT secret fallback in production | **CRITICAL** | ✅ Fixed |
| 3 | OTP attempt counter raced (read-modify-write) | **HIGH** | ✅ Fixed |
| 4 | Demo OTP accepted with no verification row | **HIGH** | ✅ Fixed |
| 5 | Public order routes leaked customer PII | **HIGH** | ✅ Fixed |
| 6 | WhatsApp webhook trusted any POST | **HIGH** | ✅ Fixed |
| 7 | CORS reflected every origin | **MEDIUM** | ✅ Fixed |
| 8 | No per-account rate limit on OTP verify / PIN | **MEDIUM** | ✅ Fixed |
| 9 | OTP single-use race on success path | **MEDIUM** | ✅ Fixed |
| 10 | Staff role taken from request body | **LOW** | Accepted (not exploitable) |
| 11 | JWT stored in `localStorage` | **LOW** | Accepted (documented) |
| 12 | Rate limiter is in-memory | **LOW** | Accepted (documented) |
| 13 | OTP + phone number logged in console | **LOW** | Accepted (dev-only path) |

---

## Fixed findings

### 1. CRITICAL — Demo OTP fail-open on `NODE_ENV`

**Was:** `createOtpVerifier(config.nodeEnv === 'production')` — the fixed code `123456` was
accepted whenever `NODE_ENV` was anything other than the exact string `production`.
`config.nodeEnv` defaults to `'development'`, so a production host that forgot to set
`NODE_ENV=production` silently accepted a publicly known OTP for **every** customer account.

**Now:** the demo code is gated behind an explicit opt-in, `ALLOW_DEMO_OTP=true`, which
defaults to **off**. A production host that forgets any environment variable now gets a
secure-by-default posture instead of an open one.

- `apps/api-server/src/config/index.ts` — new `allowDemoOtp` flag, default `false`
- `apps/api-server/src/config/better-auth.ts` — passes `config.allowDemoOtp`
- `.env.example` / `.env` — documented, local-only

### 2. CRITICAL — Hardcoded JWT secret fallback

**Was:** `jwtSecret: process.env.JWT_SECRET || 'ovovita-super-secure-jwt-secret-farm-direct-2026'`
— the fallback is committed to the repository, so a production host without `JWT_SECRET`
minted tokens signed with a public key. Anyone could forge a token with
`role: 'SYSTEM_ADMIN'`.

**Now:** `resolveJwtSecret()` throws at startup in production if `JWT_SECRET` is missing or
shorter than 32 characters. The API refuses to boot rather than run insecurely.

- `apps/api-server/src/config/index.ts`

### 3. HIGH — OTP attempt counter raced

**Was:** `otpVerifier.ts` read the counter out of the `value` string
(`<code>:<attempts>`) and wrote back `${storedCode}:${attempts + 1}` — a
read-modify-write. Ten concurrent wrong guesses all read `attempts = 0` and all wrote
`1`, so the attempt budget was effectively unlimited under parallelism.

**Now:** the counter lives in its own `attempts` field on the verification document and
is incremented with a single atomic `$inc` guarded by `attempts: { $lt: MAX_ATTEMPTS }`.
Concurrent wrong guesses each consume one unit of the budget, and once the budget is
spent the row is destroyed.

- `apps/api-server/src/config/otpVerifier.ts`
- `apps/api-server/src/models/betterAuthModels.ts` — new `attempts` field

### 4. HIGH — Demo OTP accepted with no verification row

**Was:** when no verification row existed, the verifier returned
`!isProduction && code === '123456'` — the demo code worked **without ever requesting an
OTP**, and unboundedly.

**Now:** a code is only valid against an outstanding, unexpired request for that number.
This also removes the "skip the request step" path entirely.

### 5. HIGH — Public order routes leaked customer PII

**Was:** `GET /orders/:id/tracking` and `GET /orders/:id/upi-qr` had **no auth at all** and
returned the whole order document — customer name, phone, full address, driver name,
vehicle plate, and the amount owed. The ObjectId is the only secret.

**Now:** both routes require a JWT and are restricted to the order's own customer or to
staff. Customers receive a trimmed projection without the internal status timeline,
payment bookkeeping or staff ids.

- `apps/api-server/src/routes/orderRoutes.ts`
- `apps/api-server/src/controllers/orderController.ts`

### 6. HIGH — WhatsApp webhook trusted any POST

**Was:** `POST /api/v1/webhooks/whatsapp` accepted any body. The bot replies with the
customer's order number, rider name, ETA and amount due — so anyone who found the URL
could query any order by phone number.

**Now:** the inbound webhook verifies Meta's `X-Hub-Signature-256` header (HMAC-SHA256
over the raw body, timing-safe comparison) and returns 401 on mismatch. The raw body is
captured before JSON parsing so the signature is computed over the exact bytes Meta sent.
When `META_APP_SECRET` is unset the check is skipped and a warning is logged — which is
the deployment checklist's job to prevent.

- `apps/api-server/src/app.ts` — raw body capture
- `apps/api-server/src/controllers/webhookController.ts` — signature verification

### 7. MEDIUM — CORS reflected every origin

**Was:** `app.use(cors())` with no options reflected `Access-Control-Allow-Origin: *`,
while `config.corsAllowedOrigins` was used only for Better Auth's `trustedOrigins` — an
inconsistency.

**Now:** CORS is restricted to `config.corsAllowedOrigins`, the same list Better Auth
trusts, with explicit methods and `credentials: true`.

### 8. MEDIUM — No per-account rate limit on verification

**Was:** the rate limiter keyed on IP only. An attacker rotating source addresses had no
per-account cap on OTP guesses or PIN guesses.

**Now:** two additional limiters key on the **normalised phone number** — 10 verification
attempts per number per 15 minutes, and 10 PIN attempts per number per 15 minutes. The
number is normalised to its bare national form so toggling between `9876543210` and
`+919876543210` cannot sidestep the limit.

- `apps/api-server/src/middleware/rateLimitMiddleware.ts`
- `apps/api-server/src/routes/authRoutes.ts`

### 9. MEDIUM — OTP single-use race on the success path

**Was:** the success path used `deleteOne` and returned `true` unconditionally, so two
concurrent submissions of the same valid code could both succeed.

**Now:** the success path uses `findOneAndDelete` and returns whether the row was actually
consumed. Only the request that wins the delete is authorised.

---

## Accepted findings (not exploitable as-is; documented rather than changed)

### 10. LOW — Staff role supplied by the client

`POST /auth/staff/login` takes `role` from the body and uses it in the user lookup.
This is **not** a privilege escalation: the PIN is still compared against the hash of the
account that matches that exact phone+role pair, so a client cannot claim a role it does
not hold. It does mean the login form is role-specific. Worth revisiting, but changing it
now would alter the mobile driver's sign-in path mid-handover.

### 11. LOW — JWT in `localStorage`

Both frontends store the JWT in `localStorage` (`ovovita_token`, `ovovita_mobile_token`).
This is XSS-exposed. The alternative — httpOnly cookies — is a real improvement but
requires a CSRF story and a change to both frontends' request layer. Deferred, and
called out in the handoff limitations.

### 12. LOW — Rate limiter state is in-memory

`rateLimitStore` is a `Map` in the API process. It resets on restart and is per-instance,
so a multi-instance deployment gets N× the effective limit. Acceptable for the current
single-instance deployment; would need Redis (already a dependency) to scale out.

### 13. LOW — OTP and phone number logged in development

`sendOTP` logs the generated code, and the auth controller logs phone numbers. This is
intentional for local debugging and only reached on the non-production path. It should be
removed before enabling real SMS delivery in production.

---

## Verified as already sound

- **No regex injection** in the phone lookup. `toNationalNumber()` strips every
  non-digit, so the `$regex` built from it can only ever contain digits — a crafted
  phone number cannot widen the pattern to match other users' records.
- **Input validation** is applied via Zod on every mutating route
  (`CreateOrderSchema`, `AdjustBrokenEggsSchema`, `DoorstepPaymentCollectSchema`,
  `StaffLoginSchema`, …) through the `validateBody` middleware.
- **Mongoose** is used for all queries — no string-concatenated SQL anywhere.
- **The atomic stock decrement** uses a guarded conditional update
  (`currentStock: { $gte: required }` + `$inc`) and compensates with a saga rollback on
  standalone MongoDB.
- **`.env` is gitignored** (`.gitignore:22`) and no real credential is committed.

---

## Recommended before going live

1. Generate a real `JWT_SECRET` (32+ chars) and `BETTER_AUTH_SECRET`; keep
   `ALLOW_DEMO_OTP` unset.
2. Set `META_APP_SECRET` if WhatsApp is enabled.
3. Serve over HTTPS so `useSecureCookies` and `SameSite` behave as designed.
4. Consider moving the JWT to an httpOnly cookie (finding 11) and the rate-limit store
   to Redis (finding 12) before scaling beyond one instance.
