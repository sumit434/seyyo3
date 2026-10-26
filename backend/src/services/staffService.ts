import { MemoryDB } from '../db/MemoryDB';
import { generateSecureToken, verifyPassword, verifyPin, hashPin, extractConfiguredPin } from '../utils/crypto';
import { StaffSession } from '../../../shared/types/session';
import { Reward } from '../../../shared/types/reward';
import { STAFF_SESSION_TTL_MS } from '../../../shared/constants/limits';
import { UpdateStaffSettingsPayload, BusinessProfile } from '../../../shared/types/business';

export class StaffService {
  private db: MemoryDB;

  constructor() {
    this.db = MemoryDB.getInstance();
  }

  /**
   * Update staff terminal settings (e.g. 4-digit PIN, fast redemption toggle)
   */
  public updateSettings(
    businessId: string,
    payload: UpdateStaffSettingsPayload
  ): Partial<BusinessProfile> {
    const business = this.db.getBusinessById(businessId);
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND: Business does not exist');
    }

    if (payload.newStaffPin !== undefined && payload.newStaffPin !== null) {
      const pinStr = String(payload.newStaffPin).trim();
      if (!/^\d{4}$/.test(pinStr)) {
        throw new Error('INVALID_STAFF_PIN: Staff verification PIN must be exactly 4 digits');
      }
      business.staffPinHash = hashPin(pinStr);
    }

    if (payload.skipRedemptionPin !== undefined && payload.skipRedemptionPin !== null) {
      const isRushVal = Boolean(payload.skipRedemptionPin);
      business.skipRedemptionPin = isRushVal;
      business.skipStaffVerification = isRushVal;
    }

    if (payload.whatsappNumber !== undefined) {
      business.whatsappNumber = payload.whatsappNumber ? String(payload.whatsappNumber).trim() : undefined;
    }

    const nowIso = new Date().toISOString();
    business.updatedAt = nowIso;
    this.db.saveBusiness(business);

