import React, { useState } from 'react';
import { ProductTier, PRODUCT_TIERS } from '../../../shared/constants/tiers';
import { OnboardingDraftData } from '../../../shared/types/onboarding';
import { SpinSliceConfig } from '../../../shared/types/business';
import { SpinConfiguration } from './SpinConfiguration';
import { LoyaltyConfiguration } from './LoyaltyConfiguration';
import { ReviewConfiguration } from './ReviewConfiguration';
import { Button } from '../common/Button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { validateTierConfiguration } from '../../../shared/validation/offerValidation';

interface ConfigurationStepProps {
  tier: ProductTier;
  initialData: OnboardingDraftData;
  onNext: (data: Partial<OnboardingDraftData>) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const ConfigurationStep: React.FC<ConfigurationStepProps> = ({
  tier,
  initialData,
  onNext,
  onBack,
  isLoading,
}) => {
  const tierInfo = PRODUCT_TIERS[tier] || PRODUCT_TIERS.combined;

  const [spinSlices, setSpinSlices] = useState<SpinSliceConfig[]>(
    initialData.spinWheelConfiguration || [
      { id: 's1', rewardLabel: '10% Off Your Purchase', emoji: '🎁', weight: 35 },
      { id: 's2', rewardLabel: 'Free Beverage Upgrade', emoji: '☕', weight: 35 },
      { id: 's3', rewardLabel: 'Chef Signature Dessert', emoji: '🍰', weight: 20 },
      { id: 's4', rewardLabel: 'VIP Grand Mystery Prize', emoji: '⭐', weight: 10 },
    ]
  );

  const [loyaltyTarget, setLoyaltyTarget] = useState<number>(initialData.loyaltyTarget || 6);
  const [loyaltyValidationDays, setLoyaltyValidationDays] = useState<number>(initialData.loyaltyValidationDays || 45);
  const [loyaltyReward, setLoyaltyReward] = useState<string>(initialData.loyaltyReward || 'Free Signature Item / VIP Gift');

  const [googleReviewUrl, setGoogleReviewUrl] = useState<string>(
    initialData.googleReviewUrl || (tierInfo.hasReview ? 'https://maps.google.com/?q=Your+Business+Name' : '')
  );
  const [googlePlaceId, setGooglePlaceId] = useState<string>(initialData.googlePlaceId || '');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const candidateData: OnboardingDraftData = {
      spinWheelConfiguration: tierInfo.hasSpin ? spinSlices : undefined,
      loyaltyTarget: tierInfo.hasLoyalty ? loyaltyTarget : undefined,
      loyaltyValidationDays: tierInfo.hasLoyalty ? loyaltyValidationDays : undefined,
      loyaltyReward: tierInfo.hasLoyalty ? loyaltyReward.trim() : undefined,
      // Review URL configured for review/combined tier OR as an add-on for spin / loyalty tiers
      googleReviewUrl: googleReviewUrl.trim() || undefined,
      googlePlaceId: googlePlaceId.trim() || undefined,
    };

    const valResult = validateTierConfiguration(tier, candidateData);
    if (!valResult.valid) {
      setErrors({ form: valResult.error || 'Please correct configuration errors' });
      return;
    }

    onNext(candidateData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left pb-6 sm:pb-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#0e7c66] text-white text-xs font-bold uppercase tracking-wider">
            {tierInfo.name} Tier
          </span>
        </div>
        <h2 className="text-2xl font-bold text-[#10181c] mt-2">Configure Campaign Rules</h2>
        <p className="text-sm text-[#6a787e] mt-1">
          {tierInfo.tagline}. Tailor prizes and targets for your customers.
        </p>
      </div>

      {tierInfo.hasSpin && (
        <SpinConfiguration
          slices={spinSlices}
          onChange={setSpinSlices}
          error={errors.spin}
        />
      )}

      {tierInfo.hasLoyalty && (
        <LoyaltyConfiguration
          loyaltyTarget={loyaltyTarget}
          loyaltyValidationDays={loyaltyValidationDays}
          loyaltyReward={loyaltyReward}
          onChange={fields => {
            if (fields.loyaltyTarget !== undefined) setLoyaltyTarget(fields.loyaltyTarget);
            if (fields.loyaltyValidationDays !== undefined) setLoyaltyValidationDays(fields.loyaltyValidationDays);
            if (fields.loyaltyReward !== undefined) setLoyaltyReward(fields.loyaltyReward);
          }}
          errors={errors}
        />
      )}

      {/* Review Accelerator: Core feature for Review/Combined, and add-on for Spin/Loyalty */}
      <ReviewConfiguration
        googleReviewUrl={googleReviewUrl}
        googlePlaceId={googlePlaceId}
        isAddon={!tierInfo.hasReview}
        onChange={fields => {
          if (fields.googleReviewUrl !== undefined) setGoogleReviewUrl(fields.googleReviewUrl);
          if (fields.googlePlaceId !== undefined) setGooglePlaceId(fields.googlePlaceId);
        }}
        errors={errors}
      />

      {errors.form && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold">
          {errors.form}
        </div>
      )}

      {/* Mobile Sticky Bottom Bar / Desktop Inline Buttons */}
      <div className="fixed sm:static bottom-0 inset-x-0 p-4 sm:p-0 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-t-0 border-[#e2e7e6] z-30 mt-4 pt-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg sm:shadow-none w-full">
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={onBack}
          className="gap-2 min-h-[48px] px-4 sm:px-5 sm:w-auto"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          className="gap-2 min-h-[48px] px-5 sm:px-6 sm:w-auto"
        >
          <span>Security Setup</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </form>
  );
};