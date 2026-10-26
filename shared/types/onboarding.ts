import { ProductTier } from '../constants/tiers';
import { OnboardingStepName, SpinSliceConfig } from './business';

export interface OnboardingAttribution {
  referralCode?: string;      // e.g., 'rahul20' from ?ref=
  utmSource?: string;         // e.g., 'youtube', 'instagram'
  utmMedium?: string;         // e.g., 'influencer', 'reel'
  utmCampaign?: string;       // e.g., 'launch_video_1'
}

export interface OnboardingDraftData {
  businessName?: string;
  category?: string;
  country?: string;
  city?: string;
  timezone?: string;
  logoEmoji?: string;
  logoUrl?: string;
  accentColor?: string;
  // Tier configs
  spinWheelConfiguration?: SpinSliceConfig[];
  loyaltyTarget?: number;
  loyaltyValidationDays?: number;
  loyaltyReward?: string;
  googleReviewUrl?: string;
  googlePlaceId?: string;
  // Social links & Outreach
  whatsappNumber?: string;
  zomatoUrl?: string;
  swiggyUrl?: string;
  instagramUrl?: string;
  // Security
  staffPassword?: string;
  staffPin?: string; // 4-digit PIN
  // Attribution
  attribution?: OnboardingAttribution;
}

export interface OnboardingToken {
  id: string;
  tokenHash: string; // SHA-256 of the raw magic token
  email: string;
  tier: ProductTier;
  status: 'pending' | 'completed' | 'expired' | 'used';
  currentStep: OnboardingStepName;
  draftData: OnboardingDraftData;
  businessId?: string;
  attribution?: OnboardingAttribution;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  isUsed?: boolean;
}

export interface OnboardingSession {
  sessionId: string;
  tokenId: string;
  email: string;
  tier: ProductTier;
  currentStep: OnboardingStepName;
  expiresAt?: string;
}
