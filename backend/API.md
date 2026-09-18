# BPCL Fuel Cashback — API Documentation

Base URL: `http://localhost:4000/api`

All request/response bodies are JSON. Authenticated endpoints require
`Authorization: Bearer <token>` from `/auth/login`. Money and litre values
are transmitted as **decimal strings** (e.g. `"27.50"`), never floats.

Errors are always shaped as:
```json
{ "error": { "code": "OTP_EXPIRED", "message": "...", "details": {} } }
```

---
## Auth

### POST /auth/login
Auth: none · Rate-limited (10/15min)
Body: `{ "email": string, "password": string }`
200: `{ "token": string, "user": { id, name, email, role } }`
Errors: `UNAUTHORIZED` (401)

### POST /auth/logout
Auth: Bearer · 204 No Content

### GET /auth/me
Auth: Bearer · 200: `{ id, name, email, role }`

---
## Customers

### POST /customers/search
Auth: none (operator flow) — vehicle lookup at the mobile app's first screen.
Body: `{ "vehicleNumber": string }`
200: `{ "found": false }` or `{ "found": true, "customer": CustomerWithSummary }`

### POST /customers
Auth: none — creates a customer, but ONLY after OTP has been verified.
Body: `{ vehicleNumber, mobileNumber, fuelType, otpId, otpCode }`
201: `CustomerWithSummary`
Errors: `DUPLICATE_CUSTOMER` (409), `OTP_INVALID`/`OTP_EXPIRED`/`OTP_ATTEMPTS_EXCEEDED`

### GET /customers
Auth: Bearer (admin). Query: `vehicleNumber, mobileNumber, fuelType, eligibleOnly, page, pageSize`
200: `{ total, page, pageSize, customers: CustomerWithSummary[] }`

### GET /customers/:id
Auth: Bearer · 200: `CustomerWithSummary`

### GET /customers/:id/transactions
Auth: Bearer · 200: `{ total, page, pageSize, transactions: FuelTransaction[] }`

### PUT /customers/:id
Auth: Bearer. Body: `{ vehicleNumber?, mobileNumber?, fuelType?, reason? }`
200: `CustomerWithSummary` (totals recalculated if fuelType changed)

### DELETE /customers/:id
Auth: Bearer · Soft delete · 204 No Content

`CustomerWithSummary` shape:
```json
{
  "id": "uuid", "vehicleNumber": "MH15AB1234", "mobileNumber": "9876543210",
  "fuelType": "PETROL", "isVerified": true, "createdAt": "...", "updatedAt": "...",
  "summary": {
    "totalLitres": "55.00", "cashbackGenerated": "27.50", "eligible": true,
    "cashbackRedeemed": "0.00", "availableCashback": "27.50"
  }
}
```

---
## Fuel Transactions

### POST /transactions
Auth: none (operator ADD button). Body: `{ customerId, litres, idempotencyKey? }`
201: `{ transactionId, customer: CustomerWithSummary }`
Errors: `INVALID_LITRES`, `CUSTOMER_NOT_FOUND`
Note: pass a stable `idempotencyKey` per tap to survive double-submits on slow networks.

### GET /transactions
Auth: Bearer. Query: `customerId?, page?, pageSize?`

### GET /transactions/:id
Auth: Bearer

### PUT /transactions/:id
Auth: Bearer (admin edit). Body: `{ litres?, transactionDate?, reason? }`
200: `CustomerWithSummary` (recalculated). Creates an AUDIT_LOG UPDATE entry.

### DELETE /transactions/:id
Auth: Bearer · Soft delete, recalculates and returns `CustomerWithSummary`.

---
## OTP

### POST /otp/send
Rate-limited (5/min). Body: `{ mobileNumber, purpose: 'CUSTOMER_VERIFICATION'|'REDEMPTION', customerId? }`
200: `{ otpId, expiresAt, resendAvailableAt }` — code itself is never returned.
Errors: `OTP_RESEND_TOO_SOON` (429)

