import { Business } from '../../../shared/types/business';
import { Offer } from '../../../shared/types/offer';
import { Customer } from '../../../shared/types/customer';
import { CustomerJourneyStage, CustomerStatusResponse } from '../../../shared/types/qr';
import { isSameMerchantDay } from '../utils/timezone';
import { maskMobile } from '../utils/crypto';

export class CustomerStatusService {
  /**
   * Calculate complete server-authoritative status and determine the first incomplete stage
   */
  public evaluateStatus(
    business: Business,
    offer: Offer | null,
    customer: Customer | null,
    entryType?: string
  ): CustomerStatusResponse['status'] {
    if (!customer) {
      return {
        spinAvailable: false,
        spinCompletedToday: false,
        loyaltyAvailable: false,
        loyaltyCompletedToday: false,
        loyaltyMilestoneReached: false,
        activeReward: null,
        reviewJourneyCompleted: false,
        currentStage: 'auth',
        isCooldown: false,
      };
    }

    const now = new Date();
    const tz = business.timezone || 'UTC';
    const defaultGoogleUrl = `https://maps.google.com/?q=${encodeURIComponent(business.name.replace(/\s+/g, '+'))}`;
    const effectiveReviewUrl = offer?.googleReviewUrl || business.googleReviewUrl || defaultGoogleUrl;

    // Daily checks in merchant timezone
    const spinCompletedToday = isSameMerchantDay(customer.lastSpinAt, now, tz);
    const loyaltyCompletedToday = isSameMerchantDay(customer.lastVisitAt, now, tz);

    const isExpressLoyalty =
      entryType === 'loyalty' ||
      entryType === 'instant_loyalty' ||
      entryType === 'loyalty_express';
    const hasSpinTier = !isExpressLoyalty && (business.tier === 'spin' || business.tier === 'combined');
    const hasLoyaltyTier = business.tier === 'loyalty' || business.tier === 'combined';

    const loyaltyTarget = offer?.loyaltyTarget || business.loyaltyTarget || 6;
    const loyaltyMilestoneReached = (customer.visitCount >= loyaltyTarget);

    const activeReward = customer.activeVoucher ? {
      rewardId: customer.activeVoucher.rewardId,
      code: customer.activeVoucher.code,
      title: customer.activeVoucher.title,
      type: customer.activeVoucher.type,
    } : null;

    const spinAvailable = hasSpinTier && !spinCompletedToday && !activeReward;
    const loyaltyAvailable = hasLoyaltyTier && !loyaltyCompletedToday;
    const reviewJourneyCompleted = customer.reviewJourneyCompleted === true;
    const hasEverEnteredReview = Boolean(
      customer.hasEnteredReviewFlow ||
      customer.reviewAcceleratorEntryId ||
      customer.reviewJourneyCompleted
    );

    // Individual app flow completed today (Spin finished, Loyalty stamped today, Voucher redeemed or deferred)
    const individualFlowCompleted = isExpressLoyalty
      ? (loyaltyCompletedToday && (!activeReward || customer.voucherDeferred))
      : (
          (hasSpinTier && spinCompletedToday && (!activeReward || customer.voucherDeferred)) ||
          (hasLoyaltyTier && loyaltyCompletedToday && (!activeReward || customer.voucherDeferred))
        );

    // Determine First Incomplete Stage
    let currentStage: CustomerJourneyStage = 'cooldown';
    let isCooldown = false;

    if (activeReward && !customer.voucherDeferred) {
      currentStage = 'voucher';
    } else if (hasSpinTier && !spinCompletedToday) {
      currentStage = 'spin';
    } else if (hasLoyaltyTier && loyaltyMilestoneReached && !customer.voucherDeferred) {
      currentStage = 'loyalty_reward';
    } else if (hasLoyaltyTier && !loyaltyCompletedToday) {
      currentStage = 'loyalty';
    } else if (customer.voucherDeferred && (business.tier === 'spin' || business.tier === 'loyalty')) {
      if (!hasEverEnteredReview) {
        currentStage = 'review';
        isCooldown = false;
      } else {
        currentStage = 'cooldown';
        isCooldown = true;
      }
    } else if (business.tier === 'review') {
      if (!hasEverEnteredReview) {
        currentStage = 'review';
      } else {
        currentStage = 'cooldown';
        isCooldown = true;
      }
    } else if (individualFlowCompleted) {
      // Completed specific individual tier flow! (Spin / Loyalty stamp / reward redeem)
      // Check database condition in specific user data:
      // Has this registered mobile number ever entered the review accelerator app flow?
      if (hasEverEnteredReview) {
        // Condition is TRUE (already entered/completed before): skips review accelerator add-on, direct to cooldown!
        currentStage = 'cooldown';
        isCooldown = true;
      } else {
        // Condition is FALSE (never entered before): enters review accelerator app flow!
        currentStage = 'review';
        isCooldown = false;
      }
    } else {
      currentStage = 'cooldown';
      isCooldown = true;
    }

    return {
      spinAvailable,
      spinCompletedToday,
      loyaltyAvailable,
      loyaltyCompletedToday,
      loyaltyMilestoneReached,
      activeReward,
      reviewJourneyCompleted,
      hasEnteredReviewFlow: customer.hasEnteredReviewFlow,
      reviewAcceleratorEntryId: customer.reviewAcceleratorEntryId,
      currentStage,
      isCooldown,
      cooldownMessage: isCooldown
        ? 'Your offer will reset at midnight 00:00. Thank you for visiting us again!'
        : undefined,
    };
  }

