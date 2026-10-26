import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { StaffService } from '../services/staffService';
import { CustomerSessionService } from '../services/customerSessionService';
import { MemoryDB } from '../db/MemoryDB';
import { staffAuthMiddleware, AuthenticatedStaffRequest } from '../middleware/staffMiddleware';
import { maskMobile, extractConfiguredPin } from '../utils/crypto';
import { Offer } from '../../../shared/types/offer';
import { validateTierConfiguration } from '../../../shared/validation/offerValidation';
import { CustomerSession, MerchantEntry } from '../../../shared/types/qr';
import { LoyaltyService } from '../services/loyaltyService';
import { isSameMerchantDay } from '../utils/timezone';
import { SubscriptionStatus, SubscriptionMeta } from '../../../shared/types/business';

const router = Router();
const staffService = new StaffService();
const sessionService = new CustomerSessionService();
const loyaltyService = new LoyaltyService();
const db = MemoryDB.getInstance();

// Staff Login
router.post('/login', (req: Request, res: Response, next) => {
  try {
    const { identifier, password, pin, staffPin } = req.body;
    const cred = password || pin || staffPin;
    if (!identifier || !cred) {
      return res.status(400).json({ success: false, message: 'Identifier and password or PIN are required' });
    }
    const result = staffService.login(identifier, String(cred).trim());
    res.json({
      success: true,
      sessionToken: result.session.sessionId,
      businessId: result.session.businessId,
      businessName: result.session.businessName,
      businessSlug: result.session.businessSlug,
      tier: result.session.tier,
      expiresAt: result.session.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// Staff Terminal Data (Protected)
router.get('/terminal-data', staffAuthMiddleware, async (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const offer = db.getActiveOfferByBusinessId(businessId) || null;
    let entries = db.getMerchantEntriesByBusinessId(businessId);

    // Normalize entries for Combined Tier to guarantee the 3 entry options
    if (business.tier === 'combined') {
      let qrEntry = entries.find(e => e.entryType === 'merchant_qr');
      if (!qrEntry) {
        qrEntry = {
          id: `entry_qr_${business.id}`,
          businessId: business.id,
          businessSlug: business.slug,
          entryType: 'merchant_qr',
          label: 'Dynamic QR',
          permanentCode: `${business.slug.toUpperCase()}-QR`,
          targetTier: 'combined',
          createdAt: new Date().toISOString(),
        };
        db.saveMerchantEntry(qrEntry);
        entries.push(qrEntry);
      } else {
        qrEntry.label = 'Dynamic QR';
      }

      let dynamicLoyaltyEntry = entries.find(e => e.entryType === 'loyalty_express');
      if (!dynamicLoyaltyEntry) {
        dynamicLoyaltyEntry = {
          id: `entry_dynamic_loyalty_${business.id}`,
          businessId: business.id,
          businessSlug: business.slug,
          entryType: 'loyalty_express',
          label: 'Loyalty Dynamic QR',
          permanentCode: `${business.slug.toUpperCase()}-DYN-LOYALTY`,
          targetTier: 'combined',
          createdAt: new Date().toISOString(),
        };
        db.saveMerchantEntry(dynamicLoyaltyEntry);
        entries.push(dynamicLoyaltyEntry);
      } else {
        dynamicLoyaltyEntry.label = 'Loyalty Dynamic QR';
        dynamicLoyaltyEntry.entryType = 'loyalty_express';
      }

      let nfcEntry = entries.find(e => e.entryType === 'nfc_tag' || e.entryType === 'combined');
      if (!nfcEntry) {
        nfcEntry = {
          id: `entry_nfc_${business.id}`,
          businessId: business.id,
          businessSlug: business.slug,
          entryType: 'combined',
          label: 'NFC Tag',
          permanentCode: `${business.slug.toUpperCase()}-NFC`,
          targetTier: 'combined',
          createdAt: new Date().toISOString(),
        };
        db.saveMerchantEntry(nfcEntry);
        entries.push(nfcEntry);
      } else {
        nfcEntry.label = 'NFC Tag';
        nfcEntry.entryType = 'combined';
      }

      let loyaltyEntry = entries.find(e => e.entryType === 'loyalty' || e.entryType === 'instant_loyalty');
      if (!loyaltyEntry) {
        loyaltyEntry = {
          id: `entry_loyalty_${business.id}`,
          businessId: business.id,
          businessSlug: business.slug,
          entryType: 'loyalty',
          label: 'Loyalty NFC Tag',
          permanentCode: `${business.slug.toUpperCase()}-LOYALTY`,
          targetTier: 'combined',
          createdAt: new Date().toISOString(),
        };
        db.saveMerchantEntry(loyaltyEntry);
        entries.push(loyaltyEntry);
      } else {
        loyaltyEntry.label = 'Loyalty NFC Tag';
        loyaltyEntry.entryType = 'loyalty';
      }

      // Exact Order: Dynamic QR (1) -> Loyalty Dynamic QR (2) -> NFC Tag (3) -> Loyalty NFC Tag (4)
      entries.sort((a, b) => {
        const order: Record<string, number> = {
          merchant_qr: 1,
          loyalty_express: 2,
          combined: 3,
          nfc_tag: 3,
          loyalty: 4,
          instant_loyalty: 4,
        };
        return (order[a.entryType] || 99) - (order[b.entryType] || 99);
      });
    } else {
      // Individual tiers: Main Counter Printed QR (Dynamic QR) + Physical NFC Tag
      let qrEntry = entries.find(e => e.entryType === 'merchant_qr');
      if (!qrEntry) {
        qrEntry = {
          id: `entry_qr_${business.id}`,
          businessId: business.id,
          businessSlug: business.slug,
          entryType: 'merchant_qr',
          label: 'Dynamic QR',
          permanentCode: `${business.slug.toUpperCase()}-QR`,
          targetTier: business.tier,
          createdAt: new Date().toISOString(),
        };
        db.saveMerchantEntry(qrEntry);
        entries.push(qrEntry);
      } else {
        qrEntry.label = 'Dynamic QR';
      }

      let nfcEntry = entries.find(e => e.entryType === 'nfc_tag' || e.entryType === 'combined');
      if (!nfcEntry) {
        nfcEntry = {
          id: `entry_nfc_${business.id}`,
          businessId: business.id,
          businessSlug: business.slug,
          entryType: 'nfc_tag',
          label: 'Physical NFC Tag',
          permanentCode: `${business.slug.toUpperCase()}-NFC`,
          targetTier: business.tier,
          createdAt: new Date().toISOString(),
        };
        db.saveMerchantEntry(nfcEntry);
        entries.push(nfcEntry);
      } else {
        nfcEntry.label = 'Physical NFC Tag';
      }

      entries.sort((a, b) => {
        const order: Record<string, number> = {
          merchant_qr: 1,
          nfc_tag: 2,
          combined: 2,
        };
        return (order[a.entryType] || 99) - (order[b.entryType] || 99);
      });
    }

    const customers = loyaltyService.computeStorewideDualRanks(businessId);
    const rawRewards = db.getRewardsByBusinessId(businessId);
    const rawReviews = db.getReviewLogsByBusinessId(businessId);

    const now = new Date();
    const tz = business.timezone || 'UTC';

    let loyaltyRecords: any[] = [];
    let rewards: any[] = [];
    let reviews: any[] = [];
    let trackerMetrics = {
      totalGuests: 0,
      claimedRewards: 0,
      pendingVouchers: 0,
      reviewsCount: 0,
    };

    if (offer) {
      // --- Task A: Filter Daily Logs (Midnight + Active Offer) ---
      // 1. Loyalty records: Customers who stamped today under the active offer
      const dailyLoyaltyCustomers = customers.filter(c => {
        const matchesOffer = (c as any).offerId
          ? (c as any).offerId === offer.id
          : (c.activeOfferId ? c.activeOfferId === offer.id : true);
        const stampedToday = c.lastVisitAt ? isSameMerchantDay(c.lastVisitAt, now, tz) : false;
        return matchesOffer && stampedToday;
      });

      const loyaltyTarget = offer.loyaltyTarget || business.loyaltyTarget || 6;
      loyaltyRecords = dailyLoyaltyCustomers.map(c => ({
        id: c.id,
        name: c.name || 'Guest',
        mobile: c.mobile,
        mobileMasked: c.mobile, // Full complete mobile number for staff record log
        phone: c.phone || c.mobile,
        rawMobile: c.mobile,
        rawPhone: c.phone || c.mobile,
        phoneNumber: c.phone || c.mobile,
        fullMobile: c.mobile,
        countryCode: (c as any).countryCode || (c.mobile?.startsWith('+91') ? '+91' : c.mobile?.startsWith('+1') ? '+1' : (c.mobile?.startsWith('+44') ? '+44' : business.country)),
        visitCount: c.visitCount || 0,
        target: loyaltyTarget,
        totalVisits: c.totalVisits || 0,
        lastVisitAt: c.lastVisitAt,
        offerId: (c as any).offerId || c.activeOfferId || offer.id,
        createdAt: c.lastVisitAt || c.updatedAt || c.createdAt,
        vipRank: c.vipRank || 1,
        streakerRank: c.streakerRank ?? null,
        rank: c.vipRank || 1,
      })).sort((a, b) => new Date(b.lastVisitAt || 0).getTime() - new Date(a.lastVisitAt || 0).getTime());

      // 2. Rewards: Vouchers issued/claimed today under the active offer
      rewards = rawRewards.filter(r => {
        const matchesOffer = (r as any).offerId ? (r as any).offerId === offer.id : true;
        const recordDate = r.claimedAt || (r as any).createdAt;
        const isToday = recordDate ? isSameMerchantDay(recordDate, now, tz) : false;
        return matchesOffer && isToday;
      }).map(r => {
        const cust = db.getCustomerById(r.customerId);
        const fullMobile = cust?.mobile || r.customerMobileMasked || '';
        return {
          ...r,
          offerId: (r as any).offerId || offer.id,
          customerName: cust?.name || r.customerName || 'Guest',
          customerMobile: fullMobile,
          customerMobileMasked: fullMobile,
        };
      });

      // 3. Reviews: Reviews submitted today under the active offer
      reviews = rawReviews.filter(rev => {
        const matchesOffer = (rev as any).offerId ? (rev as any).offerId === offer.id : true;
        const isToday = rev.createdAt ? isSameMerchantDay(rev.createdAt, now, tz) : false;
        return matchesOffer && isToday;
      }).map(rev => ({
        ...rev,
        offerId: (rev as any).offerId || offer.id,
      }));

      // --- Task B: Calculate Top Tracker Metrics (Offer-Scoped Cumulative Lifespan) ---
      // Scoped strictly to the active offer across its entire lifespan (NO isSameMerchantDay filter)
      const offerCustomerIds = new Set<string>();
      customers.forEach(c => {
        const matchesOffer = (c as any).offerId ? (c as any).offerId === offer.id : (c.activeOfferId === offer.id);
        if (matchesOffer || c.totalVisits > 0 || c.lastVisitAt) {
          if ((c as any).offerId === offer.id || c.activeOfferId === offer.id || !c.activeOfferId) {
            offerCustomerIds.add(c.id);
          }
        }
      });

      const offerRewards = rawRewards.filter(r => ((r as any).offerId ? (r as any).offerId === offer.id : true));
      offerRewards.forEach(r => offerCustomerIds.add(r.customerId));

      const offerReviews = rawReviews.filter(rev => ((rev as any).offerId ? (rev as any).offerId === offer.id : true));
      offerReviews.forEach(rev => offerCustomerIds.add(rev.customerId));

      const totalGuests = Math.max(offerCustomerIds.size, offer.metrics?.identifiedGuests || 0, offer.metrics?.scans || 0);
      const claimedRewards = offerRewards.filter(r => r.status === 'redeemed').length || (offer.metrics?.rewardsRedeemed || 0);
      const pendingVouchers = offerRewards.filter(r => r.status !== 'redeemed').length;
      const reviewsCount = offerReviews.length || (offer.metrics?.reviewsPersisted || 0);

      trackerMetrics = {
        totalGuests,
        claimedRewards,
        pendingVouchers,
        reviewsCount,
      };
    }

    // Generate QR data URLs for entries
    let baseUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL.replace(/\/$/, '')
      : '';

    if (!baseUrl) {
      const forwardedHost = req.get('x-forwarded-host');
      const forwardedProto = req.get('x-forwarded-proto') || (req.protocol === 'https' ? 'https' : 'http');
      if (forwardedHost) {
        baseUrl = `${forwardedProto}://${forwardedHost}`;
      } else {
        const host = req.get('host') || 'localhost:3000';
        const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
        baseUrl = `${protocol}://${host}`;
      }
    }

    const entriesWithQr = await Promise.all(
      entries.map(async entry => {
        let customerUrl = `${baseUrl}/c/${business.slug}/v`;
        let sessionKey: string | undefined;
        let expiresAt: string | undefined;

        if (entry.entryType === 'merchant_qr') {
          let activeQrSession = db.getActiveQrSessionForBusiness(business.id);
          if (!activeQrSession) {
            activeQrSession = db.createQrSession(business.id, offer?.id || '');
          }
          sessionKey = activeQrSession.sessionKey;
          expiresAt = activeQrSession.expiresAt;
          customerUrl = `${baseUrl}/c/${business.slug}/v?sk=${activeQrSession.sessionKey}`;
        } else if (entry.entryType === 'loyalty_express') {
          const sessionsMap = (db as any).customerSessions as Map<string, CustomerSession> | undefined;
          let activeLoyaltySession: CustomerSession | undefined = sessionsMap
            ? Array.from(sessionsMap.values()).find(
                s => s.businessId === business.id && s.authType === 'qr' && (s.entryType as string) === 'loyalty_express' && s.status === 'unused' && s.expiresAt > new Date().toISOString()
              )
            : undefined;
          if (!activeLoyaltySession) {
            activeLoyaltySession = sessionService.createSession(
              business.id,
              offer?.id || '',
              'qr',
              undefined,
              undefined,
              'loyalty_express'
            );
          }
          sessionKey = activeLoyaltySession.sessionKey;
          expiresAt = activeLoyaltySession.expiresAt;
          customerUrl = `${baseUrl}/c/${business.slug}/loyalty?sk=${activeLoyaltySession.sessionKey}&entryType=loyalty_express`;
        } else if (entry.entryType === 'loyalty' || entry.entryType === 'instant_loyalty') {
          customerUrl = `${baseUrl}/api/entry/tap/${business.slug}?k=${business.nfcSecretKey}&mode=loyalty`;
        } else {
          customerUrl = `${baseUrl}/api/entry/tap/${business.slug}?k=${business.nfcSecretKey}`;
        }

        let qrDataUrl = '';
        try {
          qrDataUrl = await QRCode.toDataURL(customerUrl, {
            margin: 1,
            width: 280,
            color: { dark: '#0e7c66', light: '#ffffff' },
          });
        } catch (e) {
          // ignore qr generation error
        }
        return {
          ...entry,
          customerUrl,
          qrDataUrl,
          sessionKey,
          expiresAt,
        };
      })
    );

    // Subscription lifecycle derivation (server-authoritative UTC)
    const expiresAt = business.subscriptionExpiresAt
      ? new Date(business.subscriptionExpiresAt)
      : new Date(new Date(business.createdAt || Date.now()).getTime() + 365 * 24 * 60 * 60 * 1000);
    const diffMs = expiresAt.getTime() - now.getTime();
    const isExpired = now.getTime() >= expiresAt.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isLastDay = !isExpired && (daysRemaining === 0 || diffMs <= 24 * 60 * 60 * 1000);
    const subscriptionStatus: SubscriptionStatus = isExpired
      ? 'expired'
      : (daysRemaining <= 15 ? 'expiring_soon' : 'active');

    const subscription: SubscriptionMeta = {
      status: subscriptionStatus,
      expiresAt: expiresAt.toISOString(),
      daysRemaining,
      isExpired,
      isLastDay,
    };

    res.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        email: business.email,
        tier: business.tier,
        category: business.category,
        city: business.city,
        country: business.country,
        timezone: business.timezone,
        logoEmoji: business.logoEmoji,
        logoUrl: business.logoUrl,
        accentColor: business.accentColor,
        loyaltyTarget: business.loyaltyTarget,
        loyaltyValidationDays: business.loyaltyValidationDays,
        loyaltyReward: business.loyaltyReward,
        spinWheelConfiguration: business.spinWheelConfiguration,
        googleReviewUrl: business.googleReviewUrl,
        nfcSecretKey: business.nfcSecretKey,
        configuredStaffPin: extractConfiguredPin(business.staffPinHash) || '••••',
        skipRedemptionPin: business.skipRedemptionPin ?? false,
        whatsappNumber: business.whatsappNumber,
        subscriptionExpiresAt: business.subscriptionExpiresAt || expiresAt.toISOString(),
      },
      subscription,
      offer: offer ? {
        id: offer.id,
        title: offer.title,
        tier: offer.tier,
        status: offer.status,
        createdAt: offer.createdAt,
        activatedAt: offer.activatedAt,
        spinWheelConfiguration: offer.spinWheelConfiguration,
        loyaltyTarget: offer.loyaltyTarget,
        loyaltyValidationDays: offer.loyaltyValidationDays,
        loyaltyReward: offer.loyaltyReward,
        metrics: {
          ...offer.metrics,
          totalGuests: trackerMetrics.totalGuests,
          claimedRewards: trackerMetrics.claimedRewards,
          pendingVouchers: trackerMetrics.pendingVouchers,
          reviewsCount: trackerMetrics.reviewsCount,
          rewardsRedeemed: trackerMetrics.claimedRewards,
          identifiedGuests: trackerMetrics.totalGuests,
        },
      } : null,
      trackerMetrics,
      metrics: trackerMetrics,
      entries: entriesWithQr,
      loyaltyRecords,
      rewards,
      reviews,
      offerHistory: staffService.getOfferHistory(business.id),
    });
  } catch (err) {
    next(err);
  }
});

// Renew Merchant Subscription (POST /api/staff/renew-subscription)
router.post('/renew-subscription', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const currentExpires = business.subscriptionExpiresAt ? new Date(business.subscriptionExpiresAt).getTime() : Date.now();
    const baseTime = currentExpires > Date.now() ? currentExpires : Date.now();
    const newExpiresAt = new Date(baseTime + 365 * 24 * 60 * 60 * 1000).toISOString();

    business.subscriptionExpiresAt = newExpiresAt;
    business.updatedAt = new Date().toISOString();
    db.saveBusiness(business);

    res.json({
      success: true,
      message: 'Subscription successfully renewed for 1 year',
      subscriptionExpiresAt: newExpiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// Update Staff Terminal Settings (PATCH or POST /api/staff/settings)
router.patch('/settings', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const { newStaffPin, skipRedemptionPin, isRushMode, skipStaffVerification, whatsappNumber } = req.body;
    const effectiveSkip = skipRedemptionPin ?? isRushMode ?? skipStaffVerification;

    if (newStaffPin !== undefined && newStaffPin !== null) {
      const cleanPin = String(newStaffPin).trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        return res.status(400).json({
          success: false,
          message: 'Staff verification PIN must be exactly 4 digits',
        });
      }
    }

    if (effectiveSkip !== undefined && effectiveSkip !== null) {
      if (typeof effectiveSkip !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'skipRedemptionPin must be a boolean',
        });
      }
    }

    const data = staffService.updateSettings(businessId, {
      newStaffPin,
      skipRedemptionPin: effectiveSkip,
      whatsappNumber,
    });

    res.json({
      success: true,
      message: 'Terminal settings updated successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
});

// Alias POST /settings
router.post('/settings', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const { newStaffPin, skipRedemptionPin, isRushMode, skipStaffVerification, whatsappNumber } = req.body;
    const effectiveSkip = skipRedemptionPin ?? isRushMode ?? skipStaffVerification;

    if (newStaffPin !== undefined && newStaffPin !== null) {
      const cleanPin = String(newStaffPin).trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        return res.status(400).json({
          success: false,
          message: 'Staff verification PIN must be exactly 4 digits',
        });
      }
    }

    if (effectiveSkip !== undefined && effectiveSkip !== null) {
      if (typeof effectiveSkip !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'skipRedemptionPin must be a boolean',
        });
      }
    }

    const data = staffService.updateSettings(businessId, {
      newStaffPin,
      skipRedemptionPin: effectiveSkip,
      whatsappNumber,
    });

    res.json({
      success: true,
      message: 'Terminal settings updated successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
});

