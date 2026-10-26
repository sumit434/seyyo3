import { ProductTier } from '../constants/tiers';
import { SpinSliceConfig } from './business';

export type OfferStatus = 'no_offer' | 'draft' | 'active' | 'completed' | 'cancelled';

export interface OfferMetrics {
  scans: number;
  identifiedGuests: number;
  rewardsIssued: number;
  rewardsRedeemed: number;
  reviewsPrompted: number;
  reviewsPersisted: number;
  loyaltyStampsIssued: number;
  loyaltyMilestonesClaimed: number;
}

export interface Offer {
  id: string;
  businessId: string;
  title: string;
  description: string;
  tier: ProductTier;
  status: OfferStatus;
  createdAt: string; // ISO UTC
  activatedAt?: string;
  expiresAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  durationDays?: number;
  spinWheelConfiguration?: SpinSliceConfig[];
  loyaltyTarget?: number;
  loyaltyValidationDays?: number;
  loyaltyReward?: string;
  googleReviewUrl?: string;
  metrics: OfferMetrics;
}
