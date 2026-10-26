# SEYO — Merchant Loyalty & Customer Engagement Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-QR%20%2F%20NFC-0e7c66.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](#)
[![Node](https://img.shields.io/badge/Node.js-18%2B%20%2F%2022-green.svg)](#)

SEYO is a multi-tenant QR/NFC customer engagement platform engineered to industrial-grade standards. It powers four merchant product tiers (**Spin**, **Loyalty**, **Review**, and **Combined**) with cryptographic magic-link onboarding, server-authoritative customer status evaluation, unified voucher deferral routing, a non-disruptive 365-day subscription lifecycle with instant reactive renewal, and on-premise staff terminal verification.

---

## Table of Contents

1. [Key Features](#1-key-features)
2. [Product Tiers](#2-product-tiers)
3. [Architecture & Subscription Lifecycle](#3-architecture--subscription-lifecycle)
4. [Quick Start & Setup Instructions](#4-quick-start--setup-instructions)
5. [Pre-Seeded Interactive Demos](#5-pre-seeded-interactive-demos)
6. [API Documentation](#6-api-documentation)
7. [Deployment Guidelines](#7-deployment-guidelines)
8. [Folder Structure](#8-folder-structure)

---

## 1. Key Features

* **Multi-Tenant Isolation:** All data access is strictly scoped to `businessId`. Customer profiles are indexed by `businessId + mobile`, allowing customers to belong to multiple merchants independently.
* **Separation of Permanent Entry & Short-Lived Sessions:**
  * **Permanent Entry:** Merchant hardware NFC tags and printed QR codes never expire.
  * **Customer Session:** Short-lived 30-minute cryptographic session tokens prevent replay attacks. Sensitive query keys (`sk`, `key`, `token`, `sessionKey`) are stripped from URLs on initial load.
* **Server-Authoritative Status Engine:** The backend computes customer eligibility and directs them to the **first incomplete stage**:
  $$\text{Spin} \longrightarrow \text{Loyalty} \longrightarrow \text{Review} \longrightarrow \text{Cooldown}$$
* **Unified Voucher Deferral & Review Accelerator:** When customers click "Skip and continue" on reward vouchers across **Spin**, **Loyalty**, and **Combined** tiers, the flow matches a redemption: routing directly to the **Review Accelerator** (if they have never entered/completed review lifetime-once) before entering midnight cooldown.
* **Merchant Subscription Lifecycle & Non-Destructive Campaign Pausing:**
  * **Server-Authoritative UTC Tracking:** Every merchant receives a 365-day license (`subscriptionExpiresAt`). Status transitions through `'active'` $\rightarrow$ `'expiring_soon'` ($\le 15$ days) $\rightarrow$ `'expired'`.
  * **15-Day Warning Banner:** When $\le 15$ days remain, a top alert displays remaining days with an inline **[ Renew Now ]** action.
  * **Day 0 "Last Day" Banner:** During the final 24 hours of active access, an urgent warning banner reminds merchants that today is their last day.
  * **Day 0 Full-Screen Lockout Card:** If expired, the dashboard interactivity is gated with a clear lockout screen detailing their tier plan and providing a **[ Pay & Reactivate ]** button.
  * **Instant Reactive Unlock:** Completing renewal instantly refreshes terminal state via API, unmounting the lockout screen with zero hard browser refresh.
  * **Safe Campaign Pausing:** When expired, customer NFC/QR scans receive a branded paused notice (*"Campaign Currently Paused — Please check back soon"*). All customer records, stamps, and history remain safely preserved in the database.
  * **Graceful Legacy Fallback:** Existing accounts or profiles without explicit expiry timestamps are safely treated as active.
* **Pure Mobile Phone OTP & Instant Dev Bypass:** Native phone authentication with E.164 normalization, MSG91 SMS gateway integration, and instant development OTP bypass (`123456`) with zero external OAuth dependencies.
* **Merchant Timezone Boundary:** All daily resets, spin cooldowns, and stamp rules calculate against the merchant's operational IANA timezone.
* **Resumable Permanent Wizard Onboarding:** Merchants purchase a tier on the marketing site, verify via an encrypted 15-minute magic link, and transition into a permanent authorized session so setup can be resumed at any time without expiry locks.
* **Influencer & Campaign Attribution (Short.io Compatible):** Captures attribution parameters (`?ref=`, `?utm_source=`, `?utm_medium=`, `?utm_campaign=`) via resilient storage fallbacks, attaches them to the onboarding token, and permanently tags the created merchant business.
* **Interactive Client Demo Simulation (`/demo`):** Zero-database client sandbox faithfully replicating customer journeys, spin wheel physics, stamp collection, and deferral/review transitions.
* **Mobile-Optimized Touch Interfaces:** Responsive touch targets ($\ge 44$px), in-flow modal action buttons, non-clipping combo headers, and adaptive stacked grid layouts tailored for mobile viewports.
* **Offer Immutability:** Once an offer status is `active`, backend endpoints reject all configuration mutation attempts. To modify rules, an offer must be cancelled and re-created.
* **Staff Terminal & 4-Digit PIN Security:** Staff verify reward redemptions on-site using a hashed 4-digit PIN.

---

## 2. Product Tiers

| Tier | Core Modules | Target Audience | Highlights |
| :--- | :--- | :--- | :--- |
| **`spin`** | Spin & Win | Cafes, Bars, Food Trucks | 2–7 slices, 100% all-win guaranteed, cryptographically random reward selection. |
| **`loyalty`** | Digital Stamps | Restaurants, Salons, Gyms | 3–365 visits target, 3–365 validation days (independent!), lifetime visits leaderboard. |
| **`review`** | Google Reviews | Boutiques, Local Services | Pre-handoff server feedback persistence, 1-tap clipboard copying, Google Maps redirect. |
| **`combined`** | Full 3-in-1 Suite | High-volume Hospitality & Retail | Automated progression, smart stage skipping, express loyalty QR bypass. |

---

## 3. Architecture & Subscription Lifecycle

```text
                  CUSTOMER HARDWARE TAP
             (Physical NFC Tag / Counter QR)
                            │
                            ▼
                  MERCHANT SUBSCRIPTION
                 EXPIRED / PAUSED CHECK
                  /                \
             EXPIRED              ACTIVE
                ↓                    ↓
         CAMPAIGN PAUSED      CUSTOMER AUTH
         (Branded Notice)     (Phone OTP / 123456 Dev Bypass)
                                     │
                                     ▼
                           CUSTOMER STATUS ENGINE
                           (Merchant Timezone Aware)
                                     │
               ┌─────────────────────┼─────────────────────┐
               ▼                     ▼                     ▼
             SPIN                 LOYALTY                REVIEW
        (100% All-Win)       (1 Stamp / Day)      (Server Persisted)
               │                     │                     │
               └──────────┬──────────┘                     │
                          ▼                                │
              REWARD VOUCHER PRESENTED                     │
          (Redeem & Continue / Skip & Continue)            │
                          │                                │
         HAS ENTERED REVIEW ACCELERATOR BEFORE?            │
                      /        \                           │
                    NO          YES                        │
                    ↓            ↓                         │
            REVIEW ACCELERATOR   │                         │
                    │            │                         │
                    └────────────┼─────────────────────────┘
                                 ▼
                         MIDNIGHT COOLDOWN
                   (+ Top 5 Loyal Legends Modal)
```

### Staff Terminal Subscription State Machine

| Days Remaining | `subscription.status` | Terminal UI Presentation | Customer Public Entry |
| :--- | :--- | :--- | :--- |
| $> 15$ days | `'active'` | Standard Terminal with active metrics & QR downloads | Active Campaign |
| $1 \dots 15$ days | `'expiring_soon'` | Top Warning Banner (`⚠️ Your subscription expires in X days`) + **[ Renew Now ]** | Active Campaign |
| $0$ days ($< 24$h) | `'expiring_soon'` (`isLastDay: true`) | Urgent Top Banner (`⚠️ Last day of your subscription. Renew today...`) | Active Campaign |
| $\le 0$ days | `'expired'` (`isExpired: true`) | Full-screen Centered Renewal Lockout Card + **[ Pay & Reactivate ]** | Paused Campaign Notice |

### Security Specifications
* **Cryptographic Tokens:** Magic tokens and session keys are generated via `crypto.randomBytes(32).toString('hex')`. Only SHA-256 hashes are persisted.
* **Password & PIN Hashing:** Passwords and 4-digit staff PINs are stored with PBKDF2 salt hashing (`salt:hash`).
* **Randomness:** Spin rewards use Node.js `crypto.randomInt` over accumulated weights; `Math.random()` is strictly prohibited.
* **Replay Protection:** Permanent NFC tags resolve to an entry identifier; customer identity is bound to a single-use session key.
* **Subscription Gating:** Staff terminal login remains open for renewals; `/terminal-data` calculates and injects `subscription: SubscriptionMeta` for client enforcement.

---

## 4. Quick Start & Setup Instructions

### Prerequisites
* Node.js 18.x or 22.x
* npm

### 1. Clone & Install
```bash
git clone <repo-url>
cd seyo
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
```

### 3. Launch Full-Stack Development Server
```bash
npm run dev
```
The server boots on `http://0.0.0.0:3000`. In development, Express mounts full Vite SPA middlewares.

---

## 5. Pre-Seeded Interactive Demos

The platform boots with pre-seeded demo accounts ready for immediate testing:

### Demo 1: Bella Napoli Pizzeria (Combined Suite)
* **Customer Entry:** `http://localhost:3000/c/bella-napoli/v`
* **Staff Login:** `http://localhost:3000/staff/login?demo=bella-napoli`
  * Identifier: `owner@bellanapoli.com` or `bella-napoli`
  * Password: `password123`
  * Staff 4-Digit Redemption PIN: `7788`

### Demo 2: Tokyo Ramen Lab (Spin Tier)
* **Customer Entry:** `http://localhost:3000/c/tokyo-ramen/v`
* **Staff Login:** `http://localhost:3000/staff/login?demo=tokyo-ramen`
  * Identifier: `lab@tokyoramen.jp` or `tokyo-ramen`
  * Password: `password123`
  * Staff 4-Digit Redemption PIN: `7788`

### Demo 3: Artisan Bakery & Cafe (Loyalty Tier)
* **Customer Entry:** `http://localhost:3000/c/artisan-bakery/loyalty`
* **Staff Login:** `http://localhost:3000/staff/login?demo=artisan-bakery`
  * Identifier: `owner@artisanbakery.in` or `artisan-bakery`
  * Password: `password123`
  * Staff 4-Digit Redemption PIN: `7788`

### Test Customer Authentication
* Mobile number: Any 10-digit number (e.g., `9820123456`)
* OTP code: Instant development bypass `123456`

---

## 6. API Documentation

### Onboarding Endpoints
* `POST /api/onboarding/create-magic-link` — Generates 15-min TTL magic link token upon simulated purchase.
* `GET /api/onboarding/verify-magic-link?token=...` — Verifies token and establishes authorized permanent wizard session (unlocked for anytime resumability).
* `GET /api/onboarding/session-state` — Resumes wizard step.
* `PUT /api/onboarding/step` — Saves step draft data.
* `POST /api/onboarding/launch` — Re-validates configuration, provisions 365-day master license (`subscriptionExpiresAt`), and launches active offer.

### Customer Endpoints
* `GET /api/entry/resolve/:identifier` — Resolves merchant entry by slug or permanent NFC/QR code. Returns `{ isActive: false, isSubscriptionExpired: true }` if subscription is expired.
* `GET /api/entry/tap/:identifier` — Hardware NFC tap endpoint with `?k={nfcSecretKey}` verification; redirects to paused screen if subscription is expired.
* `POST /api/auth/customer/otp/request` — Requests one-time mobile verification code via MSG91/dev.
* `POST /api/auth/customer/otp/verify` — Verifies OTP, registers customer, returns session.
* `GET /api/customer/status/:slug` — Returns merchant timezone status and first incomplete stage.
* `POST /api/customer/spin` — Executes server-selected 100% all-win reward.
* `POST /api/customer/loyalty/stamp` — Increments visit count, evaluates milestone reward.
* `POST /api/customer/review/persist` — Stores feedback before Google Maps redirect.
* `POST /api/customer/stage/skip` — Defers active reward voucher and routes to Review Accelerator (if uncompleted) or Cooldown.
* `GET /api/customer/top-rankers/:slug` — Returns Top 5 Loyal Legends (masked mobile, sorted by `totalVisits`).

### Staff & Subscription Endpoints
* `POST /api/staff/login` — Authenticates staff with business credentials.
* `GET /api/staff/terminal-data` — Returns active metrics, customer loyalty lists, QR data URLs, and `subscription: SubscriptionMeta` (status, days remaining, isExpired, isLastDay).
* `POST /api/staff/renew-subscription` — Extends subscription by 365 days from the active window, reactivating the merchant and unpausing campaigns instantly.
* `POST /api/staff/redeem-voucher` — Redeems customer reward voucher using 4-digit staff PIN.
* `POST /api/staff/cancel-offer` — Cancels active offer to allow new offer creation.

---

## 7. Deployment Guidelines

### Frontend Deployment (Vercel)
1. Set Framework Preset: **Vite**.
2. Build Command: `npm run build`.
3. Output Directory: `dist`.
4. Environment Variables:
   * `VITE_API_URL`: Your production backend URL.

### Backend Deployment (Railway / Cloud Run / AI Studio)
1. Build & Start:
   * Build: `npm run build`
   * Start: `node server.ts` or `tsx server.ts`
2. Environment Variables:
   * `PORT`: `3000` (or injected by host)
   * `NODE_ENV`: `production`
   * `APP_URL`: Production domain URL

### Database Architecture (Dual-Layer MemoryDB + MongoDB)
The runtime uses `MemoryDB` with non-blocking MongoDB hydration. In local development or containerized sandboxes, `MemoryDB` initializes with complete seed data in RAM. When a valid `MONGODB_URI` is provided, state seamlessly hydrates and syncs with MongoDB Atlas without requiring any code modifications.

---

## 8. Folder Structure

```text
seyo/
├── backend/
│   └── src/
│       ├── app.ts                 # Express application assembly, middleware & route mounting
│       ├── config/
│       │   ├── auth.ts            # MSG91 phone OTP & auth configuration settings
│       │   └── pricingPlans.ts    # Tier configurations, pricing rules & features
│       ├── db/
│       │   ├── connection.ts      # Non-blocking MongoDB connection initializer with RAM fallback
│       │   ├── MemoryDB.ts        # In-memory database engine with MongoDB hydration & background sync
│       │   └── seed.ts            # Pre-seeded test merchants (Bella Napoli, Tokyo Ramen, Artisan Bakery)
│       ├── middleware/
│       │   ├── authMiddleware.ts  # Customer session token validation
│       │   ├── errorMiddleware.ts # Central Express error handler (graceful DB offline fallbacks)
│       │   └── staffMiddleware.ts # Staff authentication & bearer token verification
│       ├── models/
│       │   └── Schemas.ts         # Consolidated Mongoose schemas (Business, Offer, Customer, Reward, etc.)
│       ├── routes/
│       │   ├── customerAuth.ts    # Customer OTP request & verification endpoints
│       │   ├── customerRoutes.ts  # Status evaluation, spin execution, stamps & reviews
│       │   ├── developerRoutes.ts # Developer admin metrics, merchant inspection & reset
│       │   ├── entryRoutes.ts     # QR/NFC permanent hardware entry resolution & campaign pause gating
│       │   ├── merchantRoutes.ts  # Merchant settings, staff PIN & customer directory
│       │   ├── onboardingRoutes.ts# Magic-link wizard creation, resume & 365-day license provisioning
│       │   ├── paymentRoutes.ts   # Razorpay order generation & payment webhook verification
│       │   └── staffRoutes.ts     # Staff terminal data, subscription metadata & renewal endpoint
│       ├── services/
│       │   ├── customerAuthService.ts    # Phone OTP generation, validation & auth flow
│       │   ├── customerService.ts        # Customer profile lookups & statistics
│       │   ├── customerSessionService.ts # Session creation, stage progression & token expiry
│       │   ├── customerStatusService.ts  # Timezone-aware customer eligibility & stage routing
│       │   ├── emailService.ts           # Merchant onboarding magic link & notification emails
│       │   ├── loyaltyService.ts         # Digital stamp cards, milestone rewards & streaks
│       │   ├── msg91Service.ts           # MSG91 SMS gateway integration
│       │   ├── onboardingService.ts      # Merchant registration, license window & wizard validation
│       │   ├── paymentService.ts         # Razorpay checkout & webhook processing
│       │   ├── reviewService.ts          # Feedback capture & Google review redirect logic
│       │   ├── spinService.ts            # Cryptographically secure all-win wheel RNG
│       │   └── staffService.ts           # Staff credentials, PIN verification & redemption
│       └── utils/
│           ├── crypto.ts          # PBKDF2 hashing, AES encryption & secure token utilities
│           └── timezone.ts        # IANA timezone calculations & midnight reset boundaries
├── shared/
│   ├── constants/
│   │   ├── countries.ts           # Supported country dial codes & validation patterns
│   │   ├── limits.ts              # Business constraints, stamp limits & cooldown rules
│   │   └── tiers.ts               # Tier definitions (spin, loyalty, review, combined)
│   ├── types/
│   │   ├── business.ts            # Business entity, SubscriptionMeta & credentials types
│   │   ├── customer.ts            # Customer profile, statistics & stage models
│   │   ├── offer.ts               # Active offer, rewards & tier metadata types
│   │   ├── onboarding.ts          # Setup wizard progress & draft payload types
│   │   ├── payment.ts             # Order, payment transaction & webhook schemas
│   │   ├── qr.ts                  # QR code payload & hardware NFC schemas
│   │   ├── review.ts              # Customer review & sentiment models
│   │   ├── reward.ts              # Reward voucher, tier prize & redemption types
│   │   └── session.ts             # Cryptographic session & TTL token definitions
│   └── validation/
│       ├── loyaltyValidation.ts   # Stamp card rules & milestone validation
│       ├── offerValidation.ts     # Configuration constraints for offer launch
│       ├── phoneValidation.ts     # E.164 and localized mobile number validation
│       └── spinValidation.ts      # Prize slice probability & slice count checks
├── src/
│   ├── assets/
│   │   └── logo.svg               # Vector brand assets
│   ├── components/
│   │   ├── common/                # Button, Input, Modal, Header, Footer, SeyyoLogo, LoadingScreen, ErrorMessage
│   │   ├── customer/              # CustomerAuthFlow, CustomerJourney, SpinWheel, LoyaltyTracker, LoyaltyClaimStep,
│   │   │                          # RewardVoucher, CooldownScreen, TopRankersModal, NoOfferScreen, CustomerFooter
│   │   ├── legal/                 # LegalLayout (shared navigation for compliance pages)
│   │   ├── marketing/             # Navbar (landing & marketing navigation)
│   │   ├── merchant/              # CustomerDirectory, WhatsAppOutreachModal
│   │   ├── onboarding/            # OnboardingWizard, OnboardingProgress, ProfileStep, LogoStep,
│   │   │                          # ConfigurationStep, SpinConfiguration, LoyaltyConfiguration,
│   │   │                          # ReviewConfiguration, SecurityStep, ConfirmationStep
│   │   ├── payment/               # PaymentModal (Razorpay checkout modal)
│   │   ├── pricing/               # PricingSection (tier comparison cards & purchase triggers)
│   │   ├── review/                # ReviewGenerator (dynamic review suggestions & rating prompt)
│   │   └── staff/                 # CombinedTierTerminal, ActivateOfferModal, MerchantProfileTab,
│   │                              # QRGenerator, LoyaltyRecordsList, RewardRecordsList,
│   │                              # OfferHistoryList, StaffPINModal, StaffProfileModal
│   ├── hooks/
│   │   └── useAuthMode.ts         # Hook managing phone OTP & direct customer authentication
│   ├── pages/
│   │   ├── AboutPage.tsx          # About Seyyo company & mission overview
│   │   ├── ContactPage.tsx        # Merchant & enterprise contact form
│   │   ├── CustomerDemoPage.tsx   # Interactive zero-database client demo simulation
│   │   ├── CustomerEntryPage.tsx  # Dynamic multi-tier customer journey resolver & paused campaign screen
│   │   ├── DeveloperDashboardPage.tsx # Developer admin console & merchant metrics
│   │   ├── LandingPage.tsx        # Public marketing portal, features & tier pricing
│   │   ├── MerchantCustomersPage.tsx  # Customer CRM directory & 1-click WhatsApp outreach
│   │   ├── MerchantSettingsPage.tsx   # Merchant profile, WhatsApp config & staff PIN controls
│   │   ├── PaymentSuccess.tsx     # Payment confirmation & onboarding link handoff
│   │   ├── PrivacyPage.tsx        # Privacy policy & data protection terms
│   │   ├── RefundPolicyPage.tsx   # Subscription billing & refund policy
│   │   ├── SetupPage.tsx          # Resumable merchant onboarding wizard
│   │   ├── StaffLoginPage.tsx     # Merchant staff & owner authentication page
│   │   ├── StaffTerminalPage.tsx  # Interactive staff terminal, warning banners, lockout card & renewal
│   │   └── TermsPage.tsx          # Terms of service & merchant agreement
│   ├── services/
│   │   ├── api.ts                 # Base HTTP client with error handling
│   │   ├── customerAuthService.ts # Client customer OTP verification methods
│   │   ├── customerService.ts     # Customer status, spin, stamp & review API calls
│   │   ├── developerApi.ts        # Developer metrics & merchant management API
│   │   ├── onboardingService.ts   # Wizard draft saving, verification & launch API
│   │   ├── paymentApi.ts          # Payment order creation & status checks
│   │   ├── paymentService.ts      # Razorpay script loader & transaction handling
│   │   ├── staffApi.ts            # Staff terminal data, voucher redemption, offer management & renewal API
│   │   └── staffService.ts        # Staff local session persistence & state management
│   ├── types/
│   │   └── index.ts               # Client-side type definitions & shared re-exports
│   ├── utils/
│   │   ├── clipboard.ts           # Cross-browser clipboard copy helper
│   │   ├── loyaltyRanking.ts      # VIP and streaker leaderboard calculation logic
│   │   ├── reviewBank.ts          # Preset review prompts and sentiment suggestions
│   │   ├── safeStorage.ts         # Storage fallback handling & attribution tracking
│   │   └── whatsapp.ts            # 1-click WhatsApp outreach message generator
│   ├── App.tsx                    # React client router & attribution listener
│   ├── index.css                  # Tailwind styles and mobile viewport touch optimizations
│   └── main.tsx                   # React root entry point
├── public/
│   └── logo.svg                   # Public static logo asset
├── docs/
│   ├── API.md                     # Comprehensive REST API endpoint documentation
│   ├── ARCHITECTURE.md            # System architecture, state machine & security protocols
│   └── AUTHENTICATION.md          # Multi-tenant auth specs (magic links, customer OTP, staff PIN)
├── test-all-tiers.mjs             # End-to-end integration test suite across all 4 product tiers
├── test-loyalty-acceptance.mjs    # Loyalty cycle, replay & lockout acceptance test suite
├── test-stress-security.mjs       # Rate limit, replay protection & stress security test suite
├── server.ts                      # Full-stack Node.js server (Express + Vite dev middlewares)
├── index.html                     # HTML5 entry template with SEO & OpenGraph meta tags
├── metadata.json                  # AI Studio applet metadata & capabilities
├── package.json                   # Dependencies, scripts & engine specifications
├── tsconfig.json                  # TypeScript compiler configuration
├── vite.config.ts                 # Vite bundler & Tailwind configuration
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules
└── README.md                      # Project documentation and specifications
```

---
*Built with precision for high-retention merchant customer engagement.*
