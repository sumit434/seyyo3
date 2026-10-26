import React, { useState } from 'react';
import { CustomerStatusResponse } from '../../../shared/types/qr';
import { customerService } from '../../services/customerService';
import { SpinWheel } from './SpinWheel';
import { RewardVoucher } from './RewardVoucher';
import { LoyaltyLog } from './LoyaltyTracker';
import { LoyaltyClaimStep } from './LoyaltyClaimStep';
import { ReviewGenerator } from '../review/ReviewGenerator';
import { CooldownScreen } from './CooldownScreen';

export type CustomerFlowStep = 'SPIN' | 'SPIN_REWARD' | 'LOYALTY' | 'LOYALTY_REWARD' | 'REVIEW' | 'COOLDOWN';

export interface CustomerJourneyProps {
  business: CustomerStatusResponse['business'];
  offer: CustomerStatusResponse['offer'];
  customer: NonNullable<CustomerStatusResponse['customer']>;
  status: CustomerStatusResponse['status'];
  sessionToken?: string | null;
  entryMode?: 'combined' | 'spin' | 'loyalty' | 'review';
  slug: string;
  onStatusUpdate: (updated: CustomerStatusResponse) => void;
  onSkip?: () => Promise<void> | void;
  onComplete?: () => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
}

export const CustomerJourney: React.FC<CustomerJourneyProps> = ({
  business,
  offer,
  customer,
  status,
  sessionToken,
  entryMode = 'combined',
  slug,
  onStatusUpdate,
  onSkip,
  onComplete,
  onRefresh,
}) => {
  const [userStepOverride, setUserStepOverride] = useState<'LOYALTY' | 'REVIEW' | 'COOLDOWN' | null>(null);

  const tier = business.tier;
  const isCombinedTier = tier === 'combined';
  const isExpressLoyalty = entryMode === 'loyalty' || tier === 'loyalty';
  const isSpinOnly = tier === 'spin';

  // Active spin reward payload resolution
  const activeSpinVoucher = status.activeReward || (customer.activeVoucher && customer.activeVoucher.type === 'spin' ? {
    rewardId: customer.activeVoucher.rewardId,
    code: customer.activeVoucher.code,
    title: customer.activeVoucher.title,
    type: customer.activeVoucher.type,
  } : null);

  // Skip handler: routes single-tier through Review Accelerator (if never entered) or cooldown, or advances combined tier
  const handleSkip = async () => {
    // 1. Check active tier: single tiers evaluate lifetime-once review rule
    if (tier === 'spin' || tier === 'loyalty') {
      const hasEverEnteredReview = Boolean(
        customer?.hasEnteredReviewFlow ||
        customer?.reviewAcceleratorEntryId ||
        (customer as any)?.reviewJourneyCompleted ||
        status?.reviewJourneyCompleted
      );
      const fallbackTarget: 'REVIEW' | 'COOLDOWN' = hasEverEnteredReview ? 'COOLDOWN' : 'REVIEW';
      setUserStepOverride(fallbackTarget);

      if (business.id && customer.id) {
        try {
          const updated = await customerService.deferVoucher(business.id, customer.id);
          if (updated) {
            onStatusUpdate(updated);
          }
        } catch {
          // Safe to proceed
        }
      }
      if (onSkip) {
        await onSkip();
      } else if (onComplete && hasEverEnteredReview) {
        await onComplete();
      }
      return;
    }

    // 2. Combined tier: maintain standard stage progression (spin -> loyalty -> review)
    setUserStepOverride('LOYALTY');
    if (business.id && customer.id) {
      try {
        await customerService.deferVoucher(business.id, customer.id);
      } catch {
        // Safe to proceed
      }
    }
    if (onSkip) {
      await onSkip();
    } else {
      try {
        const updated = await customerService.getStatus(slug, sessionToken || undefined, customer.id, entryMode);
        onStatusUpdate(updated);
      } catch {
        // Retain current status
      }
    }
  };

  const handleContinueFromSpinReward = handleSkip;

  // Mutually exclusive step resolver
  const resolveCurrentStep = (): CustomerFlowStep => {
    if (userStepOverride === 'COOLDOWN') {
      return 'COOLDOWN';
    }
    if (userStepOverride === 'REVIEW') {
      return 'REVIEW';
    }

    // 1. EXPRESS LOYALTY INVARIANCE: Never render spin or spin reward steps
    if (isExpressLoyalty) {
      if (status.currentStage === 'loyalty_reward' || (customer.activeVoucher?.type === 'loyalty' && status.loyaltyMilestoneReached)) {
        return 'LOYALTY_REWARD';
      }
      if (!status.loyaltyCompletedToday || status.loyaltyAvailable || status.currentStage === 'loyalty') {
        return 'LOYALTY';
      }
      if (status.currentStage === 'review') {
        return 'REVIEW';
      }
      return 'COOLDOWN';
    }

    // 2. SPIN-ONLY INVARIANCE: Never render loyalty steps
    if (isSpinOnly) {
      const hasUnredeemedSpinReward = Boolean(
        (status.currentStage === 'voucher' && status.activeReward && !customer.voucherDeferred) ||
        (customer.activeVoucher && customer.activeVoucher.type === 'spin' && !customer.voucherDeferred)
      );
      if (hasUnredeemedSpinReward) {
        return 'SPIN_REWARD';
      }
      if (status.spinAvailable || status.currentStage === 'spin') {
        return 'SPIN';
      }
      if (status.currentStage === 'review') {
        return 'REVIEW';
      }
      return 'COOLDOWN';
    }

    // 3. COMBINED TIER FLOW: Strict mutual exclusivity between Spin Reward and Loyalty
    if (isCombinedTier) {
      if (userStepOverride === 'LOYALTY') {
        if (status.currentStage === 'loyalty_reward' || (customer.activeVoucher?.type === 'loyalty' && status.loyaltyMilestoneReached)) {
          return 'LOYALTY_REWARD';
        }
        if (!status.loyaltyCompletedToday || status.loyaltyAvailable || status.currentStage === 'loyalty') {
          return 'LOYALTY';
        }
        if (status.currentStage === 'review') {
          return 'REVIEW';
        }
        return 'COOLDOWN';
      }

      const canSpin = (status as any)?.canSpin ?? status.spinAvailable;
      if (canSpin && !status.spinCompletedToday && status.currentStage === 'spin') {
        return 'SPIN';
      }

      const hasUnredeemedSpinReward = Boolean(
        (status.currentStage === 'voucher' && status.activeReward && !customer.voucherDeferred) ||
        (customer.activeVoucher && customer.activeVoucher.type === 'spin' && !customer.voucherDeferred)
      );

      if (hasUnredeemedSpinReward) {
        return 'SPIN_REWARD';
      }

      if (status.currentStage === 'loyalty_reward' || (customer.activeVoucher?.type === 'loyalty' && status.loyaltyMilestoneReached)) {
        return 'LOYALTY_REWARD';
      }

      const canStamp = (status as any)?.canStamp ?? status.loyaltyAvailable;
      if (canStamp || !status.loyaltyCompletedToday || status.currentStage === 'loyalty') {
        return 'LOYALTY';
      }

      if (status.currentStage === 'review') {
        return 'REVIEW';
      }

      return 'COOLDOWN';
    }

    if (status.currentStage === 'review') {
      return 'REVIEW';
    }
    return 'COOLDOWN';
  };

  const activeStep = resolveCurrentStep();

  return (
    <>
      {/* STEP 1: SPIN REWARD */}
      {activeStep === 'SPIN_REWARD' && activeSpinVoucher && (
        <RewardVoucher
          voucher={{
            rewardId: activeSpinVoucher.rewardId,
            code: activeSpinVoucher.code,
            title: activeSpinVoucher.title,
            type: activeSpinVoucher.type,
            claimedAt: customer.activeVoucher?.claimedAt || new Date().toISOString(),
            emoji: offer?.spinWheelConfiguration?.find(s => s.rewardLabel.toLowerCase().trim() === activeSpinVoucher.title.toLowerCase().trim())?.emoji,
          }}
          businessName={business.name}
          businessId={business.id}
          customerId={customer.id}
          skipRedemptionPin={Boolean((business as any)?.skipRedemptionPin)}
          tier={business.tier}
          continueLabel="Skip and continue"
          onRedeemed={async () => {
            const updated = await customerService.getStatus(slug, sessionToken || undefined, customer.id, entryMode);
            onStatusUpdate(updated);
          }}
          onContinue={handleContinueFromSpinReward}
          onSkip={handleSkip}
        />
      )}

      {/* STEP 2: SPIN WHEEL */}
      {activeStep === 'SPIN' && offer?.spinWheelConfiguration && (
        <SpinWheel
          businessId={business.id}
          customerId={customer.id}
          sessionToken={sessionToken || undefined}
          slices={offer.spinWheelConfiguration}
          accentColor={business.accentColor}
          onSpinCompleted={async () => {
            const updated = await customerService.getStatus(slug, sessionToken || undefined, customer.id, entryMode);
            onStatusUpdate(updated);
          }}
        />
      )}

      {/* STEP 3: LOYALTY MILESTONE CLAIM */}
      {activeStep === 'LOYALTY_REWARD' && customer.activeVoucher && (
        <LoyaltyClaimStep
          voucher={{
            rewardId: customer.activeVoucher.rewardId,
            code: customer.activeVoucher.code,
            title: customer.activeVoucher.title,
            type: 'loyalty',
            claimedAt: customer.activeVoucher.claimedAt,
          }}
          businessName={business.name}
          businessId={business.id}
          customerId={customer.id}
          sessionToken={sessionToken || undefined}
          skipRedemptionPin={Boolean((business as any)?.skipRedemptionPin)}
          onRedeemed={async () => {
            const updated = await customerService.getStatus(slug, sessionToken || undefined, customer.id, entryMode);
            onStatusUpdate(updated);
          }}
          onContinue={async () => {
            if (tier === 'loyalty') {
              const hasEverEnteredReview = Boolean(
                customer?.hasEnteredReviewFlow ||
                customer?.reviewAcceleratorEntryId ||
                (customer as any)?.reviewJourneyCompleted ||
                status?.reviewJourneyCompleted
              );
              setUserStepOverride(hasEverEnteredReview ? 'COOLDOWN' : 'REVIEW');
              if (onComplete && hasEverEnteredReview) await onComplete();
              return;
            }
            const updated = await customerService.getStatus(slug, sessionToken || undefined, customer.id, entryMode);
            onStatusUpdate(updated);
          }}
        />
      )}

      {/* STEP 4: LOYALTY STAMP CARD */}
      {activeStep === 'LOYALTY' && (
        <LoyaltyLog
          businessId={business.id}
          customerId={customer.id}
          sessionToken={sessionToken || undefined}
          visitCount={customer.visitCount}
          loyaltyTarget={offer?.loyaltyTarget || 6}
          totalVisits={customer.totalVisits}
          currentStreak={customer.currentStreak ?? 0}
          longestStreak={customer.longestStreak ?? customer.currentStreak ?? 0}
          streakerRank={customer.streakerRank}
          loyaltyRewardTitle={offer?.loyaltyReward || 'Special Gift'}
          isStampedToday={status.loyaltyCompletedToday}
          cycleStartedAt={customer.cycleStartedAt}
          validationDays={offer?.loyaltyValidationDays || 60}
          activeOfferId={customer.activeOfferId}
          entryMode={entryMode}
          onStampSuccess={async (data: any) => {
            if (data && data.status) {
              onStatusUpdate(data);
              return;
            }
            const effectiveMode = business.tier === 'loyalty' ? 'loyalty' : entryMode;
            try {
              const updated = await customerService.getStatus(slug, sessionToken || undefined, customer.id, effectiveMode);
              onStatusUpdate(updated);
            } catch {
              const updated = await customerService.getStatus(slug, undefined, customer.id, effectiveMode);
              onStatusUpdate(updated);
            }
          }}
          onContinue={async () => {
            const effectiveMode = business.tier === 'loyalty' ? 'loyalty' : entryMode;
            try {
              const updated = await customerService.getStatus(slug, sessionToken || undefined, customer.id, effectiveMode);
              onStatusUpdate(updated);
            } catch {
              const updated = await customerService.getStatus(slug, undefined, customer.id, effectiveMode);
              onStatusUpdate(updated);
            }
          }}
        />
      )}

      {/* STEP 5: REVIEW GENERATOR */}
      {activeStep === 'REVIEW' && (
        <ReviewGenerator
          businessId={business.id}
          businessName={business.name}
          customerId={customer.id}
          customerName={customer.name}
          googleReviewUrl={offer?.googleReviewUrl || business.googleReviewUrl || `https://maps.google.com/?q=${encodeURIComponent(business.name)}`}
          onReviewCompleted={async () => {
            const updated = await customerService.getStatus(slug, sessionToken || undefined, customer.id, entryMode);
            onStatusUpdate(updated);
          }}
        />
      )}

      {/* STEP 6: COOLDOWN */}
      {activeStep === 'COOLDOWN' && (
        <CooldownScreen
          customer={customer}
          vipRank={customer?.vipRank}
          businessName={business.name}
          businessSlug={business.slug}
          logoEmoji={business.logoEmoji}
          accentColor={business.accentColor}
          visitCount={customer.visitCount}
          loyaltyTarget={offer?.loyaltyTarget || 6}
          totalVisits={customer.totalVisits}
          loyaltyRewardTitle={offer?.loyaltyReward}
          tier={business.tier}
          zomatoUrl={business.zomatoUrl}
          swiggyUrl={business.swiggyUrl}
          instagramUrl={business.instagramUrl}
          onRefresh={onRefresh || (() => {})}
        />
      )}
    </>
  );
};

export default CustomerJourney;