### POST /otp/verify
Body: `{ otpId, code }` → 200: `{ verified: true, attemptsRemaining }`
Errors: `OTP_INVALID`, `OTP_EXPIRED`, `OTP_ATTEMPTS_EXCEEDED`

---
## Redemptions

State machine: `PENDING → OTP_VERIFIED → WHATSAPP_PENDING → WHATSAPP_VERIFIED → READER_PENDING → SUCCESS`
(or `FAILED`/`CANCELLED` at any step).

### POST /redemptions
Body: `{ customerId, amount?, idempotencyKey? }` (amount defaults to full available balance)
201: `Redemption` (status `PENDING`)
Errors: `NOT_ELIGIBLE_FOR_REDEMPTION`, `INSUFFICIENT_CASHBACK`, `DUPLICATE_REDEMPTION` (409, an in-flight redemption already exists)

### GET /redemptions
Auth: Bearer. Query: `customerId?, status?, page?`

### GET /redemptions/:id

### POST /redemptions/:id/otp/send
Sends the redemption OTP → `{ otpId, expiresAt, resendAvailableAt }`

### POST /redemptions/:id/otp/verify
Body: `{ otpId, code }` → advances to `OTP_VERIFIED`

### POST /redemptions/:id/whatsapp
Sends + verifies WhatsApp notification → advances to `WHATSAPP_VERIFIED` or fails with `WHATSAPP_FAILED` (502)

### POST /redemptions/:id/reader
Runs the (mock) physical reader transaction → on success advances to `SUCCESS` and returns
`{ redemption, customer: CustomerWithSummary }` with the now-reduced available cashback.
On failure: `READER_FAILED` (502) or `READER_TIMEOUT` (504), redemption marked `FAILED`.

### POST /redemptions/:id/cancel
Auth: Bearer optional (admin) or operator. Body: `{ reason? }`

---
## Admin

### GET /admin/dashboard
Auth: Bearer · Live aggregates: totals, recent transactions/redemptions. Never static/fake numbers.

### GET /admin/audit-logs
Auth: Bearer. Query: `entityType?, entityId?, action?, page?, pageSize?`

### GET /admin/export/customers | /admin/export/transactions | /admin/export/redemptions
Auth: Bearer · Streams a `.xlsx` file honoring the same filters as the list endpoints.

### GET /admin/settings/fuel-rules
Auth: Bearer · 200: `FuelRuleDTO[]`

### PUT /admin/settings/fuel-rules/:fuelType
Auth: Bearer, role `SUPER_ADMIN` only. Body: `{ redemptionThresholdLitres, cashbackRatePerLitre }`
Audited on every change.

---
## Error codes reference

| Code | HTTP | Meaning |
|---|---|---|
| VALIDATION_ERROR | 400 | Request body/query failed schema validation |
| UNAUTHORIZED | 401 | Missing/invalid/expired session |
| FORBIDDEN | 403 | Authenticated but insufficient role |
| CUSTOMER_NOT_FOUND | 404 | No active customer with that id/vehicle |
| DUPLICATE_CUSTOMER | 409 | Vehicle number already registered |
| INVALID_MOBILE / INVALID_VEHICLE_NUMBER / INVALID_LITRES | 400 | Field-level validation |
| OTP_INVALID / OTP_EXPIRED / OTP_ATTEMPTS_EXCEEDED | 400/429 | OTP verification failures |
| OTP_RESEND_TOO_SOON | 429 | Resend requested inside cooldown window |
| NOT_ELIGIBLE_FOR_REDEMPTION / INSUFFICIENT_CASHBACK | 422 | Redemption preconditions not met |
| DUPLICATE_REDEMPTION | 409 | A redemption is already in progress |
| INVALID_REDEMPTION_STATE | 409 | Step called out of order for current status |
| WHATSAPP_FAILED / READER_FAILED / READER_TIMEOUT | 502/504 | External step failed (mock or real) |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected server error (details never leaked to client) |
