# SEYO — API Reference & Endpoints

All endpoints respond with standardized JSON envelopes:
```json
{
  "success": true,
  "...payload": "..."
}
```
Errors respond with HTTP 4xx/5xx and error codes:
```json
{
  "success": false,
  "code": "INVALID_STAFF_PIN",
  "message": "The 4-digit staff verification PIN is incorrect"
}
```

---

## 1. Onboarding API (`/api/onboarding/*`)

### `POST /api/onboarding/create-magic-link`
Triggered upon merchant purchase on the marketing site.
* **Body:**
  - `email`: `string`
  - `tier`: `'spin' | 'loyalty' | 'review' | 'combined'`
* **Response:**
  - `setupUrl`: `/setup?token=<crypto-token>` (15-min TTL)
  - `rawToken`: `string`
  - `expiresAt`: ISO 8601 UTC

### `GET /api/onboarding/verify-magic-link?token=...`
Verifies magic link and issues an authorized 24-hour `onboardingSession`.

### `GET /api/onboarding/session-state`
Resumes ongoing onboarding session with exact step (`profile`, `logo`, `configuration`, `security`, `confirmation`).

### `PUT /api/onboarding/step`
Saves draft data for the current step and advances step.

### `POST /api/onboarding/launch`
Re-validates everything server-side and atomically creates Business + Offer + Permanent Entries + Staff Session.

---

## 2. Entry & Resolution API (`/api/entry/*`)

### `GET /api/entry/resolve/:identifier?type=qr|nfc`
Resolves merchant entry by slug (e.g., `bella-napoli`) or permanent hardware code (e.g., `BN-QR-COUNTER`).
* Returns active offer status, business public profile, and customer session token.

---

## 3. Customer Authentication API (`/api/auth/*`)

### `POST /api/auth/customer/otp/request`
* **Body:** `{ "businessId": "...", "mobile": "...", "countryCode": "+1" }`
* Generates 6-digit OTP (demo fallback `123456`).

### `POST /api/auth/customer/otp/verify`
* **Body:** `{ "businessId": "...", "mobile": "...", "otp": "...", "name": "..." }`
* Identifies or creates customer record scoped to `businessId + mobile`.

---

## 4. Customer Engagement API (`/api/customer/*`)

### `GET /api/customer/status/:slug`
Evaluates and returns first incomplete stage, active rewards, and cooldown status.

### `POST /api/customer/spin`
* **Body:** `{ "businessId": "...", "customerId": "..." }`
* Server-authoritative cryptographically secure weighted reward selection. Issues unique voucher code.

### `POST /api/customer/loyalty/stamp`
* **Body:** `{ "businessId": "...", "customerId": "..." }`
* Increments cycle `visitCount` and lifetime `totalVisits`. Triggers milestone reward when target reached.

### `POST /api/customer/review/persist`
* **Body:** `{ "businessId": "...", "customerId": "...", "rating": 5, "tags": [...], "reviewText": "..." }`
* Persists customer feedback before Google Maps handoff.

### `GET /api/customer/top-rankers/:slug`
* Returns Top 5 Loyal Legends sorted by `totalVisits`, with masked mobiles (`******1234`).

---

## 5. Staff Terminal API (`/api/staff/*`)

### `POST /api/staff/login`
* **Body:** `{ "identifier": "owner@bellanapoli.com", "password": "..." }`

### `GET /api/staff/terminal-data` (Protected via Bearer or `x-staff-session`)
* Returns full business profile, active offer metrics, loyalty records, reward history, and generated QR data URLs.

### `POST /api/staff/redeem-voucher`
* **Body:** `{ "voucherCode": "SY-7X9K", "staffPin": "7788" }`
* Validates 4-digit staff PIN and marks voucher redeemed atomically.