    return {
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
      configuredStaffPin: extractConfiguredPin(business.staffPinHash) || payload.newStaffPin || '••••',
      skipRedemptionPin: business.skipRedemptionPin ?? false,
      isRushMode: business.skipRedemptionPin ?? false,
      rushModeEnabled: business.skipRedemptionPin ?? false,
      skipStaffVerification: business.skipRedemptionPin ?? false,
      whatsappNumber: business.whatsappNumber,
    };
  }

  private failedAttempts: Map<string, { count: number; lockedUntil?: number }> = new Map();

  /**
   * Authenticate staff member by business email/slug and password or PIN
   */
  public login(identifier: string, passwordOrPin: string): { session: StaffSession; businessName: string } {
    let business = this.db.getBusinessByEmail(identifier);
    if (!business) {
      business = this.db.getBusinessBySlug(identifier);
    }

    if (!business) {
      throw new Error('INVALID_CREDENTIALS: Business account not found');
    }

    const now = Date.now();
    const attempts = this.failedAttempts.get(identifier);
    if (attempts && attempts.lockedUntil && attempts.lockedUntil > now) {
      const waitSec = Math.ceil((attempts.lockedUntil - now) / 1000);
      throw new Error(`LOCKED_OUT: Too many failed attempts. Account temporarily locked for ${waitSec}s`);
    }

    const isPassValid = verifyPassword(passwordOrPin, business.passwordHash);
    const isPinValid = verifyPin(passwordOrPin, business.staffPinHash);
    if (!isPassValid && !isPinValid) {
      const current = this.failedAttempts.get(identifier) || { count: 0 };
      current.count += 1;
      if (current.count >= 5) {
        current.lockedUntil = now + 5 * 60 * 1000;
        this.failedAttempts.set(identifier, current);
        throw new Error('LOCKED_OUT: Too many failed attempts. Account temporarily locked for 5 minutes');
      }
      this.failedAttempts.set(identifier, current);
      throw new Error('INVALID_CREDENTIALS: Incorrect staff password or PIN');
    }

    this.failedAttempts.delete(identifier);

    const sessionId = generateSecureToken(32);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + STAFF_SESSION_TTL_MS).toISOString();

    const session: StaffSession = {
      sessionId,
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      tier: business.tier,
      createdAt: nowIso,
      expiresAt,
    };

    this.db.saveStaffSession(session);

    return {
      session,
      businessName: business.name,
    };
  }

  /**
   * Validate staff session token
   */
  public validateSession(sessionId: string): StaffSession {
    const session = this.db.getStaffSession(sessionId);
    if (!session) {
      throw new Error('UNAUTHORIZED: Staff session expired or invalid');
    }
    return session;
  }

  /**
   * Redeem customer reward voucher using 4-digit staff PIN or glance mode
   */
  public redeemVoucher(
    businessId: string,
    voucherCode: string,
    staffPin?: string
  ): { reward: Reward; customerName: string } {
    const business = this.db.getBusinessById(businessId);
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND');
    }

    // Verify 4-digit PIN if fast glance mode is NOT enabled
    const isGlanceMode = Boolean(business.skipRedemptionPin);
    if (!isGlanceMode) {
      const cleanPin = staffPin ? String(staffPin).trim() : '';
      if (!cleanPin) {
        throw new Error('INVALID_STAFF_PIN: 4-digit staff verification PIN is required');
      }
      const attemptsKey = `pin_${businessId}`;
      const now = Date.now();
      const attempts = this.failedAttempts.get(attemptsKey);
      if (attempts && attempts.lockedUntil && attempts.lockedUntil > now) {
        const waitSec = Math.ceil((attempts.lockedUntil - now) / 1000);
        throw new Error(`LOCKED_OUT: Too many failed PIN attempts. Locked for ${waitSec}s`);
      }

      const isPinValid = verifyPin(cleanPin, business.staffPinHash);
      if (!isPinValid) {
        const current = this.failedAttempts.get(attemptsKey) || { count: 0 };
        current.count += 1;
        if (current.count >= 5) {
          current.lockedUntil = now + 5 * 60 * 1000;
          this.failedAttempts.set(attemptsKey, current);
          throw new Error('LOCKED_OUT: Too many failed PIN attempts. Locked for 5 minutes');
        }
        this.failedAttempts.set(attemptsKey, current);
        throw new Error('INVALID_STAFF_PIN: The 4-digit staff verification PIN is incorrect');
      }
      this.failedAttempts.delete(attemptsKey);
    }

    // Find reward by code and businessId
    const reward = this.db.getRewardByCodeAndBusiness(voucherCode, businessId);
    if (!reward) {
      throw new Error('VOUCHER_NOT_FOUND: Voucher code not found for this business');
    }

    if (reward.status === 'redeemed') {
      throw new Error('REWARD_ALREADY_REDEEMED: This reward has already been redeemed');
    }

    // Mark redeemed
    const nowIso = new Date().toISOString();
    reward.status = 'redeemed';
    reward.redeemedAt = nowIso;
    reward.staffPinVerifiedBy = isGlanceMode
      ? `Staff Terminal Glance Mode (${business.name})`
      : `Staff Terminal (${business.name})`;
    this.db.saveReward(reward);

    // Clear activeVoucher on customer if it matches this reward
    const customer = this.db.getCustomerById(reward.customerId);
    if (customer && customer.activeVoucher?.rewardId === reward.id) {
      customer.activeVoucher = undefined;
      customer.updatedAt = nowIso;
      this.db.saveCustomer(customer);
    }

    // Update offer metrics
    const offer = this.db.getActiveOfferByBusinessId(businessId);
    if (offer) {
      offer.metrics.rewardsRedeemed += 1;
      this.db.saveOffer(offer);
    }

    return {
      reward,
      customerName: reward.customerName || 'Valued Customer',
    };
  }

  /**
   * Delete/deactivate active offer for a business while preserving history
   */
  public deleteActiveOffer(businessId: string): { success: boolean; offer: any } {
    const offer = this.db.getActiveOfferByBusinessId(businessId);
    if (!offer) {
      throw new Error('OFFER_NOT_FOUND: No active offer found to delete');
    }

    const nowIso = new Date().toISOString();
    offer.status = 'cancelled';
    offer.cancelledAt = nowIso;
    this.db.saveOffer(offer);

    return {
      success: true,
      offer,
    };
  }

  /**
   * Create and activate a fresh offer for the business tailored to its tier plan
   */
  public createAndActivateOffer(
    businessId: string,
    offerData: {
      title: string;
      description?: string;
      spinWheelConfiguration?: any[];
      loyaltyTarget?: number;
      loyaltyValidationDays?: number;
      loyaltyReward?: string;
      googleReviewUrl?: string;
    }
  ): any {
    const business = this.db.getBusinessById(businessId);
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND: Business does not exist');
    }

    // Ensure no other active offer is currently running
    const existingActive = this.db.getActiveOfferByBusinessId(businessId);
    if (existingActive) {
      throw new Error('ACTIVE_OFFER_EXISTS: An offer is already active. Please delete or complete it before activating a new one.');
    }

    const nowIso = new Date().toISOString();
    const offerId = `off_${generateSecureToken(8)}`;

    const newOffer = {
      id: offerId,
      businessId,
      title: offerData.title.trim(),
      description: (offerData.description || `Official ${business.tier.toUpperCase()} experience for ${business.name}`).trim(),
      tier: business.tier,
      status: 'active' as const,
      createdAt: nowIso,
      activatedAt: nowIso,
      durationDays: 365,
      spinWheelConfiguration: offerData.spinWheelConfiguration || business.spinWheelConfiguration,
      loyaltyTarget: offerData.loyaltyTarget || business.loyaltyTarget,
      loyaltyValidationDays: offerData.loyaltyValidationDays || business.loyaltyValidationDays,
      loyaltyReward: offerData.loyaltyReward || business.loyaltyReward,
      googleReviewUrl: offerData.googleReviewUrl || business.googleReviewUrl,
      metrics: {
        scans: 0,
        identifiedGuests: 0,
        rewardsIssued: 0,
        rewardsRedeemed: 0,
        reviewsPrompted: 0,
        reviewsPersisted: 0,
        loyaltyStampsIssued: 0,
        loyaltyMilestonesClaimed: 0,
      },
    };

    // Save offer
    this.db.saveOffer(newOffer);

    // Sync business default configs if updated
    if (newOffer.spinWheelConfiguration) business.spinWheelConfiguration = newOffer.spinWheelConfiguration;
    if (newOffer.loyaltyTarget) business.loyaltyTarget = newOffer.loyaltyTarget;
    if (newOffer.loyaltyValidationDays) business.loyaltyValidationDays = newOffer.loyaltyValidationDays;
    if (newOffer.loyaltyReward) business.loyaltyReward = newOffer.loyaltyReward;
    if (newOffer.googleReviewUrl) business.googleReviewUrl = newOffer.googleReviewUrl;
    business.updatedAt = nowIso;
    this.db.saveBusiness(business);

    return newOffer;
  }

  /**
   * Get all historical offers for a business (scoped strictly by businessId)
   */
  public getOfferHistory(businessId: string) {
    const offers = this.db.getOffersByBusinessId(businessId);
    // Sort newest first
    return offers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
