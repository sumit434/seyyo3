/**
 * test-stress-security.mjs
 * Standalone Node.js Stress-Test & Penetration Testing Suite for "seyyo"
 * Target Environments: Concurrency exploits, race conditions, edge-case payloads, security loopholes
 */

import crypto from 'crypto';
import assert from 'assert';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'seyyo_webhook_secret_dev';

// Test statistics and latency metrics
const suiteMetrics = [];
let currentSuite = null;
const allLatencies = [];
const startMemory = process.memoryUsage();
const overallStartTime = Date.now();

function startSuite(name) {
  currentSuite = {
    name,
    tests: [],
    passed: 0,
    failed: 0,
    latencies: [],
  };
  suiteMetrics.push(currentSuite);
  console.log(`\n\x1b[1m\x1b[36m================================================================================`);
  console.log(` 🛡️  SUITE: ${name}`);
  console.log(`================================================================================\x1b[0m`);
}

async function runTest(testName, fn) {
  const t0 = performance.now();
  try {
    process.stdout.write(`  ⏳ ${testName}... `);
    await fn();
    const duration = performance.now() - t0;
    currentSuite.passed++;
    currentSuite.latencies.push(duration);
    allLatencies.push(duration);
    console.log(`\x1b[32mPASSED\x1b[0m \x1b[90m(${duration.toFixed(1)}ms)\x1b[0m`);
    currentSuite.tests.push({ name: testName, status: 'PASSED', duration });
  } catch (err) {
    const duration = performance.now() - t0;
    currentSuite.failed++;
    currentSuite.latencies.push(duration);
    allLatencies.push(duration);
    console.log(`\x1b[31mFAILED\x1b[0m \x1b[90m(${duration.toFixed(1)}ms)\x1b[0m`);
    console.log(`     \x1b[31mError: ${err.message}\x1b[0m`);
    currentSuite.tests.push({ name: testName, status: 'FAILED', duration, error: err.message });
  }
}

// Timed fetch helper with latency capture
async function timedFetch(url, options = {}) {
  const t0 = performance.now();
  const res = await fetch(url, options);
  const latency = performance.now() - t0;
  return { res, latency };
}