// Redeem Customer Reward Voucher with 4-digit PIN or glance mode
router.post(['/redeem-voucher', '/redeem'], staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const { voucherCode, staffPin } = req.body;

    if (!voucherCode) {
      return res.status(400).json({ success: false, message: 'voucherCode is required' });
    }

    const business = db.getBusinessById(businessId);
    let cleanPin = staffPin ? String(staffPin).trim() : '';

    if (!business?.skipRedemptionPin) {
      if (!cleanPin) {
        return res.status(400).json({ success: false, message: 'Staff verification PIN is required' });
      }
      if (!/^\d{4}$/.test(cleanPin)) {
        return res.status(400).json({ success: false, message: 'Staff verification PIN must be exactly 4 digits' });
      }
    }

    const result = staffService.redeemVoucher(businessId, String(voucherCode).trim(), cleanPin);
    res.json({
      success: true,
      message: `Voucher ${result.reward.code} successfully redeemed for ${result.customerName}`,
      reward: result.reward,
    });
  } catch (err) {
    next(err);
  }
});

// Delete / Deactivate active offer (preserves history, transitions offer status to cancelled)
router.post(['/delete-offer', '/cancel-offer'], staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const result = staffService.deleteActiveOffer(businessId);

    res.json({
      success: true,
      message: 'Active offer has been deactivated and archived in Offer History.',
      offer: result.offer,
    });
  } catch (err) {
    next(err);
  }
});

