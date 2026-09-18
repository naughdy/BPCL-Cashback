# BPCL Fuel Cashback — Full-Stack Reference Implementation

A production-shaped (not prototype) implementation of a fuel-station cashback
program: operators record fuel purchases from an Android app, customers
accrue and redeem cashback, and admins manage everything from a web
dashboard.

```
/backend      Node + TypeScript + Express + PostgreSQL + Prisma — REST API,
              business logic, OTP/WhatsApp/Reader integrations (mocked),
              audit logging, Excel export.
/admin-web    React + TypeScript + Tailwind — admin dashboard.
/mobile       React Native + TypeScript — Android operator app.
```

Each app has its own README-equivalent: `/backend/API.md` documents every
endpoint; this file covers the system as a whole.

---
## 1. Understanding of the flow

An operator at the pump enters a **vehicle number**. The backend is the
single source of truth for whether that vehicle is known:

- **Existing customer** → operator enters litres and taps **ADD** (creates a
  fuel transaction), or taps **REDEEM** if eligible.
- **New customer** → operator enters mobile number, fuel type, litres →
  **OTP verification** → customer + first transaction are created together.

**Eligibility & cashback** (configurable, defaults from the spec):

| Fuel | Threshold | Rate |
|---|---|---|
| Petrol | 50 L | ₹0.50 / L |
| Diesel | 100 L | ₹0.50 / L |

Cashback accrues on **total** litres once the threshold is crossed (e.g.
20 + 15 + 20 = 55 L Petrol → eligible → 55 × ₹0.50 = ₹27.50). Redeeming sets
`availableCashback` to the generated total minus what's been redeemed —
**historical transactions are never deleted or rewritten** to make the
numbers match; only a fresh admin edit to a specific transaction, with a
full recalculation, changes the totals.

**Redemption** is a resumable state machine:
`PENDING → OTP_VERIFIED → WHATSAPP_PENDING → WHATSAPP_VERIFIED → READER_PENDING → SUCCESS`
(or `FAILED`/`CANCELLED`). WhatsApp and the physical reader are external
integrations that aren't available yet, so both sit behind an interface
(`IWhatsAppService`, `IReaderService`) with a `Mock*Service` implementation
that **honestly simulates success and failure** — it never claims a
transaction happened when it didn't.

---
## 2. Database schema

See `/backend/prisma/schema.prisma` for the authoritative version. Core
entities, deliberately kept separate (a customer has *many* transactions and
*many* redemptions — never merged):

- **AdminUser** — web dashboard login, role (`ADMIN` / `SUPER_ADMIN`)
- **Customer** — vehicle/mobile/fuel type + **derived, recalculated**
  totals (`totalLitres`, `cashbackGenerated`, `cashbackRedeemed`,
  `availableCashback`)
- **FuelTransaction** — one row per litres-purchased event, snapshots
  vehicle/fuel type at the time, soft-deletable, `idempotencyKey` for
  double-submit protection
- **Redemption** — one row per redemption attempt, state-machine status,
  `referenceNumber`, OTP/WhatsApp/Reader sub-statuses
- **OtpVerification** — hashed code, expiry, attempts, purpose
- **FuelRule** — configurable threshold + rate per fuel type
- **AuditLog** — every admin mutation, old/new value, reason

All money/litre columns are `Decimal`, never floats.

---
## 3. API architecture

REST, JSON, JWT-authenticated for admin routes. Full reference:
**[`/backend/API.md`](./backend/API.md)**. Highlights:

- `POST /customers/search` — the vehicle-entry lookup
- `POST /customers` — create (requires a verified OTP)
- `POST /transactions` — the ADD button (idempotent)
- `POST /redemptions` + five step-endpoints (`/otp/send`, `/otp/verify`,
  `/whatsapp`, `/reader`, `/cancel`) — the REDEEM flow
- `GET /admin/dashboard`, `/admin/audit-logs`, `/admin/export/*`,
  `/admin/settings/fuel-rules`

The backend is the **only** place cashback is ever calculated
(`src/services/cashback.calculator.ts`) — the mobile app only ever displays
numbers the backend returned.

---
## 4. Mobile screens (React Native, Android)