// HMAC-SHA256 generator for webhook testing
function generateHmacSha256(payload, secret = WEBHOOK_SECRET) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// -----------------------------------------------------------------------------
// MAIN TEST RUNNER
// -----------------------------------------------------------------------------
async function runAllSuites() {
  console.log(`\x1b[1m\x1b[35m`);
  console.log(`╔════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║          SEYYO APPLICATION SECURITY & PERFORMANCE QA TEST SUITE            ║`);
  console.log(`║                    High-Concurrency & Penetration Testing                  ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
  console.log(`🎯 Target Host: ${BASE}`);
  console.log(`🕒 Started At:  ${new Date().toISOString()}`);

  // ---------------------------------------------------------------------------
  // SETUP: Provision a fresh Combined-tier Merchant
  // ---------------------------------------------------------------------------
  console.log(`\n\x1b[33m⚡ Bootstrapping dedicated test environment...\x1b[0m`);
  const uniqueId = Date.now().toString().slice(-6);
  const merchantEmail = `qa_stress_${uniqueId}@seyyotest.com`;
  const staffPin = '4321';
  const staffPassword = 'QaSecurePassword123!';

  // 1. Create Onboarding Magic Link
  const linkRes = await fetch(`${BASE}/api/onboarding/create-magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: merchantEmail, tier: 'combined' }),
  }).then(r => r.json());
  assert(linkRes.rawToken, 'Failed to generate onboarding magic link');

  // 2. Verify link
  const onbVerify = await fetch(`${BASE}/api/onboarding/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: linkRes.rawToken }),
  }).then(r => r.json());
  assert(onbVerify.sessionToken, 'Failed to verify magic link');
  const onbSession = onbVerify.sessionToken;

  // 3. Configure Profile Step
  await fetch(`${BASE}/api/onboarding/step`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-onboarding-session': onbSession },
    body: JSON.stringify({
      step: 'profile',
      data: {
        businessName: `QA Lab ${uniqueId}`,
        category: 'Restaurant & Bar',
        country: 'United States',
        city: 'San Francisco',
        timezone: 'America/Los_Angeles',
        logoEmoji: '🧪',
        accentColor: '#0e7c66',
        googleReviewUrl: 'https://maps.google.com/?cid=123456789',
      },
      nextStep: 'config',
    }),
  });

  // 4. Configure Tier Config Step
  await fetch(`${BASE}/api/onboarding/step`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-onboarding-session': onbSession },
    body: JSON.stringify({
      step: 'config',
      data: {
        tier: 'combined',
        spinWheelConfiguration: [
          { id: 'slice_1', rewardLabel: 'Free Coffee', weight: 50, color: '#0e7c66' },
          { id: 'slice_2', rewardLabel: '10% Off Dessert', weight: 50, color: '#f59e0b' },
        ],
        loyaltyTarget: 5,
        loyaltyValidationDays: 30,
        loyaltyReward: 'Free Entree Meal',
      },
      nextStep: 'security',
    }),
  });

  // 5. Configure Security Step
  await fetch(`${BASE}/api/onboarding/step`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-onboarding-session': onbSession },
    body: JSON.stringify({
      step: 'security',
      data: {
        staffPassword,
        staffPin,
      },
      nextStep: 'confirmation',
    }),
  });

  // 6. Launch Live Business
  const launchRes = await fetch(`${BASE}/api/onboarding/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-onboarding-session': onbSession },
  }).then(r => r.json());

  assert(launchRes.success, 'Failed to launch test business');
  const testBusiness = launchRes.business;
  const businessSlug = testBusiness.slug;
  const businessId = testBusiness.id;
  console.log(`\x1b[32m✔ Test Business Live:\x1b[0m ${testBusiness.name} (Slug: ${businessSlug}, ID: ${businessId})\n`);

  // Helper: Create fresh authenticated customer session
  async function createCustomerSession(mobileNumber, customerName = 'Stress QA User') {
    // 1. Permanent entry resolve
    const entryRes = await fetch(`${BASE}/api/entry/${businessSlug}`, { method: 'POST' }).then(r => r.json());
    
    // 2. Get fresh NFC tap
    const tapRes = await fetch(`${BASE}/api/entry/tap/${businessSlug}`, { redirect: 'manual' });
    const location = tapRes.headers.get('location') || '';
    const sk = new URL(location, BASE).searchParams.get('sk');
    assert(sk, 'Failed to acquire tap session key');

    // 3. Resolve entry with session key
    const resolveRes = await fetch(`${BASE}/api/entry/${businessSlug}?sk=${sk}`).then(r => r.json());
    const sessionToken = resolveRes.sessionToken;

    // 4. Authenticate customer
    const authRes = await fetch(`${BASE}/api/auth/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        mobile: mobileNumber,
        countryCode: '+1',
        name: customerName,
        sessionKey: sk,
      }),
    }).then(r => r.json());

    return {
      sessionKey: sk,
      sessionToken,
      customer: authRes.customer,
      status: authRes.status,
    };
  }

  // ---------------------------------------------------------------------------
  // SUITE 1: Race Condition & Concurrency Abuse
  // ---------------------------------------------------------------------------
  startSuite('1. Race Condition & Concurrency Abuse');

  let prizeVoucherCode = null;

  await runTest('Fire 25 simultaneous spins on the exact same session (Prevent Multi-Prize Exploit)', async () => {
    const phone = `202${Math.floor(1000000 + Math.random() * 9000000)}`;
    const custSession = await createCustomerSession(phone, 'Spin Stress Tester');

    // Prepare 25 identical POST /api/customer/spin requests
    const spinPayload = JSON.stringify({
      businessId,
      customerId: custSession.customer.id,
    });
    const headers = {
      'Content-Type': 'application/json',
      'x-customer-session': custSession.sessionToken,
    };

    const spinRequests = Array.from({ length: 25 }, () =>
      fetch(`${BASE}/api/customer/spin`, {
        method: 'POST',
        headers,
        body: spinPayload,
      })
    );

    // Execute concurrently via Promise.all
    const responses = await Promise.all(spinRequests);
    const results = await Promise.all(
      responses.map(async r => ({
        status: r.status,
        body: await r.json(),
      }))
    );

    const successfulSpins = results.filter(r => r.status === 200 && r.body.success === true);
    const rejectedSpins = results.filter(r => r.status !== 200);

    // Capture the 1 issued voucher code for voucher concurrency test
    if (successfulSpins.length > 0 && successfulSpins[0].body.reward) {
      prizeVoucherCode = successfulSpins[0].body.reward.code;
    }

    assert.strictEqual(
      successfulSpins.length,
      1,
      `RACE CONDITION EXPLOIT DETECTED! Expected exactly 1 successful spin, but ${successfulSpins.length} succeeded!`
    );
    assert.strictEqual(
      rejectedSpins.length,
      24,
      `Expected 24 rejections, but received ${rejectedSpins.length}`
    );

    // Validate that all 24 rejections received proper conflict / session burn codes (403 or 409)
    for (const rej of rejectedSpins) {
      assert(
        [400, 403, 409].includes(rej.status),
        `Unexpected error HTTP status: ${rej.status}`
      );
    }
  });

  await runTest('Fire 10 simultaneous staff redemptions on a single voucher code (Prevent Double Redemption)', async () => {
    assert(prizeVoucherCode, 'A valid prize voucher code is required from the spin test');

    // Authenticate staff member first
    const staffLogin = await fetch(`${BASE}/api/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: businessSlug,
        password: staffPassword,
      }),
    }).then(r => r.json());
    assert(staffLogin.sessionToken, 'Staff login failed');
    const staffToken = staffLogin.sessionToken;

    // Prepare 10 simultaneous redemption requests
    const redeemPayload = JSON.stringify({
      voucherCode: prizeVoucherCode,
      staffPin,
    });
    const headers = {
      'Content-Type': 'application/json',
      'x-staff-session': staffToken,
    };

    const redeemRequests = Array.from({ length: 10 }, () =>
      fetch(`${BASE}/api/staff/redeem`, {
        method: 'POST',
        headers,
        body: redeemPayload,
      })
    );

    const responses = await Promise.all(redeemRequests);
    const results = await Promise.all(
      responses.map(async r => ({
        status: r.status,
        body: await r.json(),
      }))
    );

    const successfulRedeems = results.filter(r => r.status === 200 && r.body.success === true);
    const rejectedRedeems = results.filter(r => r.status !== 200);

    assert.strictEqual(
      successfulRedeems.length,
      1,
      `DOUBLE REDEMPTION EXPLOIT DETECTED! Expected 1 redemption, but ${successfulRedeems.length} succeeded!`
    );
    assert.strictEqual(
      rejectedRedeems.length,
      9,
      `Expected 9 rejections, but received ${rejectedRedeems.length}`
    );

    for (const rej of rejectedRedeems) {
      assert(
        [400, 409].includes(rej.status),
        `Unexpected redemption rejection status: ${rej.status}`
      );
      assert(
        rej.body.message?.includes('already been redeemed') || rej.body.code === 'CONFLICT',
        `Expected already redeemed message, got: ${JSON.stringify(rej.body)}`
      );
    }
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: Magic Link Token Security & Replay Attacks
  // ---------------------------------------------------------------------------
  startSuite('2. Magic Link Token Security & Replay Attacks');

  await runTest('Reject nonexistent or invalid token hash', async () => {
    const invalidToken = 'nonexistent_token_00000000000000000000000000000000';
    const res = await fetch(`${BASE}/api/onboarding/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: invalidToken }),
    });

    assert([400, 401, 404].includes(res.status), `Expected 400/401/404 for invalid token, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await runTest('Ensure magic link verification is idempotent before launch, and single-use post-launch', async () => {
    // Generate a fresh magic link
    const linkRes = await fetch(`${BASE}/api/onboarding/create-magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `idempotent_${Date.now()}@seyyo.com`, tier: 'spin' }),
    }).then(r => r.json());
    const freshToken = linkRes.rawToken;
    assert(freshToken, 'Failed to create magic link');

    // First verify: MUST succeed
    const firstUse = await fetch(`${BASE}/api/onboarding/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: freshToken }),
    });
    assert.strictEqual(firstUse.status, 200, 'First token verification must succeed');
    const firstData = await firstUse.json();
    assert(firstData.sessionToken, 'Expected session token on initial verify');
    const sessToken = firstData.sessionToken;

    // Second verify (simulating React StrictMode or browser pre-fetch bot): MUST also succeed idempotently
    const repeatVerify = await fetch(`${BASE}/api/onboarding/verify-magic-link?token=${freshToken}`);
    assert.strictEqual(repeatVerify.status, 200, 'Repeat token verification before launch must succeed (idempotent)');

    // Launch business to burn token permanently
    await fetch(`${BASE}/api/onboarding/step`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-onboarding-session': sessToken },
      body: JSON.stringify({
        step: 'profile',
        data: {
          businessName: `Idempotent Test ${Date.now().toString().slice(-4)}`,
          category: 'Retail',
          country: 'United States',
          city: 'Austin',
          timezone: 'America/Chicago',
        },
        nextStep: 'config',
      }),
    });
    await fetch(`${BASE}/api/onboarding/step`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-onboarding-session': sessToken },
      body: JSON.stringify({
        step: 'config',
        data: {
          tier: 'spin',
          spinWheelConfiguration: [
            { id: 's1', rewardLabel: 'Free Gift', weight: 50, color: '#0e7c66' },
            { id: 's2', rewardLabel: '15% Off', weight: 50, color: '#f59e0b' },
          ],
        },
        nextStep: 'security',
      }),
    });
    await fetch(`${BASE}/api/onboarding/step`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-onboarding-session': sessToken },
      body: JSON.stringify({
        step: 'security',
        data: { staffPassword: 'Password123!', staffPin: '9988' },
        nextStep: 'confirmation',
      }),
    });
    const launchRes = await fetch(`${BASE}/api/onboarding/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-onboarding-session': sessToken },
    }).then(r => r.json());
    assert(launchRes.success, 'Launch must succeed');

    // Post-launch verify: MUST fail with 400/403/409 (TOKEN_ALREADY_USED)
    const postLaunchVerify = await fetch(`${BASE}/api/onboarding/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: freshToken }),
    });
    assert([400, 403, 409].includes(postLaunchVerify.status), `Token verified after launch must be rejected, got ${postLaunchVerify.status}`);
    const postLaunchData = await postLaunchVerify.json();
    assert.strictEqual(postLaunchData.success, false);
    assert(
      postLaunchData.message?.includes('already been used') || postLaunchData.message?.includes('COMPLETED') || postLaunchData.message?.includes('EXPIRED'),
      `Expected already used notice, got: ${postLaunchData.message}`
    );
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: Webhook Cryptographic Verification & Tampering
  // ---------------------------------------------------------------------------
  startSuite('3. Webhook Cryptographic Verification & Tampering');

  await runTest('Reject webhook with missing x-razorpay-signature header', async () => {
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test123' } } },
    });

    const res = await fetch(`${BASE}/api/payment/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });

    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message?.includes('signature') || data.message?.includes('Missing'));
  });

  await runTest('Reject webhook with invalid / forged HMAC SHA256 signature', async () => {
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_forge_123' } } },
    });
    const forgedSignature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    const res = await fetch(`${BASE}/api/payment/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': forgedSignature,
      },
      body: payload,
    });

    assert.strictEqual(res.status, 400, `Expected 400 for forged signature, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message?.includes('Invalid webhook signature') || data.message?.includes('verification failed'));
  });

  await runTest('Reject tampered payload (Valid signature for Payload A, but sending Payload B)', async () => {
    const originalPayload = JSON.stringify({
      event: 'payment.captured',
      amount: 49900,
      currency: 'INR',
    });
    const validSignatureForOriginal = generateHmacSha256(originalPayload);

    // Attacker alters payload amount to 9999999
    const tamperedPayload = JSON.stringify({
      event: 'payment.captured',
      amount: 9999999,
      currency: 'INR',
    });

    const res = await fetch(`${BASE}/api/payment/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignatureForOriginal,
      },
      body: tamperedPayload,
    });

    assert.strictEqual(res.status, 400, `Tampered payload must be rejected with 400, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await runTest('Accept authentic webhook with valid cryptographic signature', async () => {
    const validPayload = JSON.stringify({
      event: 'payment.captured',
      entity: 'event',
      payload: {
        payment: {
          entity: {
            id: `pay_valid_${Date.now()}`,
            amount: 199900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });
    const authenticSignature = generateHmacSha256(validPayload);

    const res = await fetch(`${BASE}/api/payment/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': authenticSignature,
      },
      body: validPayload,
    });

    assert.strictEqual(res.status, 200, `Authentic webhook must succeed with 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.received, true);
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: Input Validation, Injection & Boundary Defense
  // ---------------------------------------------------------------------------
  startSuite('4. Input Validation, Injection & Boundary Defense');

  await runTest('Sanitize XSS vectors in customer identification name', async () => {
    const xssPayload = `<script>alert('XSS')</script><img src="x" onerror="alert(document.cookie)">John O'Connor`;
    const phone = `202${Math.floor(1000000 + Math.random() * 9000000)}`;

    const custSession = await createCustomerSession(phone, xssPayload);
    assert(custSession.customer, 'Customer should be identified');
    
    // Ensure script tags and dangerous HTML are stripped
    assert(
      !custSession.customer.name.includes('<script>'),
      'XSS vector was not stripped from customer name!'
    );
    assert(
      !custSession.customer.name.includes('<img'),
      'XSS img tag was not stripped from customer name!'
    );
  });

  await runTest('Neutralize SQL / NoSQL injection attempts in route parameters and queries', async () => {
    const sqliIdentifiers = [
      `' OR '1'='1`,
      `" OR "1"="1" --`,
      `admin'--`,
      `../../etc/passwd`,
    ];

    for (const sqli of sqliIdentifiers) {
      const res = await fetch(`${BASE}/api/entry/${encodeURIComponent(sqli)}`, { method: 'POST' });
      assert(
        [400, 404].includes(res.status),
        `Injection string ${sqli} should return 400/404, got ${res.status}`
      );
    }
  });

  await runTest('Handle oversized payloads gracefully without crashing memory', async () => {
    const oversizedString = 'A'.repeat(50000); // 50KB string
    const res = await fetch(`${BASE}/api/auth/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        mobile: '1234567890',
        name: oversizedString,
      }),
    });

    // Should reject or cleanly handle without 500 error
    assert(res.status !== 500, `Server crashed with 500 on oversized payload`);
  });

  await runTest('Reject invalid tier strings in order creation', async () => {
    const res = await fetch(`${BASE}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'super_hacker_free_tier',
        email: 'test@hacker.com',
      }),
    });

    assert([400, 422].includes(res.status), `Invalid tier must be rejected with 400, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await runTest('Reject malformed JSON with 400 Bad Request', async () => {
    const res = await fetch(`${BASE}/api/auth/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: `{"businessId": "123", unclosed_json: true`,
    });

    assert.strictEqual(res.status, 400, `Malformed JSON should return 400, got ${res.status}`);
  });

  await runTest('Enforce staff PIN brute-force rate limiting / temporary lockout', async () => {
    const wrongPin = '0000';
    let lockoutTriggered = false;

    // Fire 6 consecutive invalid login attempts with incorrect PIN
    for (let i = 1; i <= 6; i++) {
      const res = await fetch(`${BASE}/api/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: businessSlug,
          pin: wrongPin,
        }),
      });

      if (res.status === 429) {
        lockoutTriggered = true;
        const data = await res.json();
        assert(data.message?.includes('locked') || data.message?.includes('Too many'), `Expected lockout message: ${data.message}`);
        break;
      }
    }

    assert.strictEqual(lockoutTriggered, true, 'Brute force lockout was not triggered after multiple failed PIN attempts!');
  });

  // ---------------------------------------------------------------------------
  // SUITE 5: Staff PIN & Access Control Hardening
  // ---------------------------------------------------------------------------
  startSuite('5. Staff PIN & Access Control Hardening');

  await runTest('Reject unauthorized access to staff terminal data without authentication', async () => {
    const res = await fetch(`${BASE}/api/staff/terminal-data`);
    assert.strictEqual(res.status, 401, `Protected endpoint must return 401, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.code, 'UNAUTHORIZED');
  });

  await runTest('Reject unauthorized voucher redemption without staff session header', async () => {
    const res = await fetch(`${BASE}/api/staff/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucherCode: 'SY-TEST-1234', staffPin }),
    });

    assert.strictEqual(res.status, 401, `Unauthenticated redeem must return 401, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.code, 'UNAUTHORIZED');
  });

  await runTest('Evaluate customer status endpoint (/api/customer/status)', async () => {
    const res = await fetch(`${BASE}/api/customer/status?slug=${businessSlug}`);
    assert.strictEqual(res.status, 200, `Customer status should return 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.status, 'Expected status object in response');
  });

  // ---------------------------------------------------------------------------
  // EXECUTIVE SUMMARY REPORT
  // ---------------------------------------------------------------------------
  printExecutiveSummary();
}

function printExecutiveSummary() {
  const overallDuration = ((Date.now() - overallStartTime) / 1000).toFixed(2);
  const endMemory = process.memoryUsage();

  const totalTests = suiteMetrics.reduce((acc, s) => acc + s.tests.length, 0);
  const totalPassed = suiteMetrics.reduce((acc, s) => acc + s.passed, 0);
  const totalFailed = suiteMetrics.reduce((acc, s) => acc + s.failed, 0);

  // Compute Latency Percentiles
  allLatencies.sort((a, b) => a - b);
  const avgLatency = (allLatencies.reduce((a, b) => a + b, 0) / (allLatencies.length || 1)).toFixed(1);
  const minLatency = (allLatencies[0] || 0).toFixed(1);
  const maxLatency = (allLatencies[allLatencies.length - 1] || 0).toFixed(1);
  const p95Index = Math.floor(allLatencies.length * 0.95);
  const p95Latency = (allLatencies[p95Index] || 0).toFixed(1);

  const memDiffMb = ((endMemory.heapUsed - startMemory.heapUsed) / (1024 * 1024)).toFixed(2);

  console.log(`\n\x1b[1m\x1b[35m================================================================================`);
  console.log(`                       EXECUTIVE SECURITY & QA SUMMARY REPORT                   `);
  console.log(`================================================================================\x1b[0m\n`);

  console.log(`┌────────────────────────────────────────────────────────┬────────┬────────┬────────┬───────────┬─────────┐`);
  console.log(`│ Test Suite                                             │ Total  │ Passed │ Failed │  Avg Lat  │ Status  │`);
  console.log(`├────────────────────────────────────────────────────────┼────────┼────────┼────────┼───────────┼─────────┤`);

  for (const s of suiteMetrics) {
    const sAvg = (s.latencies.reduce((a, b) => a + b, 0) / (s.latencies.length || 1)).toFixed(1);
    const statusCol = s.failed === 0 ? `\x1b[32m✔ PASS \x1b[0m` : `\x1b[31m✖ FAIL \x1b[0m`;
    const paddedName = s.name.padEnd(54).slice(0, 54);
    const padTotal = String(s.tests.length).padStart(6);
    const padPassed = String(s.passed).padStart(6);
    const padFailed = String(s.failed).padStart(6);
    const padAvg = `${sAvg}ms`.padStart(9);
    console.log(`│ ${paddedName} │ ${padTotal} │ ${padPassed} │ ${padFailed} │ ${padAvg} │ ${statusCol} │`);
  }

  console.log(`└────────────────────────────────────────────────────────┴────────┴────────┴────────┴───────────┴─────────┘`);

  console.log(`\n📊 \x1b[1mPerformance & Reliability Metrics:\x1b[0m`);
  console.log(`   • Total Tests Executed:  \x1b[1m${totalTests}\x1b[0m`);
  console.log(`   • Passed:                \x1b[32m\x1b[1m${totalPassed}\x1b[0m`);
  console.log(`   • Failed:                ${totalFailed === 0 ? '\x1b[32m0\x1b[0m' : `\x1b[31m\x1b[1m${totalFailed}\x1b[0m`}`);
  console.log(`   • Success Rate:          \x1b[1m${((totalPassed / (totalTests || 1)) * 100).toFixed(1)}%\x1b[0m`);
  console.log(`   • Total Execution Time:  \x1b[1m${overallDuration}s\x1b[0m`);
  console.log(`   • Response Latency:      Avg: \x1b[33m${avgLatency}ms\x1b[0m | Min: ${minLatency}ms | Max: ${maxLatency}ms | P95: \x1b[33m${p95Latency}ms\x1b[0m`);
  console.log(`   • Heap Memory Shift:     ${memDiffMb > 0 ? `+${memDiffMb}` : memDiffMb} MB (${(endMemory.heapUsed / 1024 / 1024).toFixed(1)} MB currently used)`);

  if (totalFailed > 0) {
    console.log(`\n\x1b[31m❌ STATUS ANOMALY: ${totalFailed} security or performance tests failed! Review logs above.\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\n\x1b[32m🎉 ALL SECURITY, CONCURRENCY & INTEGRITY GATES PASSED WITHOUT VULNERABILITIES! 🎉\x1b[0m\n`);
  }
}

// Run the suite
runAllSuites().catch(err => {
  console.error('\n\x1b[31mFatal error during test run:\x1b[0m', err);
  process.exit(1);
});
