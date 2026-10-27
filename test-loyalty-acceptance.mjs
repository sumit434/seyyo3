// test-loyalty-acceptance.mjs
import assert from 'assert';

const BASE = 'http://localhost:3000';

async function run() {
  console.log('=== SEYYO Loyalty-Tier First-Stamp & Parity Acceptance Tests ===\n');

  // 1. Create a pure Loyalty-tier merchant via onboarding flow
  const email = `loyalty_${Date.now()}@bakery.com`;
  const magicLinkRes = await fetch(`${BASE}/api/onboarding/create-magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, tier: 'loyalty' }),
  }).then(r => r.json());
  assert(magicLinkRes.rawToken, 'Must receive magic link token');

  const verifyRes = await fetch(`${BASE}/api/onboarding/verify-magic-link?token=${magicLinkRes.rawToken}`).then(r => r.json());
  assert(verifyRes.sessionToken, 'Must receive sessionToken');
  const onbSession = verifyRes.sessionToken;

  const bizSlug = `artisan-bakery-${Date.now().toString().slice(-4)}`;

  // Profile Step
  await fetch(`${BASE}/api/onboarding/step`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-onboarding-session': onbSession },
    body: JSON.stringify({
      step: 'profile',
      data: {
        businessName: 'Artisan Bakery',
        category: 'Bakery',
        country: 'United States',
        city: 'Portland',
        timezone: 'America/Los_Angeles',
        logoEmoji: '🥐',
        accentColor: '#0e7c66',
        googleReviewUrl: 'https://maps.google.com/?q=Artisan+Bakery',
      },
      nextStep: 'config',
    }),
  }).then(r => r.json());

  // Config Step
  await fetch(`${BASE}/api/onboarding/step`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-onboarding-session': onbSession },
    body: JSON.stringify({
      step: 'config',
      data: {
        tier: 'loyalty',
        loyaltyTarget: 6,
        loyaltyValidationDays: 45,
        loyaltyReward: 'Free Almond Croissant',
      },
      nextStep: 'security',
    }),
  }).then(r => r.json());

  // Security Step
  await fetch(`${BASE}/api/onboarding/step`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-onboarding-session': onbSession },
    body: JSON.stringify({
      step: 'security',
      data: {
        staffPassword: 'Password123!',
        staffPin: '5566',
      },
      nextStep: 'confirmation',
    }),
  }).then(r => r.json());

  // Launch live business
  const launchRes = await fetch(`${BASE}/api/onboarding/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-onboarding-session': onbSession },
  }).then(r => r.json());

  assert(launchRes.success, 'Launch must succeed');
  const liveSlug = launchRes.business.slug;
  console.log(`Successfully launched pure Loyalty merchant: ${launchRes.business.name} (slug: ${liveSlug}, tier: ${launchRes.business.tier})\n`);

  // Helper to get fresh tap session
  async function getFreshSession(slug) {
    const res = await fetch(`${BASE}/api/entry/tap/${slug}`, { redirect: 'manual' });
    assert.strictEqual(res.status, 302, 'Tap should redirect 302');
    const loc = res.headers.get('location');
    const url = new URL(loc, BASE);
    const sk = url.searchParams.get('sk');
    assert(sk, 'Redirect must contain sk');
    return sk;
  }

  // TEST 1: Loyalty First-Stamp Test
  // Tap/Scan for a Loyalty-tier merchant -> Enter mobile number -> Tap "Stamp Visit" -> Succeeds directly (No 403 error).
  console.log('[TEST 1] Loyalty First-Stamp Test...');
  {
    const sk = await getFreshSession(liveSlug);
    console.log('1. Got fresh session key:', sk);

    // Resolve entry
    const resolveRes = await fetch(`${BASE}/api/entry/resolve/${liveSlug}?sk=${sk}`).then(r => r.json());
    assert.strictEqual(resolveRes.success, true);
    assert.strictEqual(resolveRes.business.tier, 'loyalty', 'Business tier must be loyalty');
    assert.strictEqual(resolveRes.status.currentStage, 'auth', 'Initial stage must be auth');
    const sessionToken = resolveRes.sessionToken;

    // Enter fresh mobile number (+91 9123456789)
    const phone = `${Math.floor(9000000000 + Math.random() * 999999999)}`;
    const authRes = await fetch(`${BASE}/api/auth/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: resolveRes.business.id,
        mobile: phone,
        name: 'Loyalty Customer',
        countryCode: '+91',
        sessionKey: sk,
      }),
    }).then(r => r.json());

    assert.strictEqual(authRes.success, true);
    assert.strictEqual(authRes.status.currentStage, 'loyalty', 'Stage after auth for pure loyalty must be loyalty (NOT spin!)');
    console.log('2. Customer authenticated. Current stage is:', authRes.status.currentStage);
    const customerId = authRes.customer.id;

    // Customer taps "Stamp Visit"
    const stampRes = await fetch(`${BASE}/api/customer/loyalty/stamp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-customer-session': sessionToken,
      },
      body: JSON.stringify({
        businessId: resolveRes.business.id,
        customerId,
      }),
    });

    assert.strictEqual(stampRes.status, 200, 'Stamp visit must succeed with HTTP 200 (NO 403 ERROR!)');
    const stampData = await stampRes.json();
    assert.strictEqual(stampData.success, true);
    assert.strictEqual(stampData.status.loyaltyCompletedToday, true);
    console.log('3. Stamp successful! Visit count:', stampData.customer.visitCount, 'Stage is now:', stampData.status.currentStage);
    console.log('✅ TEST 1 PASSED: Pure Loyalty-tier customer stamps visit successfully with NO 403 error!\n');
  }

  // TEST 2: Mid-Flow Refresh Test
  // Tap -> Enter mobile -> Refresh page before stamping -> Reloads smoothly and resumes at the Loyalty screen.
  console.log('[TEST 2] Mid-Flow Refresh Test...');
  {
    const sk = await getFreshSession(liveSlug);
    const resolveRes = await fetch(`${BASE}/api/entry/resolve/${liveSlug}?sk=${sk}`).then(r => r.json());
    const sessionToken = resolveRes.sessionToken;

    const phone = `${Math.floor(9000000000 + Math.random() * 999999999)}`;
    const authRes = await fetch(`${BASE}/api/auth/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: resolveRes.business.id,
        mobile: phone,
        name: 'Loyalty Customer',
        countryCode: '+91',
        sessionKey: sk,
      }),
    }).then(r => r.json());
    const customerId = authRes.customer.id;

    console.log('1. Customer authenticated, stage is:', authRes.status.currentStage);

    // Refresh simulation before stamping:
    const refreshResolve = await fetch(`${BASE}/api/entry/resolve/${liveSlug}?sk=${sk}`);
    assert.strictEqual(refreshResolve.status, 200, 'Resolve on refresh must return 200 (NOT 403)');

    const refreshStatus = await fetch(`${BASE}/api/customer/status/${liveSlug}?customerId=${customerId}`, {
      headers: { 'x-customer-session': sessionToken },
    });
    assert.strictEqual(refreshStatus.status, 200, 'Status on refresh must return 200 (NOT 403)');
    const refreshData = await refreshStatus.json();
    assert.strictEqual(refreshData.status.currentStage, 'loyalty', 'Must resume directly at loyalty stage');
    assert.strictEqual(refreshData.status.loyaltyCompletedToday, false, 'Stamp not completed yet');
    console.log('✅ TEST 2 PASSED: Refresh before stamping reloads smoothly and resumes at loyalty stage!\n');
  }

  // TEST 3 & 4: Post-Cooldown Refresh Lockout & Key Replay Test
  // Reach Cooldown -> Refresh page -> Returns 403 Token already used or expired.
  console.log('[TEST 3 & 4] Post-Cooldown Refresh Lockout & Key Replay Test...');
  {
    const sk = await getFreshSession(liveSlug);
    const resolveRes = await fetch(`${BASE}/api/entry/resolve/${liveSlug}?sk=${sk}`).then(r => r.json());
    const sessionToken = resolveRes.sessionToken;

    const phone = `${Math.floor(9000000000 + Math.random() * 999999999)}`;
    const authRes = await fetch(`${BASE}/api/auth/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: resolveRes.business.id,
        mobile: phone,
        name: 'Loyalty Customer',
        countryCode: '+91',
        sessionKey: sk,
      }),
    }).then(r => r.json());
    const customerId = authRes.customer.id;

    // Stamp visit
    const stampRes = await fetch(`${BASE}/api/customer/loyalty/stamp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-customer-session': sessionToken },
      body: JSON.stringify({ businessId: resolveRes.business.id, customerId }),
    }).then(r => r.json());

    // If review flow prompted, complete it to hit cooldown
    if (stampRes.status.currentStage === 'review') {
      await fetch(`${BASE}/api/customer/review/persist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: resolveRes.business.id,
          customerId,
          rating: 5,
          tags: ['Great Coffee'],
          reviewText: 'Awesome cafe experience!',
        }),
      });
    }

    // Cooldown status query (initial request delivers 200 and burns session key)
    const cooldownRes = await fetch(`${BASE}/api/customer/status/${liveSlug}`, {
      headers: { 'x-customer-session': sessionToken },
    });
    assert.strictEqual(cooldownRes.status, 200, 'Initial cooldown request should return 200');
    const cooldownData = await cooldownRes.json();
    assert.strictEqual(cooldownData.status.currentStage, 'cooldown', 'Should be in cooldown');
    console.log('1. Cooldown reached and session burned synchronously.');

    // Subsequent refresh / replay with the same sk
    const replayResolve = await fetch(`${BASE}/api/entry/resolve/${liveSlug}?sk=${sk}`);
    assert.strictEqual(replayResolve.status, 403, 'Replay on resolve must return 403');
    const replayResolveData = await replayResolve.json();
    assert.strictEqual(replayResolveData.message, 'Token already used or expired');

    const replayStatus = await fetch(`${BASE}/api/customer/status/${liveSlug}`, {
      headers: { 'x-customer-session': sessionToken },
    });
    assert.strictEqual(replayStatus.status, 403, 'Replay on status must return 403');
    const replayStatusData = await replayStatus.json();
    assert.strictEqual(replayStatusData.message, 'Token already used or expired');
    console.log('✅ TEST 3 & 4 PASSED: Replay or refresh after cooldown returns 403 Token already used or expired!\n');
  }

  // TEST 5: Fresh Session Test
  // Retap NFC to get a new key -> Starts a brand new flow without error.
  console.log('[TEST 5] Fresh Session Test...');
  {
    const sk1 = await getFreshSession(liveSlug);
    const sk2 = await getFreshSession(liveSlug);
    assert.notStrictEqual(sk1, sk2, 'Keys must be different');

    const resolve2 = await fetch(`${BASE}/api/entry/resolve/${liveSlug}?sk=${sk2}`).then(r => r.json());
    assert.strictEqual(resolve2.success, true);
    assert.strictEqual(resolve2.status.currentStage, 'auth', 'New session starts at stage auth');
    console.log('✅ TEST 5 PASSED: Fresh session starts cleanly at stage auth!\n');
  }

  console.log('🎉 ALL 5 LOYALTY ACCEPTANCE TESTS PASSED PERFECTLY! 🎉\n');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
