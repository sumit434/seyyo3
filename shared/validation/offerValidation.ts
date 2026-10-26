import { ALLOWED_COUNTRIES } from '../constants/countries';
import { STAFF_PIN_LENGTH } from '../constants/limits';
import { ProductTier } from '../constants/tiers';
import { OnboardingDraftData } from '../types/onboarding';
import { validateLoyaltyConfiguration } from './loyaltyValidation';
import { validateSpinConfiguration, ValidationResult } from './spinValidation';

export function validateOnboardingProfile(draft: OnboardingDraftData): ValidationResult {
  if (!draft.businessName || !draft.businessName.trim()) {
    return { valid: false, error: 'Business name is required' };
  }
  if (!draft.category || !draft.category.trim()) {
    return { valid: false, error: 'Business category is required' };
  }
  if (!draft.country) {
    return { valid: false, error: 'Country selection is required' };
  }
  const countryObj = ALLOWED_COUNTRIES.find(c => c.name === draft.country || c.code === draft.country);
  if (!countryObj) {
    return { valid: false, error: 'Country must be one of the 10 supported countries' };
  }
  if (!draft.city || !draft.city.trim()) {
    return { valid: false, error: 'City is required' };
  }
  if (!draft.timezone || !draft.timezone.trim()) {
    return { valid: false, error: 'IANA timezone is required' };
  }
  return { valid: true };
}

export function validateOnboardingSecurity(draft: OnboardingDraftData): ValidationResult {
  if (!draft.staffPassword || draft.staffPassword.length < 6) {
    return { valid: false, error: 'Staff password must be at least 6 characters' };
  }
  if (!draft.staffPin || !/^\d{4}$/.test(draft.staffPin)) {
    return { valid: false, error: `Staff verification PIN must be exactly ${STAFF_PIN_LENGTH} digits` };
  }
  return { valid: true };
}

export function validateTierConfiguration(tier: ProductTier, draft: OnboardingDraftData): ValidationResult {
  if (tier === 'spin' || tier === 'combined') {
    const spinRes = validateSpinConfiguration(draft.spinWheelConfiguration);
    if (!spinRes.valid) return spinRes;
  }

  if (tier === 'loyalty' || tier === 'combined') {
    const loyaltyRes = validateLoyaltyConfiguration(
      draft.loyaltyTarget,
      draft.loyaltyValidationDays,
      draft.loyaltyReward
    );
    if (!loyaltyRes.valid) return loyaltyRes;
  }

  if (tier === 'review' || tier === 'combined') {
    if (!draft.googleReviewUrl || !draft.googleReviewUrl.trim()) {
      return { valid: false, error: 'Google Review URL is required' };
    }
    try {
      const url = new URL(draft.googleReviewUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'Invalid Google Review URL format' };
      }
    } catch {
      return { valid: false, error: 'Invalid Google Review URL' };
    }
  } else if (draft.googleReviewUrl && draft.googleReviewUrl.trim()) {
    // Optional add-on validation for spin or loyalty tiers
    try {
      const url = new URL(draft.googleReviewUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'Invalid Google Review URL format' };
      }
    } catch {
      return { valid: false, error: 'Invalid Google Review URL' };
    }
  }

  return { valid: true };
}
