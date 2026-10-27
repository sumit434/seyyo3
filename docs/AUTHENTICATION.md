# SEYYO — Authentication & MSG91 OTP Integration

## 1. Architectural Strategy

Customer authentication in SEYYO is structured behind an abstraction layer (`useAuthMode` and `CustomerAuthFlow` on the client, `CustomerAuthService` and `msg91Service` on the backend).

This design ensures:
1. **Zero Vendor Lock-In:** The underlying identity provider (MSG91 WhatsApp/SMS OTP, custom gateway, or direct customer identification) can be toggled without rewriting the customer journey, wheel UI, or loyalty trackers.
2. **Frictionless Onboarding with Muted State (Default):** In local development and automated testing, live phone OTP verification is muted by default (`ENABLE_PHONE_OTP=false`). Customer check-ins proceed immediately without waiting for SMS or WhatsApp codes.
3. **Production-Ready Multi-Channel Fallback:** When activated, MSG91 SendOTP utilizes WhatsApp as the primary communication channel and automatically falls back to SMS.

---

## 2. Configuration & Activation

Control MSG91 live phone OTP verification using environment variables in `.env`:

```env
# Master Toggle: Set to "true" to activate live WhatsApp/SMS OTP
# Defaults to "false" (muted/bypass state) for frictionless customer onboarding
ENABLE_PHONE_OTP="false"

# MSG91 Credentials
MSG91_AUTH_KEY="your_msg91_auth_key"
MSG91_OTP_TEMPLATE_ID="your_otp_template_id"
MSG91_INTEGRATED_NUMBER="your_integrated_whatsapp_number"
```

---

## 3. Bypass & Mute Mechanism

### Backend Routing & Service (`msg91Service.ts`, `customerAuth.ts`)
* **When `ENABLE_PHONE_OTP === 'true'`:**
  - `sendOtp(phone)` sends a real-time OTP challenge with WhatsApp as the primary channel and SMS fallback.
  - `verifyOtp(phone, otp)` calls MSG91 verify API to validate the customer's 6-digit code.
* **When `ENABLE_PHONE_OTP !== 'true'` (Muted/Bypass State):**
  - External endpoints are never called.
  - `sendOtp` returns `{ success: true, verified: true, bypass: true }`.
  - Customer session generation occurs instantly without blocking.

### Frontend Integration (`CustomerAuthFlow.tsx`)
* The client sends the phone number to `/api/auth/send-otp`.
* When the backend responds with `bypass: true` (the default state), `CustomerAuthFlow.tsx` automatically skips the 6-digit OTP entry step and advances straight into the customer reward journey.
* When `ENABLE_PHONE_OTP === 'true'`, the 6-digit verification code input is rendered, allowing the customer to enter the code received on WhatsApp or SMS.

---

## 4. Testing & Verification

* In muted mode (`ENABLE_PHONE_OTP=false`), any 10-digit number (e.g. `555 123 4567`) logs in immediately.
* If testing the OTP UI locally with `ENABLE_PHONE_OTP=true`, development fallback code `123456` is accepted for testing without burning API credits.