// Get business offer history (Strictly business-scoped)
router.get('/offer-history', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const offers = staffService.getOfferHistory(businessId);
    res.json({
      success: true,
      offers,
    });
  } catch (err) {
    next(err);
  }
});

// Activate new offer/campaign for the business matching its tier plan
router.post('/activate-offer', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const {
      title,
      description,
      spinWheelConfiguration,
      loyaltyTarget,
      loyaltyValidationDays,
      loyaltyReward,
      googleReviewUrl,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Offer/Campaign title is required' });
    }

    // Validate tier plan specific configuration
    const valResult = validateTierConfiguration(business.tier, {
      spinWheelConfiguration: spinWheelConfiguration || business.spinWheelConfiguration,
      loyaltyTarget: loyaltyTarget !== undefined ? Number(loyaltyTarget) : business.loyaltyTarget,
      loyaltyValidationDays: loyaltyValidationDays !== undefined ? Number(loyaltyValidationDays) : business.loyaltyValidationDays,
      loyaltyReward: loyaltyReward || business.loyaltyReward,
      googleReviewUrl: googleReviewUrl || business.googleReviewUrl,
    });

    if (!valResult.valid) {
      return res.status(400).json({ success: false, message: valResult.error });
    }

    const newOffer = staffService.createAndActivateOffer(businessId, {
      title,
      description,
      spinWheelConfiguration,
      loyaltyTarget: loyaltyTarget !== undefined ? Number(loyaltyTarget) : undefined,
      loyaltyValidationDays: loyaltyValidationDays !== undefined ? Number(loyaltyValidationDays) : undefined,
      loyaltyReward,
      googleReviewUrl,
    });

    res.json({
      success: true,
      message: 'New offer successfully activated!',
      offer: newOffer,
    });
  } catch (err: any) {
    if (err.message && err.message.startsWith('ACTIVE_OFFER_EXISTS')) {
      return res.status(409).json({ success: false, message: err.message });
    }
    next(err);
  }
});