Splash → Vehicle Search (BPCL branding + vehicle entry) → **[Existing
Customer](./mobile/src/screens/ExistingCustomerScreen.tsx)** or **[New
Customer](./mobile/src/screens/NewCustomerScreen.tsx)** → OTP Verification →
Transaction Success, and separately Redemption → Redemption OTP → WhatsApp
Verification → Reader Status → Redemption Result (success/failure combined).
Large touch targets (56px minimum), minimal navigation, loading/error states
throughout — see `/mobile/src/theme/tokens.ts`.

## 5. Admin web pages (React)

Login → Dashboard (live aggregates) → Customers (search/filter/paginate) →
Customer Detail (summary, editable transaction history, redemption history)
→ Transactions → Redemptions → Audit Logs → Export (.xlsx) → Settings
(fuel rules, `SUPER_ADMIN` only).

---
## 6. Business rules (configurable, not hardcoded)

Defaults live in `FuelRule` (DB-backed, editable via
`PUT /admin/settings/fuel-rules/:fuelType`), with a hardcoded fallback only
if the table is somehow empty. Changing the rate/threshold requires **no
mobile app release** — the backend recalculates every customer's eligibility
from these values on every read.

---
## 7. Project structure

```
backend/
  prisma/schema.prisma      data model
  prisma/seed.ts            dev seed data
  src/services/             business logic (cashback, customers, transactions,
                             redemptions, otp, whatsapp, reader, export, audit)
  src/routes/                REST endpoints
  src/middleware/            auth, validation, error handling
  tests/                     unit tests (18 passing, no DB required) +
                             integration test scaffold (needs Postgres)
  API.md                     full endpoint reference

admin-web/
  src/pages/                 9 pages (see above)
  src/api/                   typed API client
  src/components/            shared UI primitives

mobile/
  src/screens/                12 screens
  src/store/                  Redux Toolkit + RTK Query
  src/services (via api/)     same backend, typed client
  android/                    native Android project (Gradle)
```

---
## 8. Running it locally

### Backend
```bash
cd backend
cp .env.example .env        # edit DATABASE_URL for your Postgres instance
npm install
npx prisma generate
npx prisma migrate dev      # creates tables
npm run seed                # dev admin user + sample customers
npm run dev                 # http://localhost:4000
```
Dev admin login (seed only — **change before any real deployment**):
`admin@bpcl-cashback.dev` / `DevAdmin@123`

### Admin web
```bash
cd admin-web
cp .env.example .env        # VITE_API_BASE_URL
npm install
npm run dev                 # http://localhost:5173
```

### Mobile (Android)
```bash
cd mobile
npm install
# Point src/config.ts at your backend (10.0.2.2 = emulator's localhost)
npx react-native run-android
```

> **Sandbox note:** this was built in an environment without a reachable
> Postgres instance or access to `binaries.prisma.sh`/Android SDK, so
> `prisma generate`, DB-backed tests, and an actual Gradle/APK build could
> not be executed here. Backend business logic (18 tests) and the mobile
> app's pure-TypeScript logic are unit-tested and passing; both the
> admin-web and mobile apps **typecheck and build/bundle cleanly**
> (`tsc --noEmit`, `vite build`). Everything else — routes, screens, the
> Android Gradle project — was written and reviewed but not executed
> end-to-end. Run the steps above once and it should Just Work; the
> integration test at `backend/tests/redemption.integration.test.ts`
> documents how to exercise the full flow once Postgres is available.

---
## 9. Acceptance criteria (from spec PART 45)

The 31-step scenario — operator adds fuel, reaches threshold, redeems
through OTP/WhatsApp/Reader, admin edits a transaction and totals
recalculate, audit log records it, admin exports to Excel — is implemented
end-to-end across the three apps above. Business-rule correctness (49L/50L
Petrol, 99L/100L Diesel, the ₹27.50 worked example) is pinned down by
automated tests in `backend/tests/cashback.calculator.test.ts`.

## 10. Deliberate simplifications (documented per spec PART 44)

- Operator devices aren't individually authenticated (no login screen on
  mobile) — the spec's flow doesn't describe an operator login, only an
  admin one. In production, add a device/operator token to the
  vehicle-search and transaction endpoints.
- Vehicle number validation is normalization-only (strip punctuation,
  uppercase), not a strict Indian RTO regex — real plates vary too much
  (BH-series, defence, temporary) to hardcode safely.
- Mock OTP/WhatsApp/Reader services are wired via a plain interface swap
  (`IOtpService`, `IWhatsAppService`, `IReaderService`); replacing them with
  real providers is a one-file change per service, no call-site changes.
