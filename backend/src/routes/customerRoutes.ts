import { Router, Request, Response } from 'express';
import { MemoryDB } from '../db/MemoryDB';
import { CustomerStatusService } from '../services/customerStatusService';
import { CustomerSessionService } from '../services/customerSessionService';
import { SpinService } from '../services/spinService';
import { LoyaltyService } from '../services/loyaltyService';
import { ReviewService } from '../services/reviewService';
import { StaffService } from '../services/staffService';
import { maskMobile, generateSecureToken, verifyPin } from '../utils/crypto';
import { isSameMerchantDay } from '../utils/timezone';
import { normalizeCanonicalPhone } from '../../../shared/validation/phoneValidation';
import { TOP_RANKERS_LIMIT } from '../../../shared/constants/limits';

const router = Router();
const db = MemoryDB.getInstance();
const statusService = new CustomerStatusService();
const sessionService = new CustomerSessionService();
const spinService = new SpinService();
const loyaltyService = new LoyaltyService();
const reviewService = new ReviewService();
const staffService = new StaffService();

// Helper to resolve customer from session token or query
function getCustomerFromReq(req: Request) {
  const sessionToken = req.headers['x-customer-session'] as string;
  if (sessionToken) {
    const session = db.getCustomerSession(sessionToken);
    if (session && session.customerId) {
      return db.getCustomerById(session.customerId);
    }
  }
  const custId = req.headers['x-customer-id'] as string || req.body?.customerId;
  if (custId) {
    return db.getCustomerById(custId);
  }
  return undefined;
}

function getEntryTypeFromReq(req: Request): string | undefined {
  const sessionToken = req.headers['x-customer-session'] as string;
  if (sessionToken) {
    const session = db.getCustomerSession(sessionToken);
    if (session?.entryType) return session.entryType;
  }
  return (req.query.entryType as string) || (req.headers['x-entry-type'] as string) || req.body?.entryType;
}

function getAndValidateCustomerSession(req: Request, customerId?: string) {
  const sessionToken = (req.headers['x-customer-session'] as string) || req.body?.sessionToken;
  if (!sessionToken) return undefined;

  let customerMobile: string | undefined;
  if (customerId) {
    const customer = db.getCustomerById(customerId);
    if (customer) {
      customerMobile = customer.mobile;
    }
  }

  return sessionService.validateSession(sessionToken, customerMobile, customerId);
}

function isPhysicalCombinedFlow(session: ReturnType<typeof db.getCustomerSession>, businessTier?: string): boolean {
  if (!session) return false;
  // If merchant tier is standalone loyalty, it is NEVER combined
  if (businessTier === 'loyalty') return false;
  // If session is standalone or express loyalty, it is NEVER combined
  if (
    session.entryType === 'loyalty' ||
    session.entryType === 'loyalty_express' ||
    (session as any).sessionType === 'loyalty' ||
    (session as any).type === 'loyalty' ||
    session.entryType === 'instant_loyalty'
  ) {
    return false;
  }
  // If merchant tier is spin, it is NEVER combined
  if (businessTier === 'spin') return false;
  // Only combined tier can be physical combined
  if (businessTier === 'combined') return true;
  if (session.entryType === 'combined') return true;
  return false;
}

