import { MemoryDB } from '../db/MemoryDB';
import { generateSecureToken } from '../utils/crypto';
import { CustomerSession, CustomerJourneyStage, MerchantEntry } from '../../../shared/types/qr';
import { Business } from '../../../shared/types/business';
import { Offer } from '../../../shared/types/offer';
import { CUSTOMER_SESSION_TTL_MS, QR_SESSION_KEY_TTL_MS, NFC_SESSION_KEY_TTL_MS } from '../../../shared/constants/limits';
import { normalizeCanonicalPhone } from '../../../shared/validation/phoneValidation';

export class CustomerSessionService {
  private db: MemoryDB;

  constructor() {
    this.db = MemoryDB.getInstance();
  }

  /**
   * Resolve a merchant entry by slug or permanent entry code
   */
  public resolveMerchant(identifier: string): {
    business: Business;
    offer: Offer | null;
    entry: MerchantEntry | null;
    isActive: boolean;
  } {
    let business = this.db.getBusinessBySlug(identifier);
    let entry: MerchantEntry | null = null;

    if (!business) {
      // Try resolving by permanent code
      const foundEntry = this.db.getMerchantEntryByPermanentCode(identifier);
      if (foundEntry) {
        entry = foundEntry;
        business = this.db.getBusinessById(foundEntry.businessId);
      }
    } else {
      const entries = this.db.getMerchantEntriesByBusinessId(business.id);
      entry = entries.length > 0 ? entries[0] : null;
    }

    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND: Business could not be located');
    }

    const offer = this.db.getActiveOfferByBusinessId(business.id) || null;
    const isActive = !!offer && offer.status === 'active';

    if (offer && isActive) {
      // Record scan metric
      offer.metrics.scans += 1;
      this.db.saveOffer(offer);
    }

