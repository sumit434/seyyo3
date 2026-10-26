# SEYO — System Architecture Documentation

## 1. High-Level Architectural Overview

SEYO is a multi-tenant QR/NFC customer loyalty and engagement platform organized around server-authoritative customer status evaluation and four distinct merchant product tiers:
1. `spin` — 100% all-win gamified reward wheels
2. `loyalty` — Digital visit milestone stamp cards
3. `review` — Google Review accelerator with prior server persistence
4. `combined` — 3-in-1 automated sequence with smart skipping

```text
                     PERMANENT ENTRY
              (Printed QR / Table NFC / Link)
                            │
                            ▼
                  MERCHANT ENTRY RESOLVE
                            │
                            ▼
                     ACTIVE OFFER?
                      /          \
                    NO            YES
                    ↓              ↓
             NO-OFFER SCREEN  CUSTOMER AUTH (Mobile + OTP)
                                   │
                                   ▼
                         CUSTOMER STATUS ENGINE
                         (Merchant Timezone Aware)
                                   │
             ┌─────────────────────┼─────────────────────┐
             ▼                     ▼                     ▼
           SPIN                 LOYALTY                REVIEW
             │                     │                     │
             └─────────────────────┼─────────────────────┘
                                   ▼
                        FIRST INCOMPLETE STAGE
                                   │
                                   ▼
                         MIDNIGHT COOLDOWN
```

## 2. Permanent Entry vs. Short-Lived Session Separation

* **Permanent Merchant Entry (`MerchantEntry`):**
  - Encoded on physical NFC stickers and printed table tents.
  - Resolves `businessId`, `businessSlug`, and `targetTier`.
  - Never expires, never consumed by a single guest.

* **Short-Lived Customer Session (`CustomerSession`):**
  - Cryptographically secure 32-byte hex token.
  - 30-minute TTL.
  - Binds guest identity, business identity, and journey progression.
  - Replay-protected: URLs sanitize sensitive keys via `window.history.replaceState`.

## 3. Merchant Timezone Authority

All daily calendar calculations (`isSameMerchantDay`, daily spin reset, daily loyalty stamp limit, midnight cooldown) use the merchant's operational IANA timezone (e.g., `America/New_York`, `Asia/Tokyo`, `Europe/London`). Browser client clocks are strictly non-authoritative.
