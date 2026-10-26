import { MemoryDB, StampClaim } from '../db/MemoryDB';
import { Customer } from '../../../shared/types/customer';
import { Reward } from '../../../shared/types/reward';
import { generateSecureToken, generateVoucherCode, maskMobile } from '../utils/crypto';
import { isSameMerchantDay, isWithinValidationWindow, getMerchantDaysDifference } from '../utils/timezone';

export class LoyaltyService {
  private db: MemoryDB;

  constructor() {
    this.db = MemoryDB.getInstance();
  }

  /**
   * Check for existing unverified stamp claims and auto-expire if older than 15 min or if settings changed
   */
  public checkAndCleanPendingClaims(businessId: string, customerId: string): {
    activeClaim: StampClaim | null;
    wasExpired: boolean;
  } {
    const business = this.db.getBusinessById(businessId);
    const claim = this.db.getPendingStampClaim(businessId, customerId);

    if (!claim) {
      return { activeClaim: null, wasExpired: false };
    }

    if (claim.status === 'PENDING') {
      const now = Date.now();
      const expiresAtMs = new Date(claim.expiresAt).getTime();
      const createdAtMs = new Date(claim.createdAt).getTime();
      const isOlderThan15Min = now > expiresAtMs || (now - createdAtMs > 15 * 60 * 1000);
      const currentSkipPin = business ? (business.skipRedemptionPin ?? false) : false;
      const modeChanged = claim.skipRedemptionPin !== currentSkipPin;

      if (isOlderThan15Min || modeChanged) {
        // Discard / cancel stale unverified claim so customer gets a fresh start
        this.db.clearPendingStampClaims(businessId, customerId);
        return { activeClaim: null, wasExpired: true };
      }

      return { activeClaim: claim, wasExpired: false };
    }

    return { activeClaim: null, wasExpired: false };
  }

  /**
   * Initiate/Draft an unverified stamp claim (status === 'PENDING')
   * Note: Visit count and daily cooldown are NOT incremented while in PENDING state!
   */
  public draftPendingClaim(businessId: string, customerId: string, sessionToken?: string): StampClaim {
    this.checkAndCleanPendingClaims(businessId, customerId);
    const existing = this.db.getPendingStampClaim(businessId, customerId);
    if (existing) {
      return existing;
    }

    const business = this.db.getBusinessById(businessId);
    const now = new Date();
    const claim: StampClaim = {
      id: `clm_${generateSecureToken(8)}`,
      businessId,
      customerId,
      sessionToken,
      status: 'PENDING',
      skipRedemptionPin: business?.skipRedemptionPin ?? false,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    };

    return this.db.saveStampClaim(claim);
  }

  /**
   * Stamp customer loyalty visit upon verified completion (status === 'COMPLETED').
   * Only upon successful verification are customer visit counts and daily cooldown locked!
   */
  public stampVisit(businessId: string, customerId: string, sessionToken?: string): {
    customer: Customer;
    milestoneReached: boolean;
    reward?: Reward;
  } {
    const business = this.db.getBusinessById(businessId);
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND');
    }

    if (business.tier !== 'loyalty' && business.tier !== 'combined') {
      throw new Error('INVALID_TIER: This business tier does not support loyalty stamps');
    }

    const offer = this.db.getActiveOfferByBusinessId(businessId);
    if (!offer || offer.status !== 'active') {
      throw new Error('OFFER_NOT_ACTIVE: No active loyalty campaign');
    }