    return {
      business,
      offer,
      entry,
      isActive,
    };
  }

  /**
   * Create or validate a customer session with unique short-lived session key
   * NFC sessions expire in 3 minutes. QR sessions expire in 6 minutes.
   */
  public createSession(
    businessId: string,
    offerId: string,
    authType: 'qr' | 'nfc',
    customerId?: string,
    sessionKey?: string,
    entryType: 'combined' | 'loyalty' | string = 'combined'
  ): CustomerSession {
    const sessionToken = generateSecureToken(32);
    const actualSessionKey = sessionKey || `sk_${generateSecureToken(16)}`;
    const nowIso = new Date().toISOString();
    const ttlMs = authType === 'nfc' ? NFC_SESSION_KEY_TTL_MS : QR_SESSION_KEY_TTL_MS;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const sessionId = `cs_${generateSecureToken(8)}`;

    const business = this.db.getBusinessById(businessId);
    const isLoyaltyTier =
      business?.tier === 'loyalty' ||
      entryType === 'loyalty' ||
      entryType === 'instant_loyalty' ||
      entryType === 'loyalty_express';
    const effectiveEntryType = isLoyaltyTier ? (entryType === 'loyalty_express' ? 'loyalty_express' : 'loyalty') : entryType;

    const initialStage: CustomerJourneyStage = customerId
      ? (isLoyaltyTier ? 'loyalty' : 'spin')
      : 'auth';

    const session: CustomerSession = {
      id: sessionId,
      sessionId,
      sessionToken,
      sessionKey: actualSessionKey,
      businessId,
      offerId,
      customerId,
      authType,
      source: authType,
      entryType: effectiveEntryType,
      qrKey: actualSessionKey,
      currentStage: initialStage,
      status: 'unused',
      isUsed: false,
      hasClaimedSpin: isLoyaltyTier ? true : false,
      hasClaimedLoyalty: false,
      createdAt: nowIso,
      expiresAt,
    };
    (session as any).sessionType = effectiveEntryType;
    (session as any).type = effectiveEntryType;

    this.db.saveCustomerSession(session);
    return session;
  }

  /**
   * Create a fresh 3-minute NFC tap session
   */
  public createNfcSession(
    businessId: string,
    offerId: string,
    entryType: 'combined' | 'loyalty' | string = 'combined'
  ): CustomerSession {
    return this.createSession(businessId, offerId, 'nfc', undefined, undefined, entryType);
  }

  /**
   * Symmetrically validate customer session.
   * Rejects with 403 'Token already used or expired' if:
   * - Session token TTL has expired
   * - Session is already consumed (isUsed = true / status = 'completed')
   * - Session is accessed with a mismatched mobile number
   */
  public validateSession(
    tokenOrKey: string,
    incomingMobile?: string,
    customerId?: string
  ): CustomerSession {
    const session = this.db.getCustomerSession(tokenOrKey);
    if (!session) {
      const error: any = new Error('Token already used or expired');
      error.status = 403;
      error.code = 'SESSION_EXPIRED';
      throw error;
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      const error: any = new Error('Token already used or expired');
      error.status = 403;
      error.code = 'SESSION_EXPIRED';
      throw error;
    }

    // Terminal lockout: strictly reject if marked completed or burned (isUsed = true after cooldown)
    if (session.status === 'completed' || session.completedAt || (session.isUsed && (session as any).completed) || (session.isUsed && session.status !== 'used')) {
      const error: any = new Error('Token already used or expired');
      error.status = 403;
      error.code = 'SESSION_ALREADY_USED';
      throw error;
    }

    // Standalone and Express Loyalty sessions bypass Spin checks
    const business = this.db.getBusinessById(session.businessId);
    if (
      business?.tier === 'loyalty' ||
      session.entryType === 'loyalty' ||
      session.entryType === 'loyalty_express' ||
      (session as any).sessionType === 'loyalty' ||
      (session as any).type === 'loyalty'
    ) {
      if (session.entryType !== 'loyalty_express') {
        session.entryType = 'loyalty';
        (session as any).sessionType = 'loyalty';
        (session as any).type = 'loyalty';
      }
      session.hasClaimedSpin = true;
      (session as any).spinClaimed = true;
      if (session.currentStage === 'auth' || session.currentStage === 'spin') {
        session.currentStage = 'loyalty';
      }
    }

    // Verify canonical mobile match symmetrically
    const boundMobile = (session as any).usedBy || session.customerNumber;
    if (incomingMobile && boundMobile) {
      const normBound = normalizeCanonicalPhone(boundMobile);
      const normIncoming = normalizeCanonicalPhone(incomingMobile);
      if (normBound && normIncoming && normBound !== normIncoming) {
        const error: any = new Error('Token already used or expired');
        error.status = 403;
        error.code = 'SESSION_ALREADY_USED';
        throw error;
      }
    }

    // Verify customerId match if present
    if (customerId && session.customerId && String(session.customerId) !== String(customerId)) {
      const error: any = new Error('Token already used or expired');
      error.status = 403;
      error.code = 'SESSION_ALREADY_USED';
      throw error;
    }

    return session;
  }

  /**
   * Bind session key to canonical normalized mobile upon submission.
   * Keeps isUsed = false so in-flight check allows the customer to continue without prematurely burning the session.
   */
  public bindSessionMobile(
    tokenOrKey: string,
    mobile: string,
    customerId?: string
  ): CustomerSession {
    const session = this.validateSession(tokenOrKey);
    const normalizedMobile = normalizeCanonicalPhone(mobile);

    const existingBound = (session as any).usedBy || session.customerNumber;
    if (existingBound) {
      const normExisting = normalizeCanonicalPhone(existingBound);
      if (normExisting && normExisting !== normalizedMobile) {
        const error: any = new Error('Token already used or expired');
        error.status = 403;
        error.code = 'SESSION_ALREADY_USED';
        throw error;
      }
    }

    session.customerNumber = normalizedMobile;
    (session as any).usedBy = normalizedMobile;
    if (customerId) {
      session.customerId = customerId;
    }
    session.status = 'used';
    // In-flight active flow: NOT burned yet!
    session.isUsed = false;
    session.usedAt = session.usedAt || new Date().toISOString();

    const business = this.db.getBusinessById(session.businessId);
    if (
      business?.tier === 'loyalty' ||
      session.entryType === 'loyalty' ||
      (session as any).sessionType === 'loyalty' ||
      (session as any).type === 'loyalty'
    ) {
      session.entryType = 'loyalty';
      (session as any).sessionType = 'loyalty';
      (session as any).type = 'loyalty';
      session.hasClaimedSpin = true;
      (session as any).spinClaimed = true;
      if (session.currentStage === 'auth' || session.currentStage === 'spin') {
        session.currentStage = 'loyalty';
      }
    }

    this.db.saveCustomerSession(session);
    return session;
  }

  /**
    * Track active stage completion server-side so in-flight checks allow the customer
   * to continue smoothly without prematurely burning the session.
   */
  public updateSessionStage(
    tokenOrKey: string,
    stage: CustomerJourneyStage | 'completed',
    flags?: { hasClaimedSpin?: boolean; hasClaimedLoyalty?: boolean }
  ): CustomerSession {
    const session = this.validateSession(tokenOrKey);
    const targetStage: CustomerJourneyStage = stage === 'completed' ? 'cooldown' : stage;
    session.currentStage = targetStage;
    if (flags?.hasClaimedSpin !== undefined) {
      session.hasClaimedSpin = flags.hasClaimedSpin;
    }
    if (flags?.hasClaimedLoyalty !== undefined) {
      session.hasClaimedLoyalty = flags.hasClaimedLoyalty;
    }

    const business = this.db.getBusinessById(session.businessId);
    if (
      business?.tier === 'loyalty' ||
      session.entryType === 'loyalty' ||
      (session as any).sessionType === 'loyalty' ||
      (session as any).type === 'loyalty'
    ) {
      // Standalone loyalty progresses directly without requiring spin
      session.entryType = 'loyalty';
      (session as any).sessionType = 'loyalty';
      (session as any).type = 'loyalty';
      session.hasClaimedSpin = true;
      (session as any).spinClaimed = true;
    }

    this.db.saveCustomerSession(session);
    return session;
  }

  /**
   * Handle the stage skip event without throwing validation errors when advancing past a voucher in single-tier sessions.
   */
  public handleStageSkip(
    tokenOrKey: string,
    tier?: string
  ): CustomerSession {
    const session = this.validateSession(tokenOrKey);
    const business = this.db.getBusinessById(session.businessId);
    const effectiveTier = tier || business?.tier;

    if (effectiveTier === 'spin' || effectiveTier === 'loyalty') {
      const customer = session.customerId ? this.db.getCustomerById(session.customerId) : null;
      const hasEverEnteredReview = customer ? Boolean(
        customer.hasEnteredReviewFlow ||
        customer.reviewAcceleratorEntryId ||
        customer.reviewJourneyCompleted
      ) : false;

      session.currentStage = hasEverEnteredReview ? 'cooldown' : 'review';
      session.status = 'used';
      // In-flight active flow without premature validation lockout
      session.isUsed = false;
    } else {
      // Combined tier progression
      if (session.currentStage === 'spin' || session.currentStage === 'voucher') {
        session.currentStage = 'loyalty';
      } else if (session.currentStage === 'loyalty' || session.currentStage === 'loyalty_reward') {
        const customer = session.customerId ? this.db.getCustomerById(session.customerId) : null;
        const hasEverEnteredReview = customer ? Boolean(
          customer.hasEnteredReviewFlow ||
          customer.reviewAcceleratorEntryId ||
          customer.reviewJourneyCompleted
        ) : false;
        session.currentStage = hasEverEnteredReview ? 'cooldown' : 'review';
      } else {
        session.currentStage = 'cooldown';
      }
    }

    this.db.saveCustomerSession(session);
    return session;
  }

  /**
   * Synchronously burn session key as soon as customer reaches terminal cooldown.
   * Permanently marks isUsed = true and status = 'completed'.
   */
  public burnSession(tokenOrKey: string): void {
    const session = this.db.getCustomerSession(tokenOrKey);
    if (session) {
      session.isUsed = true;
      session.status = 'completed';
      (session as any).completed = true;
      (session as any).isBurned = true;
      session.completedAt = new Date().toISOString();
      this.db.saveCustomerSession(session);
    }
  }

  /**
   * Alias for burnSession
   */
  public markSessionConsumed(tokenOrKey: string): void {
    this.burnSession(tokenOrKey);
  }
}