  /**
   * Format full status response payload
   */
  public formatStatusResponse(
    business: Business,
    offer: Offer | null,
    customer: Customer | null,
    entryType?: string
  ): CustomerStatusResponse {
    const defaultGoogleUrl = `https://maps.google.com/?q=${encodeURIComponent(business.name.replace(/\s+/g, '+'))}`;
    const effectiveReviewUrl = offer?.googleReviewUrl || business.googleReviewUrl || defaultGoogleUrl;
    const status = this.evaluateStatus(business, offer, customer, entryType);

    return {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        tier: business.tier,
        category: business.category,
        city: business.city,
        country: business.country,
        timezone: business.timezone,
        logoEmoji: business.logoEmoji,
        logoUrl: business.logoUrl,
        accentColor: business.accentColor,
        googleReviewUrl: effectiveReviewUrl,
        googlePlaceId: business.googlePlaceId,
        zomatoUrl: business.zomatoUrl,
        swiggyUrl: business.swiggyUrl,
        instagramUrl: business.instagramUrl,
        skipRedemptionPin: business.skipRedemptionPin ?? false,
        isRushMode: Boolean(business.isRushMode ?? business.skipRedemptionPin ?? (business as any).rushModeEnabled ?? (business as any).skipStaffVerification),
        rushModeEnabled: Boolean(business.isRushMode ?? business.skipRedemptionPin ?? (business as any).rushModeEnabled),
        skipStaffVerification: Boolean((business as any).skipStaffVerification ?? business.skipRedemptionPin ?? business.isRushMode),
      },
      isRushMode: Boolean(business.isRushMode ?? business.skipRedemptionPin ?? (business as any).rushModeEnabled ?? (business as any).skipStaffVerification),
      offer: offer ? {
        id: offer.id,
        title: offer.title,
        tier: offer.tier,
        status: offer.status,
        spinWheelConfiguration: offer.spinWheelConfiguration,
        loyaltyTarget: offer.loyaltyTarget,
        loyaltyValidationDays: offer.loyaltyValidationDays,
        loyaltyReward: offer.loyaltyReward,
        googleReviewUrl: effectiveReviewUrl,
      } : null,
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        mobileMasked: maskMobile(customer.mobile),
        visitCount: customer.visitCount,
        totalVisits: customer.totalVisits,
        currentStreak: customer.currentStreak ?? 0,
        longestStreak: customer.longestStreak ?? customer.currentStreak ?? 0,
        vipRank: customer.vipRank,
        streakerRank: customer.streakerRank ?? null,
        rank: customer.rank || customer.vipRank,
        lifetimeRank: customer.lifetimeRank || customer.vipRank,
        activeOfferId: customer.activeOfferId,
        cycleStartedAt: customer.cycleStartedAt,
        hasEnteredReviewFlow: customer.hasEnteredReviewFlow,
        reviewAcceleratorEntryId: customer.reviewAcceleratorEntryId,
        activeVoucher: customer.activeVoucher,
      } : null,
      status,
    };
  }

  /**
   * Resolve the next stage for a customer based on tier and completion status.
   * Returns null or 'completed' for single tiers after the primary action/voucher is skipped,
   * properly flagging the customer as in cooldown for that merchant until the next reset period.
   */
  public resolveNextStage(
    business: Business,
    customer: Customer,
    currentStage?: CustomerJourneyStage
  ): CustomerJourneyStage | 'completed' | null {
    const isSingleTier = business.tier === 'spin' || business.tier === 'loyalty';
    if (isSingleTier) {
      const hasEverEnteredReview = Boolean(
        customer.hasEnteredReviewFlow ||
        customer.reviewAcceleratorEntryId ||
        customer.reviewJourneyCompleted
      );
      return hasEverEnteredReview ? 'completed' : 'review';
    }

    if (business.tier === 'combined') {
      if (currentStage === 'spin' || currentStage === 'voucher') {
        return 'loyalty';
      }
      if (currentStage === 'loyalty' || currentStage === 'loyalty_reward') {
        const hasEverEnteredReview = Boolean(
          customer.hasEnteredReviewFlow ||
          customer.reviewAcceleratorEntryId ||
          customer.reviewJourneyCompleted
        );
        return hasEverEnteredReview ? 'cooldown' : 'review';
      }
      return 'cooldown';
    }

    return 'cooldown';
  }
}