// Lookup customer by phone for autofill & visit history retrieval
router.get('/lookup', (req: Request, res: Response) => {
  try {
    const phone = (req.query.phone || req.query.mobile) as string | undefined;
    const businessId = (req.query.businessId || req.headers['x-business-id']) as string | undefined;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number parameter is required' });
    }

    const cleanRaw = String(phone).trim();
    const canonical = normalizeCanonicalPhone(cleanRaw);
    const digitsOnly = cleanRaw.replace(/\D/g, '');

    // Search across database
    let foundCustomer: any = undefined;

    if (businessId) {
      // Priority 1: Check specifically within the requested business
      foundCustomer =
        db.getCustomerByBusinessAndMobile(businessId, canonical) ||
        db.getCustomerByBusinessAndMobile(businessId, cleanRaw) ||
        db.getCustomerByBusinessAndMobile(businessId, digitsOnly);

      if (!foundCustomer) {
        const busCustomers = db.getCustomersByBusinessId(businessId);
        foundCustomer = busCustomers.find(c => {
          const cDigits = (c.mobile || '').replace(/\D/g, '');
          return (
            c.mobile === canonical ||
            c.mobile === cleanRaw ||
            (digitsOnly.length >= 10 && cDigits.endsWith(digitsOnly.slice(-10)))
          );
        });
      }
    }

    // Priority 2: Check across all businesses for customer profile name/history autofill
    if (!foundCustomer) {
      const allCustomers = Array.from((db as any).customers.values()) as any[];
      foundCustomer = allCustomers.find((c: any) => {
        const cDigits = (c.mobile || '').replace(/\D/g, '');
        return (
          c.mobile === canonical ||
          c.mobile === cleanRaw ||
          (digitsOnly.length >= 10 && cDigits.endsWith(digitsOnly.slice(-10)))
        );
      });
    }

    if (!foundCustomer) {
      return res.json({
        success: true,
        found: false,
      });
    }

    return res.json({
      success: true,
      found: true,
      customer: {
        id: foundCustomer.id,
        name: foundCustomer.name,
        mobile: foundCustomer.mobile,
        visitCount: foundCustomer.visitCount || 0,
        totalVisits: foundCustomer.totalVisits || foundCustomer.visitCount || 0,
        lifetimeRank: foundCustomer.lifetimeRank || foundCustomer.vipRank || 1,
        vipRank: foundCustomer.vipRank || foundCustomer.lifetimeRank || 1,
        currentStamps: foundCustomer.currentStamps || 0,
        lastVisitAt: foundCustomer.lastVisitAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Lookup failed' });
  }
});

// Get customer status for a business
router.get(['/status', '/status/:slug'], (req: Request, res: Response, next) => {
  try {
    const slug = req.params.slug || (req.query.slug as string) || (req.query.businessSlug as string);
    let business = slug ? db.getBusinessBySlug(slug) : undefined;
    if (!business && (req.query.businessId || req.headers['x-business-id'])) {
      business = db.getBusinessById((req.query.businessId || req.headers['x-business-id']) as string);
    }
    if (!business) {
      const sessionToken = (req.headers['x-customer-session'] as string) || (req.query.sessionToken as string) || (req.query.sk as string);
      if (sessionToken) {
        const session = db.getCustomerSession(sessionToken);
        if (session) business = db.getBusinessById(session.businessId);
      }
    }
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const offer = db.getActiveOfferByBusinessId(business.id) || null;
    const customer = getCustomerFromReq(req) || null;
    const entryType = getEntryTypeFromReq(req);

    const now = new Date();
    const tz = business.timezone || 'UTC';
    const isCombinedTier = business.tier === 'combined';
    const hasSpunToday = customer?.lastSpinAt ? isSameMerchantDay(customer.lastSpinAt, now, tz) : false;
    const hasStampedToday = customer?.lastVisitAt ? isSameMerchantDay(customer.lastVisitAt, now, tz) : false;

    // Validate active session if token/key provided
    const sessionToken =
      (req.headers['x-customer-session'] as string) ||
      (req.query.sessionToken as string) ||
      (req.query.sk as string);

    let session;
    if (sessionToken) {
      try {
        session = sessionService.validateSession(sessionToken, customer?.mobile, customer?.id);
      } catch (sessErr: any) {
        // If session validation failed due to expired or already used session:
        // On Combined Tier: If the user has already spun today (hasSpunToday: true),
        // DO NOT throw a 403 error if they have not yet stamped today (hasStampedToday: false)!
        if (isCombinedTier && hasSpunToday && !hasStampedToday) {
          loyaltyService.checkAndCleanPendingClaims(business.id, customer?.id || '');
          session = undefined;
        } else {
          throw sessErr;
        }
      }
    }

    if (customer) {
      // Auto-expire incomplete/pending claims older than 15 min or when merchant settings changed
      loyaltyService.checkAndCleanPendingClaims(business.id, customer.id);
      // Recompute real-time dual ranks before returning customer payload
      loyaltyService.computeStorewideDualRanks(business.id);
      const freshCustomer = db.getCustomerById(customer.id);
      if (freshCustomer) {
        Object.assign(customer, freshCustomer);
      }
    }

    const payload = statusService.formatStatusResponse(business, offer, customer, entryType);

    // COMBINED TIER ROUTING ADJUSTMENT:
    // If merchant tier is COMBINED and user already spun today, DO NOT throw 403 or lock cooldown
    // if they have not yet stamped today. Return 200 OK indicating next step is LOYALTY!
    if (isCombinedTier && customer) {
      if (hasSpunToday && !hasStampedToday) {
        payload.status.isCooldown = false;
        payload.status.cooldownMessage = undefined;
        payload.status.spinAvailable = false;
        payload.status.spinCompletedToday = true;
        payload.status.loyaltyAvailable = true;
        payload.status.loyaltyCompletedToday = false;
        if (payload.status.currentStage === 'cooldown' || payload.status.currentStage === 'spin') {
          payload.status.currentStage = 'loyalty';
        }
      }
    }

    const canSpin = isCombinedTier ? !hasSpunToday : payload.status.spinAvailable;
    const canStamp = isCombinedTier ? !hasStampedToday : payload.status.loyaltyAvailable;
    const nextStep = isCombinedTier
      ? (hasSpunToday && !hasStampedToday ? 'LOYALTY' : (hasSpunToday && hasStampedToday ? 'COOLDOWN' : 'SPIN'))
      : (payload.status.currentStage === 'cooldown' ? 'COOLDOWN' : undefined);

    (payload as any).canSpin = canSpin;
    (payload as any).canStamp = canStamp;
    (payload as any).nextStep = nextStep;
    (payload.status as any).canSpin = canSpin;
    (payload.status as any).canStamp = canStamp;
    (payload.status as any).nextStep = nextStep;

    // When customer hits cooldown:
    // Only burn the session key if BOTH spin and stamp (or terminal cooldown) are completed!
    if (payload.status.isCooldown || payload.status.currentStage === 'cooldown') {
      if (session) {
        sessionService.burnSession(session.sessionToken);
      } else if (sessionToken) {
        sessionService.burnSession(sessionToken);
      }
    }

    if (payload.customer && customer) {
      (payload.customer as any).activeOfferId = customer.activeOfferId;
      (payload.customer as any).cycleStartedAt = customer.cycleStartedAt;
    }

    res.json({
      success: true,
      ...payload,
    });
  } catch (err) {
    next(err);
  }
});

// Spin wheel execution
router.post('/spin', (req: Request, res: Response, next) => {
  try {
    const { businessId, customerId } = req.body;
    const session = getAndValidateCustomerSession(req, customerId);

    // Prevent second spin on the same session
    if (session?.hasClaimedSpin) {
      const error: any = new Error('Token already used or expired');
      error.status = 403;
      error.code = 'SESSION_ALREADY_USED';
      throw error;
    }

    // Express Loyalty NFC does not permit Spin
    if (session?.entryType === 'loyalty') {
      const error: any = new Error('Token already used or expired');
      error.status = 403;
      error.code = 'SESSION_ALREADY_USED';
      throw error;
    }

    const business = db.getBusinessById(businessId);
    const offer = db.getActiveOfferByBusinessId(businessId);
    const customer = db.getCustomerById(customerId);
    const entryType = getEntryTypeFromReq(req);

    const result = spinService.executeSpin(businessId, customerId);

    if (session) {
      session.hasClaimedSpin = true;
      db.saveCustomerSession(session);
    }

    const statusPayload = statusService.formatStatusResponse(business!, offer || null, customer!, entryType);

    // Only burn if terminal cooldown was hit; never burn mid-flow (e.g. Combined moving to loyalty)
    if (statusPayload.status.isCooldown || statusPayload.status.currentStage === 'cooldown') {
      if (session) {
        sessionService.burnSession(session.sessionToken);
      }
    }

    res.json({
      success: true,
      reward: result.reward,
      sliceIndex: result.sliceIndex,
      slice: result.slice,
      ...statusPayload,
    });
  } catch (err) {
    next(err);
  }
});

// Loyalty stamp visit
router.post(['/loyalty/stamp', '/stamp', '/loyalty/claim', '/visit', '/loyalty/visit'], (req: Request, res: Response, next) => {
  try {
    const { businessId, customerId, staffPin, requirePin, entryMode, isRushMode } = req.body;
    const session = getAndValidateCustomerSession(req, customerId);

    // Prevent second loyalty claim on the same session
    if (session?.hasClaimedLoyalty || (session as any)?.loyaltyClaimed) {
      const error: any = new Error('Token already used or expired');
      error.status = 403;
      error.code = 'SESSION_ALREADY_USED';
      throw error;
    }

    // Preserve merchant lookup & ID typing consistently
    let business = db.getBusinessById(businessId) || db.getBusinessBySlug(businessId);
    if (!business && session?.businessId) {
      business = db.getBusinessById(session.businessId) || db.getBusinessBySlug(session.businessId);
    }
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    // Staff verification and PIN gates are completely removed from loyalty stamping.
    // Any valid visit (QR or NFC) stamps immediately, subject only to daily visit cooldown.

    if (session && session.businessId) {
      const sessBiz = String(session.businessId);
      const curBizId = String(business.id);
      const curBizSlug = String(business.slug);
      if (sessBiz !== curBizId && sessBiz !== curBizSlug) {
        const error: any = new Error('Token already used or expired');
        error.status = 403;
        error.code = 'SESSION_ALREADY_USED';
        throw error;
      }
    }

    // Standalone and Express Loyalty sessions bypass Spin checks completely
    const isLoyaltyTier =
      business.tier === 'loyalty' ||
      session?.entryType === 'loyalty' ||
      session?.entryType === 'loyalty_express' ||
      (session as any)?.sessionType === 'loyalty' ||
      (session as any)?.type === 'loyalty' ||
      session?.entryType === 'instant_loyalty';

    // Resolve customer early so daily spin status can be verified
    let customer = db.getCustomerById(customerId);
    if (!customer && session?.customerId) {
      customer = db.getCustomerById(session.customerId);
    }
    const customerMobile = customer?.mobile || session?.customerNumber || (session as any)?.usedBy || '';
    if (!customer && customerMobile) {
      customer = db.getCustomerByBusinessAndMobile(business.id, customerMobile);
    }

    if (isLoyaltyTier) {
      if (session) {
        if (session.entryType !== 'loyalty_express') {
          session.entryType = 'loyalty';
          (session as any).sessionType = 'loyalty';
          (session as any).type = 'loyalty';
        }
        session.hasClaimedSpin = true;
        (session as any).spinClaimed = true;
      }
    } else {
      const isCombined = isPhysicalCombinedFlow(session, business?.tier);
      if (isCombined && business.tier === 'combined') {
        const stampNow = new Date();
        const stampTz = business.timezone || 'UTC';
        const hasSpunToday = customer?.lastSpinAt ? isSameMerchantDay(customer.lastSpinAt, stampNow, stampTz) : false;
        const hasCompletedSpin =
          session?.hasClaimedSpin ||
          (session as any)?.spinClaimed ||
          hasSpunToday ||
          (Array.isArray((session as any)?.actionsCompleted) && (session as any).actionsCompleted.includes('spin'));

        if (!hasCompletedSpin) {
          const error: any = new Error('Token already used or expired');
          error.status = 403;
          error.code = 'SESSION_ALREADY_USED';
          throw error;
        }
      }
    }

    const nowIso = new Date().toISOString();

    // Ensure active offer exists so missing optional properties don't fall through to error
    let offer = db.getActiveOfferByBusinessId(business.id);
    if (!offer) {
      offer = {
        id: `off_${business.id}_loyalty`,
        businessId: business.id,
        title: `${business.name} Loyalty Program`,
        description: 'Collect stamps and earn rewards!',
        tier: business.tier || 'loyalty',
        status: 'active',
        loyaltyTarget: business.loyaltyTarget || 6,
        loyaltyValidationDays: business.loyaltyValidationDays || 60,
        loyaltyReward: business.loyaltyReward || 'Special Gift',
        createdAt: nowIso,
        activatedAt: nowIso,
        durationDays: 365,
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
      db.saveOffer(offer);
    }

    if (!customer) {
      customer = {
        id: customerId || session?.customerId || `cust_${generateSecureToken(8)}`,
        businessId: business.id,
        mobile: customerMobile,
        name: 'Guest',
        visitCount: 0,
        totalVisits: 0,
        activeOfferId: offer.id,
        cycleStartedAt: undefined, // Will be set on the first stamp in loyaltyService
        totalRewardsClaimed: 0,
        totalSpins: 0,
        reviewJourneyCompleted: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      db.saveCustomer(customer);
    } else {
      if (String(customer.businessId) !== String(business.id)) {
        customer.businessId = business.id;
      }
      if (typeof customer.visitCount !== 'number') {
        customer.visitCount = 0;
      }
      if (typeof customer.totalVisits !== 'number') {
        customer.totalVisits = 0;
      }
      db.saveCustomer(customer);
    }

    const result = loyaltyService.stampVisit(business.id, customer.id);

    if (session) {
      session.hasClaimedLoyalty = true;
      (session as any).loyaltyClaimed = true;
      if (Array.isArray((session as any).actionsCompleted)) {
        if (!(session as any).actionsCompleted.includes('loyalty')) {
          (session as any).actionsCompleted.push('loyalty');
        }
      } else {
        (session as any).actionsCompleted = ['loyalty'];
      }
      db.saveCustomerSession(session);
    }

    const entryType = getEntryTypeFromReq(req) || (isLoyaltyTier ? 'loyalty' : undefined);
    const statusPayload = statusService.formatStatusResponse(business, offer, result.customer, entryType);

    if (statusPayload.customer) {
      (statusPayload.customer as any).activeOfferId = result.customer.activeOfferId;
      (statusPayload.customer as any).cycleStartedAt = result.customer.cycleStartedAt;
    }

    // Terminal Lock on Cooldown:
    // Burn the session key (isUsed = true) synchronously via customerSessionService.ts only when the stamp is recorded and cooldown is returned.
    if (statusPayload.status.isCooldown || statusPayload.status.currentStage === 'cooldown') {
      if (session) {
        sessionService.burnSession(session.sessionToken);
      }
    }

    res.json({
      success: true,
      milestoneReached: result.milestoneReached,
      reward: result.reward,
      ...statusPayload,
      customer: {
        ...statusPayload.customer,
        activeOfferId: result.customer.activeOfferId,
        cycleStartedAt: result.customer.cycleStartedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Persist review before Google Maps handoff
router.post('/review/persist', (req: Request, res: Response, next) => {
  try {
    const { businessId, customerId, rating, tags, reviewText } = req.body;
    const result = reviewService.persistReview(
      businessId,
      customerId,
      Number(rating) || 5,
      Array.isArray(tags) ? tags : [],
      reviewText || ''
    );

    res.json({
      success: true,
      reviewLogId: result.reviewLog.id,
      googleReviewUrl: result.googleReviewUrl,
    });
  } catch (err) {
    next(err);
  }
});

// Mark Google opened
router.post('/review/opened', (req: Request, res: Response, next) => {
  try {
    const { reviewLogId, customerId } = req.body;
    reviewService.markGoogleOpened(reviewLogId, customerId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Top 5 Loyal Legends for a business
router.get('/top-rankers/:slug', (req: Request, res: Response, next) => {
  try {
    const { slug } = req.params;
    const business = db.getBusinessBySlug(slug);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const topRankers = loyaltyService.getTopRankers(business.id, TOP_RANKERS_LIMIT);

    res.json({
      success: true,
      businessName: business.name,
      topRankers,
    });
  } catch (err) {
    next(err);
  }
});

// Customer screen on-site voucher redemption by staff PIN or glance mode
router.post('/voucher/redeem', (req: Request, res: Response, next) => {
  try {
    const { businessId, voucherCode, staffPin } = req.body;
    if (!businessId || !voucherCode) {
      return res.status(400).json({ success: false, message: 'businessId and voucherCode are required' });
    }
    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    let cleanPin = staffPin ? String(staffPin).trim() : '';
    if (!business.skipRedemptionPin) {
      if (!cleanPin) {
        return res.status(409).json({
          success: false,
          error: 'PIN_REQUIRED',
          requiresPin: true,
          message: 'Staff PIN is required for verification',
        });
      }
      if (!/^\d{4}$/.test(cleanPin)) {
        return res.status(400).json({ success: false, message: 'Staff verification PIN must be exactly 4 digits' });
      }
    }

    const result = staffService.redeemVoucher(businessId, String(voucherCode).trim(), cleanPin);

    const sessionToken = (req.headers['x-customer-session'] as string) || req.body?.sessionToken;
    const updatedCustomer = db.getCustomerById(result.reward.customerId);
    const offer = db.getActiveOfferByBusinessId(businessId);
    if (updatedCustomer && business) {
      const statusPayload = statusService.formatStatusResponse(business, offer || null, updatedCustomer);
      if (sessionToken && (statusPayload.status.isCooldown || statusPayload.status.currentStage === 'cooldown')) {
        sessionService.burnSession(sessionToken);
      }
    }

    res.json({
      success: true,
      message: `Voucher ${result.reward.code} successfully redeemed for ${result.customerName}`,
      reward: result.reward,
    });
  } catch (err) {
    next(err);
  }
});

// Defer voucher to retain in session while continuing journey to review check
router.post('/voucher/defer', (req: Request, res: Response, next) => {
  try {
    const { businessId, customerId } = req.body;
    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    const customer = db.getCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    customer.voucherDeferred = true;
    customer.updatedAt = new Date().toISOString();
    db.saveCustomer(customer);

    const offer = db.getActiveOfferByBusinessId(businessId);
    const statusPayload = statusService.formatStatusResponse(business, offer || null, customer);

    const sessionToken = (req.headers['x-customer-session'] as string) || req.body?.sessionToken;
    if (sessionToken) {
      try {
        sessionService.handleStageSkip(sessionToken, business.tier);
      } catch {
        // Continue even if session is already updated
      }
      if (statusPayload.status.isCooldown || statusPayload.status.currentStage === 'cooldown') {
        sessionService.burnSession(sessionToken);
      }
    }

    res.json({
      success: true,
      message: 'Voucher saved in active session',
      ...statusPayload,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