    const customer = this.db.getCustomerById(customerId);
    if (!customer || customer.businessId !== businessId) {
      throw new Error('CUSTOMER_NOT_FOUND: Customer not found or cross-business violation');
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const tz = business.timezone || 'UTC';
    const validationDays = offer.loyaltyValidationDays || business.loyaltyValidationDays || 60;
    const target = offer.loyaltyTarget || business.loyaltyTarget || 6;
    const rewardTitle = offer.loyaltyReward || business.loyaltyReward || 'Special Loyalty Reward';

    // --- 1. DAILY COOLDOWN CHECK (MUST REMAIN FIRST) ---
    if (customer.lastVisitAt && isSameMerchantDay(customer.lastVisitAt, now, tz)) {
      throw new Error('VISIT_ALREADY_COMPLETED: You have already stamped your visit today. Resets at midnight.');
    }

    // --- CONSECUTIVE VISIT STREAK CALCULATION (Merchant Timezone Aware) ---
    if (customer.lastVisitAt) {
      const daysDiff = getMerchantDaysDifference(customer.lastVisitAt, now, tz);
      if (daysDiff === 1) {
        // Consecutive calendar day: streak continues!
        const prevStreak = (typeof customer.currentStreak === 'number' && customer.currentStreak > 0)
          ? customer.currentStreak
          : 1;
        customer.currentStreak = prevStreak + 1;
      } else if (daysDiff > 1) {
        // Gap of > 1 day: broken streak, reset to 1
        customer.currentStreak = 1;
      } else {
        // Same calendar day fallback if cooldown bypassed
        customer.currentStreak = (typeof customer.currentStreak === 'number' && customer.currentStreak > 0)
          ? customer.currentStreak
          : 1;
      }
    } else {
      // First visit: initial streak is 1
      customer.currentStreak = 1;
    }
    customer.longestStreak = Math.max(customer.longestStreak || 0, customer.currentStreak);

    // --- 2. LIFETIME VISITS (UNCONDITIONAL INCREMENT) ---
    customer.totalVisits = (customer.totalVisits || 0) + 1;

    // --- 3. TRIGGER 1: MERCHANT OFFER CHANGED / REPLACED ---
    // If the offer ID changed, customer begins a fresh cycle for the new offer
    if (customer.activeOfferId && customer.activeOfferId !== offer.id) {
      customer.visitCount = 0;
      customer.cycleStartedAt = nowIso;
      customer.activeOfferId = offer.id;
    } else if (!customer.activeOfferId) {
      customer.activeOfferId = offer.id;
    }

    // --- 4. TRIGGER 2: USER'S PERSONAL VALIDATION WINDOW EXPIRED ---
    // Evaluates only against the user's current cycle start date, never customer.createdAt
    if (customer.visitCount > 0 && customer.cycleStartedAt) {
      const isWindowValid = isWithinValidationWindow(customer.cycleStartedAt, now, validationDays, tz);
      if (!isWindowValid) {
        // Window expired: wipe incomplete cycle stamps and restart window
        customer.visitCount = 0;
        customer.cycleStartedAt = nowIso;
      }
    }

    // --- 5. INITIALIZE CYCLE START ON FIRST STAMP ---
    // If starting a brand-new cycle, stamp #1 locks in cycleStartedAt
    if (customer.visitCount === 0 || !customer.cycleStartedAt) {
      customer.cycleStartedAt = nowIso;
    }

    // --- 6. INCREMENT ACTIVE CYCLE STAMPS ---
    customer.visitCount = (customer.visitCount || 0) + 1;
    customer.lastVisitAt = nowIso;
    customer.updatedAt = nowIso;

    offer.metrics.loyaltyStampsIssued += 1;

    let milestoneReached = false;
    let reward: Reward | undefined;

    // --- 7. TRIGGER 3: MILESTONE REACHED & REWARD ISSUED ---
    if (customer.visitCount >= target) {
      milestoneReached = true;
      const rewardId = `rew_loyalty_${generateSecureToken(8)}`;
      const voucherCode = generateVoucherCode('LOYAL');

      reward = {
        id: rewardId,
        businessId,
        customerId,
        customerName: customer.name,
        customerMobileMasked: maskMobile(customer.mobile),
        code: voucherCode,
        title: rewardTitle,
        type: 'loyalty',
        status: 'issued',
        claimedAt: nowIso,
      };

      this.db.saveReward(reward);

      // Reset active cycle stamps and clear cycleStartedAt for the next cycle
      customer.visitCount = 0;
      customer.cycleStartedAt = undefined;
      customer.totalRewardsClaimed = (customer.totalRewardsClaimed || 0) + 1;
      customer.activeVoucher = {
        rewardId,
        code: voucherCode,
        title: rewardTitle,
        type: 'loyalty',
        claimedAt: nowIso,
      };

      offer.metrics.loyaltyMilestonesClaimed += 1;
    }

    // Mark stamp claim as completed (status === 'COMPLETED')
    let claim = this.db.getPendingStampClaim(businessId, customerId);
    if (!claim) {
      claim = {
        id: `clm_${generateSecureToken(8)}`,
        businessId,
        customerId,
        sessionToken,
        status: 'COMPLETED',
        skipRedemptionPin: business.skipRedemptionPin ?? false,
        createdAt: nowIso,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
        completedAt: nowIso,
      };
    } else {
      claim.status = 'COMPLETED';
      claim.completedAt = nowIso;
      if (sessionToken) claim.sessionToken = sessionToken;
    }
    this.db.saveStampClaim(claim);

    this.db.saveCustomer(customer);
    this.db.saveOffer(offer);

    // Synchronously compute storewide dual ranks across all store customers
    this.computeStorewideDualRanks(businessId);
    const reloadedCustomer = this.db.getCustomerById(customerId) || customer;

    return {
      customer: reloadedCustomer,
      milestoneReached,
      reward,
    };
  }

