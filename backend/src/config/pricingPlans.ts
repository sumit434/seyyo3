export type CurrencyCode = 'INR' | 'USD';

export interface TierPrice {
  INR: number;
  USD: number;
}

export const PRICING_PLANS: Record<string, TierPrice> = {
  review_accelerator: { INR: 499, USD: 6 },
  spin_tier: { INR: 999, USD: 12 },
  loyalty_tier: { INR: 1299, USD: 18 },
  combined_tier: { INR: 1999, USD: 25 },
};

// Aliases for tier IDs across codebase
export const TIER_TO_PLAN_KEY: Record<string, string> = {
  review: 'review_accelerator',
  spin: 'spin_tier',
  loyalty: 'loyalty_tier',
  combined: 'combined_tier',
  review_accelerator: 'review_accelerator',
  spin_tier: 'spin_tier',
  loyalty_tier: 'loyalty_tier',
  combined_tier: 'combined_tier',
};

export function getPlanPrice(planOrTier: string, currency: CurrencyCode): number {
  const planKey = TIER_TO_PLAN_KEY[planOrTier] || planOrTier;
  const plan = PRICING_PLANS[planKey];
  if (!plan) {
    throw new Error(`Invalid plan: ${planOrTier}`);
  }
  return plan[currency];
}