// Refresh Dynamic Counter QR session key
router.post('/qr/refresh', staffAuthMiddleware, async (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    const offer = db.getActiveOfferByBusinessId(businessId);
    const { entryType } = req.body;
    const isLoyaltyExpress = entryType === 'loyalty_express';

    // 1. Invalidate previous unused QR session keys for this business
    if (isLoyaltyExpress) {
      const sessionsMap = (db as any).customerSessions as Map<string, CustomerSession> | undefined;
      const allSessions = sessionsMap ? Array.from(sessionsMap.values()) : [];
      for (const s of allSessions) {
        if (s.businessId === businessId && s.authType === 'qr' && (s.entryType as string) === 'loyalty_express' && s.status === 'unused') {
          s.status = 'expired';
          s.expiresAt = new Date().toISOString();
          db.saveCustomerSession(s);
        }
      }
    } else {
      db.invalidateUnusedQrSessions(businessId);
    }

    // 2. Generate new 6-minute QR session key using customerSessionService.createSession(...)
    const targetEntryType = isLoyaltyExpress ? 'loyalty_express' : 'combined';
    const newSession = sessionService.createSession(
      businessId,
      offer?.id || '',
      'qr',
      undefined,
      undefined,
      targetEntryType
    );

    // 3. Compute base URL
    let baseUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL.replace(/\/$/, '')
      : '';

    if (!baseUrl) {
      const forwardedHost = req.get('x-forwarded-host');
      const forwardedProto = req.get('x-forwarded-proto') || (req.protocol === 'https' ? 'https' : 'http');
      if (forwardedHost) {
        baseUrl = `${forwardedProto}://${forwardedHost}`;
      } else {
        const host = req.get('host') || 'localhost:3000';
        const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
        baseUrl = `${protocol}://${host}`;
      }
    }

    // 4. Generate new Customer URL
    const customerUrl = isLoyaltyExpress
      ? `${baseUrl}/c/${business.slug}/loyalty?sk=${newSession.sessionKey}&entryType=loyalty_express`
      : `${baseUrl}/c/${business.slug}/v?sk=${newSession.sessionKey}`;

    // 5. Generate new QR data URL
    const qrDataUrl = await QRCode.toDataURL(customerUrl, {
      margin: 1,
      width: 280,
      color: { dark: '#0e7c66', light: '#ffffff' },
    });

    res.json({
      success: true,
      sessionKey: newSession.sessionKey,
      customerUrl,
      qrDataUrl,
      expiresAt: newSession.expiresAt || new Date(Date.now() + 6 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// Helper route to generate standalone QR code for any URL
router.get('/qr-code', async (req: Request, res: Response, next) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }
    const qrDataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      color: { dark: '#10181c', light: '#ffffff' },
    });
    res.json({ success: true, qrDataUrl });
  } catch (err) {
    next(err);
  }
});

