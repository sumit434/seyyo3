// test-all-tiers.mjs
import assert from 'assert';

const BASE = 'http://localhost:3000';

async function run() {
  console.log('--- Verifying Combined and Spin Tiers ---');

  // Combined tier test
  const resCombined = await fetch(`${BASE}/api/entry/tap/bella-napoli`, { redirect: 'manual' });
  const locCombined = resCombined.headers.get('location');
  const skCombined = new URL(locCombined, BASE).searchParams.get('sk');

  const resolveCombined = await fetch(`${BASE}/api/entry/resolve/bella-napoli?sk=${skCombined}`).then(r => r.json());
  assert.strictEqual(resolveCombined.business.tier, 'combined');
  const tokenCombined = resolveCombined.sessionToken;

  const phoneComb = `${Math.floor(9000000000 + Math.random() * 999999999)}`;
  const authCombined = await fetch(`${BASE}/api/auth/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId: resolveCombined.business.id,
      mobile: phoneComb,
      name: 'Test Customer',
      countryCode: '+91',
      sessionKey: skCombined,
    }),
  }).then(r => r.json());
  assert.strictEqual(authCombined.status.currentStage, 'spin');

  // Spin
  const spinRes = await fetch(`${BASE}/api/customer/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-customer-session': tokenCombined },
    body: JSON.stringify({ businessId: resolveCombined.business.id, customerId: authCombined.customer.id }),
  }).then(r => r.json());
  assert(spinRes.success);

  // If voucher, defer
  if (spinRes.status.currentStage === 'voucher') {
    await fetch(`${BASE}/api/customer/voucher/defer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-customer-session': tokenCombined },
      body: JSON.stringify({ businessId: resolveCombined.business.id, customerId: authCombined.customer.id }),
    });
  }

  // Stamp in combined
  const stampComb = await fetch(`${BASE}/api/customer/loyalty/stamp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-customer-session': tokenCombined },
    body: JSON.stringify({ businessId: resolveCombined.business.id, customerId: authCombined.customer.id }),
  });
  assert.strictEqual(stampComb.status, 200, 'Combined stamp should succeed');
  console.log('✅ Combined tier flow verified!');

  // Spin tier test
  const resSpin = await fetch(`${BASE}/api/entry/tap/tokyo-ramen`, { redirect: 'manual' });
  const locSpin = resSpin.headers.get('location');
  const skSpin = new URL(locSpin, BASE).searchParams.get('sk');

  const resolveSpin = await fetch(`${BASE}/api/entry/resolve/tokyo-ramen?sk=${skSpin}`).then(r => r.json());
  assert.strictEqual(resolveSpin.business.tier, 'spin');
  const tokenSpin = resolveSpin.sessionToken;

  const phoneSpin = `${Math.floor(9000000000 + Math.random() * 999999999)}`;
  const authSpin = await fetch(`${BASE}/api/auth/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId: resolveSpin.business.id,
      mobile: phoneSpin,
      name: 'Test Customer',
      countryCode: '+1',
      sessionKey: skSpin,
    }),
  }).then(r => r.json());
  assert.strictEqual(authSpin.status.currentStage, 'spin');

  const spinOnlyRes = await fetch(`${BASE}/api/customer/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-customer-session': tokenSpin },
    body: JSON.stringify({ businessId: resolveSpin.business.id, customerId: authSpin.customer.id }),
  });
  assert.strictEqual(spinOnlyRes.status, 200);
  console.log('✅ Spin tier flow verified!');
  console.log('🎉 ALL TIERS VERIFIED AND FUNCTIONING IN HARMONY! 🎉');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
