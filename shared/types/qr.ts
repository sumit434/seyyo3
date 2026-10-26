import { ProductTier } from '../constants/tiers';
export type { TopRanker } from './customer';

export type EntryType = 'merchant_qr' | 'nfc_tag' | 'table_qr' | 'review_nfc' | 'instant_loyalty' | 'combined' | 'loyalty' | 'loyalty_express';

export interface MerchantEntry {
  id: string;
  businessId: string;
  businessSlug: string;
  entryType: EntryType;
  label: string;
  permanentCode: string; // The permanent hardware or printed QR/NFC key
  targetTier: ProductTier;
  createdAt: string;
}

export type CustomerJourneyStage = 
  | 'auth'
  | 'spin'
  | 'voucher'
  | 'loyalty'
  | 'loyalty_reward'
  | 'check_condition'
  | 'review'
  | 'thank_you'
  | 'cooldown';

export interface CustomerSession {
  id?: string;
  sessionId: string;
  sessionToken: string; // Crypto hex token passed in Authorization or header
  sessionKey: string;   // The short-lived unique QR/NFC session key
  businessId: string;
  offerId: string;
  customerId?: string;
  customerNumber?: string;
  authType: 'qr' | 'nfc';
  source?: 'qr' | 'nfc';
  entryType?: 'combined' | 'loyalty' | string;
  qrKey?: string | null;
  currentStage: CustomerJourneyStage;
  status: 'unused' | 'used' | 'completed' | 'expired';
  isUsed: boolean;
  hasClaimedSpin?: boolean;
  hasClaimedLoyalty?: boolean;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  completedAt?: string;
}

export interface CustomerStatusResponse {
  business: {
    id: string;
    name: string;
    slug: string;
    tier: ProductTier;
    category: string;
    city: string;
    country: string;
    timezone: string;
    logoEmoji: string;
    logoUrl?: string;
    accentColor: string;
    googleReviewUrl?: string;
    googlePlaceId?: string;
    zomatoUrl?: string;
    swiggyUrl?: string;
    instagramUrl?: string;
    skipRedemptionPin?: boolean;
    isRushMode?: boolean;
    rushModeEnabled?: boolean;
    skipStaffVerification?: boolean;
  };
  isRushMode?: boolean;
  offer: {
    id: string;
    title: string;
    tier: ProductTier;
    status: string;
    spinWheelConfiguration?: Array<{
      id: string;
      rewardLabel: string;
      emoji: string;
      weight: number;
    }>;
    loyaltyTarget?: number;
    loyaltyValidationDays?: number;
    loyaltyReward?: string;
    googleReviewUrl?: string;
  } | null;
  customer: {
    id: string;
    name: string;
    mobileMasked: string;
    visitCount: number;
    totalVisits: number;
    vipRank?: number;
    lifetimeRank?: number;
    rank?: number;
    streakerRank?: number | null;
    currentStreak?: number;
    longestStreak?: number;
    activeOfferId?: string;
    cycleStartedAt?: string;
    voucherDeferred?: boolean;
    hasEnteredReviewFlow?: boolean;
    reviewAcceleratorEntryId?: string;
    activeVoucher?: {
      rewardId: string;
      code: string;
      title: string;
      type: 'spin' | 'loyalty';
      claimedAt: string;
    };
  } | null;
  status: {
    spinAvailable: boolean;
    spinCompletedToday: boolean;
    loyaltyAvailable: boolean;
    loyaltyCompletedToday: boolean;
    loyaltyMilestoneReached: boolean;
    activeReward: {
      rewardId: string;
      code: string;
      title: string;
      type: 'spin' | 'loyalty';
    } | null;
    reviewJourneyCompleted: boolean;
    hasEnteredReviewFlow?: boolean;
    reviewAcceleratorEntryId?: string;
    currentStage: CustomerJourneyStage;
    isCooldown: boolean;
    cooldownMessage?: string;
  };
}