// Update Merchant Profile and Branding (Protected, Isolated to authenticated merchant)
router.put('/profile', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const {
      name,
      logoEmoji,
      logoUrl,
      googleReviewUrl,
      instagramUrl,
      websiteUrl,
      facebookUrl,
      zomatoUrl,
      swiggyUrl,
      accentColor,
      whatsappNumber,
    } = req.body;

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) {
        return res.status(400).json({ success: false, message: 'Business name cannot be empty' });
      }
      business.name = cleanName;
    }

    if (whatsappNumber !== undefined) {
      business.whatsappNumber = whatsappNumber ? String(whatsappNumber).trim() : undefined;
    }

    if (logoEmoji !== undefined) {
      business.logoEmoji = String(logoEmoji).trim() || '🏪';
    }

    if (logoUrl !== undefined) {
      business.logoUrl = String(logoUrl).trim();
    }

    if (googleReviewUrl !== undefined) {
      business.googleReviewUrl = String(googleReviewUrl).trim();
    }

    if (instagramUrl !== undefined) {
      business.instagramUrl = String(instagramUrl).trim();
    }

    if (websiteUrl !== undefined) {
      (business as any).websiteUrl = String(websiteUrl).trim();
    }

    if (facebookUrl !== undefined) {
      (business as any).facebookUrl = String(facebookUrl).trim();
    }

    if (zomatoUrl !== undefined) {
      business.zomatoUrl = String(zomatoUrl).trim();
    }

    if (swiggyUrl !== undefined) {
      business.swiggyUrl = String(swiggyUrl).trim();
    }

    if (accentColor !== undefined && accentColor) {
      business.accentColor = String(accentColor).trim();
    }

    business.updatedAt = new Date().toISOString();
    db.saveBusiness(business);

    res.json({
      success: true,
      message: 'Merchant profile and branding updated successfully',
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        email: business.email,
        tier: business.tier,
        category: business.category,
        city: business.city,
        country: business.country,
        timezone: business.timezone,
        logoEmoji: business.logoEmoji,
        logoUrl: business.logoUrl,
        accentColor: business.accentColor,
        googleReviewUrl: business.googleReviewUrl,
        instagramUrl: business.instagramUrl,
        websiteUrl: (business as any).websiteUrl,
        facebookUrl: (business as any).facebookUrl,
        zomatoUrl: business.zomatoUrl,
        swiggyUrl: business.swiggyUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
