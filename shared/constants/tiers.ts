export type ProductTier = 'spin' | 'loyalty' | 'review' | 'combined';

export interface TierInfo {
  id: ProductTier;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  features: string[];
  hasSpin: boolean;
  hasLoyalty: boolean;
  hasReview: boolean;
}

export const PRODUCT_TIERS: Record<ProductTier, TierInfo> = {
  spin: {
    id: 'spin',
    name: 'Spin and Win',
    tagline: 'High-energy customer gamification with 100% all-win rewards',
    priceMonthly: 39,
    priceAnnual: 390,
    features: [
      'Interactive 2-7 slice spin wheel',
      '100% guaranteed reward delivery',
      'Staff 4-digit PIN verification terminal',
      'Dynamic & Printed QR generation',
      'Daily midnight reset per customer',
    ],
    hasSpin: true,
    hasLoyalty: false,
    hasReview: false,
  },
  loyalty: {
    id: 'loyalty',
    name: 'Loyalty Log',
    tagline: 'Digital stamp card tracking visit milestones and retention',
    priceMonthly: 49,
    priceAnnual: 490,
    features: [
      'Digital stamp card tracker (3-365 visits)',
      'Independent validation days window (3-365 days)',
      'Top 5 Loyal Legends live leaderboard',
      'Staff terminal with live customer visit records',
      'Automated cycle completion and reward voucher',
    ],
    hasSpin: false,
    hasLoyalty: true,
    hasReview: false,
  },
  review: {
    id: 'review',
    name: 'Review Pro',
    tagline: 'Verified customer review generator with seamless Google handoff',
    priceMonthly: 29,
    priceAnnual: 290,
    features: [
      'Tap-to-review NFC & QR entry',
      'Fast tag-based review prompt generator',
      'Secure persistence of customer feedback before handoff',
      'One-tap Google Maps Review redirection',
      'Daily visit cooldown and activity log',
    ],
    hasSpin: false,
    hasLoyalty: false,
    hasReview: true,
  },
  combined: {
    id: 'combined',
    name: 'Seyyo Combo',
    tagline: 'Complete 3-in-1 journey: Spin to win, stamp loyalty, generate reviews',
    priceMonthly: 79,
    priceAnnual: 790,
    features: [
      'Full Spin + Loyalty + Review automated journey',
      'Smart skipping of completed daily stages',
      'Instant Loyalty bypass QR option',
      'Combined staff terminal with dual record tabs',
      'Complete customer engagement metrics & exports',
    ],
    hasSpin: true,
    hasLoyalty: true,
    hasReview: true,
  },
};
