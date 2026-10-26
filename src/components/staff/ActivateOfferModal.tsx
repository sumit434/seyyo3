import React, { useState } from 'react';
import { ProductTier, PRODUCT_TIERS } from '../../../shared/constants/tiers';
import { SpinSliceConfig } from '../../../shared/types/business';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { SpinConfiguration } from '../onboarding/SpinConfiguration';
import { LoyaltyConfiguration } from '../onboarding/LoyaltyConfiguration';
import { ReviewConfiguration } from '../onboarding/ReviewConfiguration';
import { validateTierConfiguration } from '../../../shared/validation/offerValidation';
import { staffApi } from '../../services/staffApi';
import { Sparkles, Award, Star, Rocket, CheckCircle2, AlertCircle } from 'lucide-react';

interface ActivateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToken: string;
  business: {
    id: string;
    name: string;
    tier: ProductTier;
    spinWheelConfiguration?: SpinSliceConfig[];
    loyaltyTarget?: number;
    loyaltyValidationDays?: number;
    loyaltyReward?: string;
    googleReviewUrl?: string;
  };
  onSuccess: () => void;
}

export const ActivateOfferModal: React.FC<ActivateOfferModalProps> = ({
  isOpen,
  onClose,
  sessionToken,
  business,
  onSuccess,
}) => {
  const tierInfo = PRODUCT_TIERS[business.tier] || PRODUCT_TIERS.combined;

  // Form states initialized with merchant's configured defaults
  const [title, setTitle] = useState(`${business.name} Engagement Campaign`);
  const [description, setDescription] = useState(`Official ${business.tier.toUpperCase()} experience for ${business.name}`);

  const [spinSlices, setSpinSlices] = useState<SpinSliceConfig[]>(
    business.spinWheelConfiguration && business.spinWheelConfiguration.length >= 2
      ? business.spinWheelConfiguration
      : [
          { id: 's1', rewardLabel: '10% Off Your Purchase', emoji: '🎁', weight: 35 },
          { id: 's2', rewardLabel: 'Free Beverage Upgrade', emoji: '☕', weight: 35 },
          { id: 's3', rewardLabel: 'Chef Signature Dessert', emoji: '🍰', weight: 20 },
          { id: 's4', rewardLabel: 'VIP Grand Mystery Prize', emoji: '⭐', weight: 10 },
        ]
  );

  const [loyaltyTarget, setLoyaltyTarget] = useState<number>(business.loyaltyTarget || 6);
  const [loyaltyValidationDays, setLoyaltyValidationDays] = useState<number>(business.loyaltyValidationDays || 45);
  const [loyaltyReward, setLoyaltyReward] = useState<string>(business.loyaltyReward || 'Free Signature Item / VIP Gift');

  const [googleReviewUrl, setGoogleReviewUrl] = useState<string>(business.googleReviewUrl || `https://maps.google.com/?q=${encodeURIComponent(business.name)}`);

  const [step, setStep] = useState<'configure' | 'confirm'>('configure');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a campaign title.');
      return;
    }

    // Validate tier configuration
    const valResult = validateTierConfiguration(business.tier, {
      spinWheelConfiguration: tierInfo.hasSpin ? spinSlices : undefined,
      loyaltyTarget: tierInfo.hasLoyalty ? loyaltyTarget : undefined,
      loyaltyValidationDays: tierInfo.hasLoyalty ? loyaltyValidationDays : undefined,
      loyaltyReward: tierInfo.hasLoyalty ? loyaltyReward.trim() : undefined,
      googleReviewUrl: googleReviewUrl.trim() || undefined,
    });

    if (!valResult.valid) {
      setError(valResult.error || 'Please fix configuration errors before continuing.');
      return;
    }

    setStep('confirm');
  };

  const handleActivateCampaign = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await staffApi.activateOffer(sessionToken, {
        title: title.trim(),
        description: description.trim(),
        spinWheelConfiguration: tierInfo.hasSpin ? spinSlices : undefined,
        loyaltyTarget: tierInfo.hasLoyalty ? loyaltyTarget : undefined,
        loyaltyValidationDays: tierInfo.hasLoyalty ? loyaltyValidationDays : undefined,
        loyaltyReward: tierInfo.hasLoyalty ? loyaltyReward.trim() : undefined,
        googleReviewUrl: googleReviewUrl.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to activate campaign');
      setStep('configure');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={`Launch ${tierInfo.name} Campaign`}
      description={`Activate a fresh offer tailored to your ${business.tier.toUpperCase()} tier plan.`}
      maxWidth="xl"
    >
      <div className="space-y-6 text-left">
        {/* Tier Plan Badge & Summary */}
        <div className="w-full max-w-full overflow-hidden break-words bg-[#e2f1ec] border border-[#0e7c66]/20 p-3.5 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#0e7c66] font-bold">
              Current Activated Plan
            </span>
            <h4 className="text-base sm:text-lg font-bold text-[#10181c] leading-snug">{tierInfo.name}</h4>
            <p className="text-xs sm:text-sm text-[#0a6252] leading-relaxed break-words">{tierInfo.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center shrink-0">
            {tierInfo.hasSpin && (
              <span className="px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-white text-[#10181c] border border-[#0e7c66]/20 flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#0e7c66]" /> Spin
              </span>
            )}
            {tierInfo.hasLoyalty && (
              <span className="px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-white text-[#10181c] border border-[#0e7c66]/20 flex items-center gap-1 shadow-2xs">
                <Award className="w-3.5 h-3.5 text-[#0e7c66]" /> Loyalty
              </span>
            )}
            {tierInfo.hasReview && (
              <span className="px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-white text-[#10181c] border border-[#0e7c66]/20 flex items-center gap-1 shadow-2xs">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Review
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {step === 'configure' ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-5">
            {/* Campaign Basic Info */}
            <div className="space-y-3 bg-[#f8faf9] p-4 sm:p-5 rounded-2xl border border-[#e2e7e6]">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#6a787e]">
                Campaign Identity
              </h5>
              <Input
                label="Campaign / Offer Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Autumn Customer Rewards & Perks"
                required
              />
              <Input
                label="Public Customer Tagline"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Spin for instant treats and unlock loyalty rewards!"
              />
            </div>

            {/* Tier-Specific Modular Configurations */}
            {tierInfo.hasSpin && (
              <SpinConfiguration
                slices={spinSlices}
                onChange={setSpinSlices}
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
              />
            )}

            {/* Review Accelerator: Core for review/combined, add-on for spin/loyalty */}
            <ReviewConfiguration
              googleReviewUrl={googleReviewUrl}
              isAddon={!tierInfo.hasReview}
              onChange={fields => {
                if (fields.googleReviewUrl !== undefined) setGoogleReviewUrl(fields.googleReviewUrl);
              }}
            />

            {/* Footer Buttons - Standard In-Flow Document Position */}
            <div className="pt-6 border-t border-[#e2e7e6] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl border border-[#e2e7e6] text-[#6a787e] hover:text-[#10181c] text-sm font-semibold transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <Button type="submit" variant="primary" size="md" className="w-full sm:w-auto min-h-[48px] px-6">
                Review & Activate
              </Button>
            </div>
          </form>
        ) : (
          /* Confirmation Step */
          <div className="space-y-5">
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e7e6] space-y-4">
              <div className="border-b border-[#e2e7e6] pb-3">
                <span className="text-[10px] uppercase font-bold text-[#6a787e]">Ready to Publish</span>
                <h4 className="text-lg font-black text-[#10181c]">{title}</h4>
                <p className="text-xs text-[#6a787e] mt-0.5">{description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {tierInfo.hasSpin && (
                  <div className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e7e6] space-y-1">
                    <span className="font-bold text-[#10181c] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0e7c66]" />
                      Spin & Win Rewards ({spinSlices.length})
                    </span>
                    <ul className="text-[#6a787e] list-disc list-inside space-y-0.5 text-[11px]">
                      {spinSlices.map(s => (
                        <li key={s.id} className="truncate">
                          {s.emoji} {s.rewardLabel} ({s.weight}%)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tierInfo.hasLoyalty && (
                  <div className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e7e6] space-y-1">
                    <span className="font-bold text-[#10181c] flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#0e7c66]" />
                      Loyalty Log Configuration
                    </span>
                    <p className="text-[#6a787e] text-[11px]">
                      Target: <strong className="text-[#10181c]">{loyaltyTarget} visits</strong>
                    </p>
                    <p className="text-[#6a787e] text-[11px]">
                      Window: <strong className="text-[#10181c]">{loyaltyValidationDays} days</strong>
                    </p>
                    <p className="text-[#6a787e] text-[11px] truncate">
                      Prize: <strong className="text-[#10181c]">{loyaltyReward}</strong>
                    </p>
                  </div>
                )}
              </div>

              {tierInfo.hasReview && (
                <div className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e7e6] text-xs">
                  <span className="font-bold text-[#10181c] flex items-center gap-1.5 mb-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Review Redirection
                  </span>
                  <p className="text-[#6a787e] text-[11px] font-mono truncate">{googleReviewUrl}</p>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Activating this offer will immediately make it active for all in-store QR code scans. Once active, the configuration remains immutable to protect customer transparency.
              </span>
            </div>

            {/* Footer Buttons - Standard In-Flow Document Position */}
            <div className="pt-6 border-t border-[#e2e7e6] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('configure')}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl border border-[#e2e7e6] text-[#6a787e] hover:text-[#10181c] text-sm font-semibold transition-colors cursor-pointer text-center"
              >
                Back to Edit
              </button>
              <Button
                variant="primary"
                size="md"
                onClick={handleActivateCampaign}
                isLoading={isSubmitting}
                className="w-full sm:w-auto min-h-[48px] px-6 flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                <span>Launch & Activate Now</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
