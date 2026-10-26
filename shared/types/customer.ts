export interface Customer {
  id: string;
  businessId: string;
  mobile: string;
  phone?: string;             // Direct phone alias
  name: string;
  rank?: number;              // Ranked position by lifetime total visits
  vipRank?: number;           // Lifetime VIP rank
  streakerRank?: number | null; // Active campaign streaker rank (null if unranked)
  lifetimeRank?: number;      // Computed lifetime visits rank
  activeOfferRank?: number | null; // Computed active campaign rank (null if unranked)
  lifetimeVisits?: number;    // Total lifetime visits
  activeOfferVisits?: number; // Visits under the active campaign
  visitCount: number;         // Active cycle stamps (0 to target)
  totalVisits: number;        // Lifetime total visits (STRICTLY NEVER RESETS)
  currentStreak?: number;      // Current consecutive visit streak
  longestStreak?: number;     // Longest recorded consecutive visit streak
  activeOfferId?: string;     // Tracks the specific offer ID being collected
  activeOffer?: {             // Dynamic active offer details for outreach
    title: string;
    validUntil?: string;
  };
  cycleStartedAt?: string;    // ISO timestamp of the 1st stamp in the current cycle
  totalRewardsClaimed?: number;
  totalSpins?: number;
  lastVisitAt?: string;
  lastSpinAt?: string;
  activeVoucher?: {
    rewardId: string;
    code: string;
    title: string;
    type: 'spin' | 'loyalty';
    claimedAt: string;
  };
  reviewJourneyCompleted?: boolean;
  reviewJourneyCompletedAt?: string;
  hasEnteredReviewFlow?: boolean;
  reviewAcceleratorEntryId?: string;
  voucherDeferred?: boolean;
  msg91Verified?: boolean;
  msg91RequestId?: string;
  msg91Channel?: 'whatsapp' | 'sms';
  whatsappOptedOut?: boolean;
  whatsappOptedOutAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPublicProfile {
  id: string;
  name: string;
  mobileMasked: string;
  visitCount: number;
  totalVisits: number;
  currentStreak: number;
  longestStreak?: number;
  activeOfferId?: string;
  cycleStartedAt?: string;
}

export interface TopRanker {
  rank: number;
  name: string;
  maskedMobile: string;
  totalVisits: number;
  visitCount: number;
  currentStreak: number;
  longestStreak?: number;
  streakerRank?: number | null;
}

export interface CustomerLoyaltyState {
  visitCount: number;
  totalVisits: number;
  currentStreak: number;
  longestStreak?: number;
  vipRank?: number;
  streakerRank?: number | null;
}
