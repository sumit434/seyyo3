import { ProductTier } from '../constants/tiers';

export interface SpinSliceConfig {
  id: string;
  rewardLabel: string;
  emoji: string;
  weight: number; // percentage 1-100, sum must be exactly 100
}

export type OnboardingStepName = 'profile' | 'logo' | 'configuration' | 'security' | 'confirmation' | 'completed';

export interface Business {
  id: string;
  name: string;
  slug: string;
  email: string;
  passwordHash: string; // Staff login password hash
  staffPinHash: string; // 4-digit staff voucher verification PIN hash
  tier: ProductTier;
  timezone: string; // IANA timezone e.g. 'America/New_York'
  country: string; // One of 10 allowed countries
  city: string;
  category: string;
  googleReviewUrl?: string;
  googlePlaceId?: string;
  zomatoUrl?: string;
  swiggyUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  loyaltyTarget?: number; // 3-365
  loyaltyValidationDays?: number; // 3-365 (independent from loyaltyTarget)
  loyaltyReward?: string;
  spinWheelConfiguration?: SpinSliceConfig[];
  nfcSecretKey: string; // 16-character cryptographic hex key for NFC security
  active: boolean;
  logoEmoji: string;
  logoUrl?: string;
  accentColor: string;
  onboardingStep: OnboardingStepName;
  referralCode?: string;
  utmCampaign?: string;
  utmSource?: string;
  configuredStaffPin?: string;
  skipRedemptionPin?: boolean; // true = glance/fast mode, false = require 4-digit PIN
  isRushMode?: boolean;
  rushModeEnabled?: boolean;
  skipStaffVerification?: boolean;
  whatsappNumber?: string; // Merchant WhatsApp Business phone number
  subscriptionExpiresAt?: string; // ISO 8601 UTC
  createdAt: string; // ISO 8601 UTC
  updatedAt: string;
}

export type SubscriptionStatus = 'active' | 'expiring_soon' | 'expired';

export interface SubscriptionMeta {
  status: SubscriptionStatus;
  expiresAt: string;
  daysRemaining: number;
  isExpired: boolean;
  isLastDay: boolean;
}

export interface BusinessPublicInfo {
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
  nfcSecretKey?: string;
  zomatoUrl?: string;
  swiggyUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  googleReviewUrl?: string;
  skipRedemptionPin?: boolean;
  isRushMode?: boolean;
  rushModeEnabled?: boolean;
  skipStaffVerification?: boolean;
  whatsappNumber?: string;
  subscription?: SubscriptionMeta;
}

export interface BusinessProfile {
  id?: string;
  name?: string;
  slug?: string;
  email?: string;
  tier?: ProductTier;
  category?: string;
  city?: string;
  country?: string;
  timezone?: string;
  logoEmoji?: string;
  logoUrl?: string;
  accentColor?: string;
  googleReviewUrl?: string;
  googlePlaceId?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  zomatoUrl?: string;
  swiggyUrl?: string;
  loyaltyTarget?: number;
  loyaltyValidationDays?: number;
  loyaltyReward?: string;
  spinWheelConfiguration?: SpinSliceConfig[];
  configuredStaffPin?: string;
  skipRedemptionPin?: boolean; // true = glance/fast mode, false = require 4-digit PIN
  isRushMode?: boolean;
  rushModeEnabled?: boolean;
  skipStaffVerification?: boolean;
  whatsappNumber?: string;
}

export interface UpdateStaffSettingsPayload {
  newStaffPin?: string;         // Optional: 4-digit numeric string
  skipRedemptionPin?: boolean;  // Optional toggle status
  whatsappNumber?: string;     // Optional merchant WhatsApp number
}