  /**
   * Compute centralized, storewide dual-ranking (VIP Rank & Streaker Rank) across
   * all customers of a business in the database.
   *
   * 1. VIP Rank (Lifetime):
   *    - Sorted by lifetime totalVisits DESC.
   *    - Tiebreaker: activeOfferVisits (visitCount) DESC.
   *    - Secondary tiebreaker: earlier timestamp (lastVisitAt || updatedAt || createdAt) ASC.
   *    - Preserved even when an offer expires or changes.
   *
   * 2. Streaker Rank (Active Campaign):
   *    - If active offer is missing or expired/cancelled: everyone's streakerRank is null (Unranked).
   *    - If customer has 0 stamps on active campaign: streakerRank is null (never 0 or negative).
   *    - Customers with > 0 stamps sorted by activeOfferVisits DESC.
   *    - Tiebreaker: lifetime totalVisits DESC.
   *    - Secondary tiebreaker: earlier timestamp (cycleStartedAt || lastVisitAt || createdAt) ASC.
   *    - Absent leader with highest stamps stays Streaker #1 regardless of daily visits.
   */
  public computeStorewideDualRanks(businessId: string): Customer[] {
    const customers = this.db.getCustomersByBusinessId(businessId);
    if (customers.length === 0) return [];

    const offer = this.db.getActiveOfferByBusinessId(businessId);
    const isOfferActive = Boolean(offer && offer.status === 'active');

    // 1. VIP Rank (All-Time / Lifetime)
    const sortedVIP = [...customers].sort((a, b) => {
      const aLife = (a.lifetimeVisits ?? a.totalVisits) || 0;
      const bLife = (b.lifetimeVisits ?? b.totalVisits) || 0;
      if (bLife !== aLife) return bLife - aLife;

      const aActive = (a.activeOfferVisits ?? a.visitCount) || 0;
      const bActive = (b.activeOfferVisits ?? b.visitCount) || 0;
      if (bActive !== aActive) return bActive - aActive;

      // Earlier timestamp wins tiebreaker (who reached that stamp/visit count first)
      const aTime = new Date(a.lastVisitAt || a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.lastVisitAt || b.updatedAt || b.createdAt || 0).getTime();
      return aTime - bTime;
    });

    const vipRankMap = new Map<string, number>();
    sortedVIP.forEach((c, idx) => {
      vipRankMap.set(c.id, idx + 1);
    });

    // 2. Streaker Rank (Active Campaign / Consecutive Visits)
    const streakerRankMap = new Map<string, number>();
    const activeParticipants = customers.filter(c => {
      const streak = typeof c.currentStreak === 'number' && c.currentStreak > 0
        ? c.currentStreak
        : ((c.visitCount || c.activeOfferVisits || c.totalVisits || 0) > 0 ? 1 : 0);
      return streak > 0;
    });

    const sortedStreakers = [...activeParticipants].sort((a, b) => {
      const aStreak = typeof a.currentStreak === 'number' && a.currentStreak > 0
        ? a.currentStreak
        : ((a.visitCount || a.activeOfferVisits || a.totalVisits || 0) > 0 ? 1 : 0);
      const bStreak = typeof b.currentStreak === 'number' && b.currentStreak > 0
        ? b.currentStreak
        : ((b.visitCount || b.activeOfferVisits || b.totalVisits || 0) > 0 ? 1 : 0);
      if (bStreak !== aStreak) return bStreak - aStreak;

      const aLife = (a.lifetimeVisits ?? a.totalVisits) || 0;
      const bLife = (b.lifetimeVisits ?? b.totalVisits) || 0;
      if (bLife !== aLife) return bLife - aLife;

      // Earlier timestamp wins tiebreaker (who reached that streak/stamp count first)
      const aTime = new Date(a.cycleStartedAt || a.lastVisitAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.cycleStartedAt || b.lastVisitAt || b.createdAt || 0).getTime();
      return aTime - bTime;
    });

    sortedStreakers.forEach((c, idx) => {
      streakerRankMap.set(c.id, idx + 1);
    });

    // Persist and return updated customers
    const updated = customers.map(c => {
      const vipRank = vipRankMap.get(c.id) || sortedVIP.length || 1;
      const computedStreaker = streakerRankMap.get(c.id);
      const streakerRank = typeof computedStreaker === 'number' && computedStreaker > 0
        ? computedStreaker
        : (typeof c.streakerRank === 'number' && c.streakerRank > 0
            ? c.streakerRank
            : ((c.currentStreak || c.visitCount || 0) > 0 ? 1 : null));

      c.vipRank = vipRank;
      c.rank = vipRank;
      c.lifetimeRank = vipRank;
      c.streakerRank = streakerRank;
      c.activeOfferRank = streakerRank;
      c.lifetimeVisits = (c.lifetimeVisits ?? c.totalVisits) || 0;
      c.activeOfferVisits = (c.activeOfferVisits ?? c.visitCount) || 0;
      c.currentStreak = typeof c.currentStreak === 'number' ? c.currentStreak : ((c.visitCount > 0 || (c.totalVisits || 0) > 0) ? 1 : 0);
      c.longestStreak = Math.max(c.longestStreak || 0, c.currentStreak);

      this.db.saveCustomer(c);
      return c;
    });

    return updated;
  }

  /**
   * Get storewide Top VIP Rankers for Hall of Fame
   */
  public getTopRankers(businessId: string, limit = 5): any[] {
    const ranked = this.computeStorewideDualRanks(businessId);
    return ranked
      .sort((a, b) => (a.vipRank || 9999) - (b.vipRank || 9999))
      .slice(0, limit)
      .map(c => ({
        id: c.id,
        rank: c.vipRank || 1,
        vipRank: c.vipRank || 1,
        streakerRank: typeof c.streakerRank === 'number' && c.streakerRank > 0
          ? c.streakerRank
          : ((c.currentStreak || c.visitCount || 0) > 0 ? 1 : null),
        currentStreak: c.currentStreak ?? 0,
        longestStreak: c.longestStreak ?? c.currentStreak ?? 0,
        name: c.name || 'Loyal Guest',
        maskedMobile: maskMobile(c.mobile),
        totalVisits: c.totalVisits || 0,
        visitCount: c.visitCount || 0,
      }));
  }
}
