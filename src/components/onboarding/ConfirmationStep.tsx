import React, { useState } from 'react';
import { ProductTier, PRODUCT_TIERS } from '../../../shared/constants/tiers';
import { OnboardingDraftData } from '../../../shared/types/onboarding';
import { Button } from '../common/Button';
import { ArrowLeft, Rocket, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ConfirmationStepProps {
  tier: ProductTier;
  draftData: OnboardingDraftData;
  onLaunch: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  tier,
  draftData,
  onLaunch,
  onBack,
  isLoading,
}) => {
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const tierInfo = PRODUCT_TIERS[tier] || PRODUCT_TIERS.combined;

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-2xl font-bold text-[#10181c]">Ready to Launch Your SEYYO Platform</h2>
        <p className="text-sm text-[#6a787e] mt-1">
          Review your configuration summary before activating the live customer campaign.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 sm:p-6 space-y-5">
        {/* Business Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border border-[#e2e7e6] overflow-hidden shrink-0"
            style={{ backgroundColor: `${draftData.accentColor || '#0e7c66'}15` }}
          >
            {draftData.logoUrl ? (
              <img src={draftData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span>{draftData.logoEmoji || '🏪'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0e7c66] text-white inline-block">
              {tierInfo.name} Tier
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-[#10181c] mt-1 break-words">
              {draftData.businessName}
            </h3>
            <p className="text-sm font-medium text-[#4b5563] break-words mt-0.5">
              {draftData.category} • {draftData.city}, {draftData.country} ({draftData.timezone})
            </p>
          </div>
        </div>

        {/* Tier Details - Features Section */}
        <div className="pt-5 border-t border-[#e2e7e6] space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6a787e]">Configured Features</h4>

          {tierInfo.hasSpin && draftData.spinWheelConfiguration && (
            <div className="p-3.5 rounded-2xl bg-[#f1f3f2]/60 border border-[#e2e7e6]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm font-bold text-[#10181c] mb-2 gap-1">
                <span>🎡 Spin & Win Wheel</span>
                <span className="text-xs text-[#0e7c66] font-semibold shrink-0">
                  {draftData.spinWheelConfiguration.length} Slices (100% Guaranteed Win)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[#374151]">
                {draftData.spinWheelConfiguration.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0">{s.emoji}</span>
                    <span className="truncate break-words">{s.rewardLabel} ({s.weight}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tierInfo.hasLoyalty && (
            <div className="p-3.5 rounded-2xl bg-[#f1f3f2]/60 border border-[#e2e7e6]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm font-bold text-[#10181c] mb-1 gap-1">
                <span>⭐ Loyalty Log (Digital Stamp Card)</span>
                <span className="text-xs text-[#0e7c66] font-semibold shrink-0">
                  {draftData.loyaltyTarget} Visits • {draftData.loyaltyValidationDays} Days Window
                </span>
              </div>
              <p className="text-sm text-[#374151] break-words">
                Milestone Reward: <span className="font-semibold text-[#10181c]">{draftData.loyaltyReward}</span>
              </p>
            </div>
          )}

          {(tierInfo.hasReview || draftData.googleReviewUrl) && (
            <div className="p-3.5 rounded-2xl bg-[#f1f3f2]/60 border border-[#e2e7e6]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm font-bold text-[#10181c] mb-1 gap-1">
                <span>⭐ Google Review</span>
                <span className="text-xs text-[#0e7c66] font-semibold shrink-0">
                  {tierInfo.hasReview ? 'Verified Feedback' : 'Add-On Enabled'}
                </span>
              </div>
              <p className="text-sm text-[#374151] break-words">
                Target URL: <span className="text-[#10181c] font-medium break-all">{draftData.googleReviewUrl || 'Not configured'}</span>
              </p>
            </div>
          )}

          {/* Social Links Summary */}
          {(draftData.zomatoUrl || draftData.swiggyUrl || draftData.instagramUrl) && (
            <div className="p-3.5 rounded-2xl bg-[#f1f3f2]/60 border border-[#e2e7e6]">
              <div className="flex items-center justify-between text-sm font-bold text-[#10181c] mb-1">
                <span>🔗 Connected Social Channels</span>
                <span className="text-xs text-[#0e7c66] font-semibold">Cooldown Page</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs pt-1">
                {draftData.zomatoUrl && (
                  <span className="px-2 py-0.5 rounded-md bg-[#E23744]/10 text-[#E23744] font-semibold">
                    Zomato Active
                  </span>
                )}
                {draftData.swiggyUrl && (
                  <span className="px-2 py-0.5 rounded-md bg-[#FC8019]/10 text-[#FC8019] font-semibold">
                    Swiggy Active
                  </span>
                )}
                {draftData.instagramUrl && (
                  <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-700 font-semibold">
                    Instagram Active
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Security Summary */}
        <div className="pt-5 border-t border-[#e2e7e6] flex items-center justify-between text-xs text-[#6a787e]">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#0e7c66]" />
            Staff Security Configured
          </span>
          <span className="font-mono bg-[#f8faf9] border border-[#e2e7e6] px-2.5 py-1 rounded-md text-[#10181c] font-bold">
            PIN: ••••
          </span>
        </div>
      </div>

      {/* Mandatory Immutability Acknowledgment Checkbox */}
      <div className="bg-amber-50/80 border border-amber-200/80 p-4 sm:p-5 rounded-2xl text-left">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAcknowledged}
            onChange={e => setIsAcknowledged(e.target.checked)}
            className="mt-0.5 sm:mt-1 w-5 h-5 rounded-md border-amber-400 text-[#0e7c66] focus:ring-[#0e7c66] cursor-pointer shrink-0"
          />
          <div className="text-sm text-amber-950 leading-relaxed font-medium">
            <div className="font-bold flex items-center gap-1.5 text-amber-950 mb-1 text-sm sm:text-base">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Offer Immutability Rule</span>
            </div>
            I understand that once this offer is launched, its active configuration cannot be edited midway. It must be completed, cancelled, or deleted before a new configuration can be created.
          </div>
        </label>
      </div>

      {/* Action Buttons - Stacked on Mobile, Inline on Desktop */}
      <div className="fixed sm:static bottom-0 inset-x-0 p-4 sm:p-0 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-t-0 border-[#e2e7e6] z-30 sm:mt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg sm:shadow-none w-full">
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={onBack}
          className="gap-2 min-h-[48px] px-4 sm:px-5 sm:w-auto w-full"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isAcknowledged}
          isLoading={isLoading}
          onClick={onLaunch}
          className="gap-2 shadow-lg min-h-[48px] px-5 sm:px-6 sm:w-auto w-full"
        >
          <Rocket className="w-5 h-5" />
          <span>Launch Live Platform</span>
        </Button>
      </div>
    </div>
  );
};