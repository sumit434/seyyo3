import { request } from './api';
import { ProductTier } from '../../shared/constants/tiers';
import { OnboardingDraftData } from '../../shared/types/onboarding';
import { OnboardingStepName } from '../../shared/types/business';

export interface VerifyMagicLinkResponse {
  success: boolean;
  sessionToken: string;
  tier: ProductTier;
  email: string;
  currentStep: OnboardingStepName;
  draftData: OnboardingDraftData;
}

export interface LaunchOfferResponse {
  success: boolean;
  business: {
    id: string;
    name: string;
    slug: string;
    tier: ProductTier;
  };
  offer: {
    id: string;
    status: string;
  };
  staffSession: {
    sessionId: string;
    businessId: string;
    businessName: string;
    businessSlug: string;
    tier: ProductTier;
    expiresAt: string;
  };
  defaultStaffPin: string;
}

import { OnboardingAttribution } from '../../shared/types/onboarding';
import { getAttribution } from '../utils/safeStorage';

export const onboardingService = {
  // Simulate merchant purchase & generate magic link with campaign attribution
  async createMagicLink(email: string, tier: ProductTier, overrideAttribution?: OnboardingAttribution) {
    const attribution = overrideAttribution || getAttribution() || undefined;
    return request('/api/onboarding/create-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email, tier, attribution }),
    });
  },

  // Verify magic link
  async verifyMagicLink(token: string): Promise<VerifyMagicLinkResponse> {
    return request(`/api/onboarding/verify-magic-link?token=${encodeURIComponent(token)}`);
  },

  // Resume ongoing session
  async getSessionState(sessionId: string): Promise<VerifyMagicLinkResponse> {
    return request('/api/onboarding/session-state', {
      headers: {
        'x-onboarding-session': sessionId,
      },
    });
  },

  // Save step data
  async updateStep(sessionId: string, step: OnboardingStepName, data: Partial<OnboardingDraftData>, nextStep?: OnboardingStepName) {
    return request('/api/onboarding/step', {
      method: 'PUT',
      headers: {
        'x-onboarding-session': sessionId,
      },
      body: JSON.stringify({ step, data, nextStep }),
    });
  },

  // Launch offer & create business
  async launchOffer(sessionId: string): Promise<LaunchOfferResponse> {
    return request('/api/onboarding/launch', {
      method: 'POST',
      headers: {
        'x-onboarding-session': sessionId,
      },
    });
  },
};
