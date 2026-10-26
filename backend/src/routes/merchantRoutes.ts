import { Router, Response } from 'express';
import { staffAuthMiddleware, AuthenticatedStaffRequest } from '../middleware/staffMiddleware';
import { MemoryDB } from '../db/MemoryDB';
import { StaffService } from '../services/staffService';
import { LoyaltyService } from '../services/loyaltyService';
import { extractConfiguredPin } from '../utils/crypto';

const router = Router();
const db = MemoryDB.getInstance();
const staffService = new StaffService();
const loyaltyService = new LoyaltyService();

/**
 * Normalizes phone numbers to standard E.164 without '+' (defaults to India 91 prefix for 10-digit numbers)
 */
function normalizeWhatsAppNumber(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Shared handler to update merchant business settings
 */
function handleUpdateSettings(req: AuthenticatedStaffRequest, res: Response) {
  const businessId = req.staffSession!.businessId;
  const business = db.getBusinessById(businessId);
  if (!business) {
    return res.status(404).json({ success: false, message: 'Business not found' });
  }

  const { whatsappNumber, newStaffPin, skipRedemptionPin, isRushMode } = req.body;
  const effectiveSkip = skipRedemptionPin ?? isRushMode;
  const formattedWhatsApp = whatsappNumber !== undefined ? normalizeWhatsAppNumber(whatsappNumber) : undefined;

  const updatedProfile = staffService.updateSettings(businessId, {
    newStaffPin,
    skipRedemptionPin: effectiveSkip,
    whatsappNumber: formattedWhatsApp,
  });

  const freshBusiness = db.getBusinessById(businessId) || business;

  return res.json({
    success: true,
    message: 'Merchant settings updated successfully',
    settings: {
      whatsappNumber: freshBusiness.whatsappNumber || '',
      skipRedemptionPin: freshBusiness.skipRedemptionPin ?? false,
      configuredStaffPin: extractConfiguredPin(freshBusiness.staffPinHash) || '••••',
    },
    data: updatedProfile,
  });
}

// GET /api/merchant/settings
// Retrieve merchant business settings including whatsappNumber
router.get('/settings', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    res.json({
      success: true,
      settings: {
        whatsappNumber: business.whatsappNumber || '',
        skipRedemptionPin: business.skipRedemptionPin ?? false,
        isRushMode: business.skipRedemptionPin ?? false,
        configuredStaffPin: extractConfiguredPin(business.staffPinHash) || '••••',
      },
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
        whatsappNumber: business.whatsappNumber || '',
        logoEmoji: business.logoEmoji,
        logoUrl: business.logoUrl,
        accentColor: business.accentColor,
        loyaltyTarget: business.loyaltyTarget,
        loyaltyValidationDays: business.loyaltyValidationDays,
        loyaltyReward: business.loyaltyReward,
        skipRedemptionPin: business.skipRedemptionPin ?? false,
        configuredStaffPin: extractConfiguredPin(business.staffPinHash) || '••••',
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH / PUT / POST /api/merchant/settings
router.patch('/settings', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    return handleUpdateSettings(req, res);
  } catch (err) {
    next(err);
  }
});

router.put('/settings', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    return handleUpdateSettings(req, res);
  } catch (err) {
    next(err);
  }
});

router.post('/settings', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    return handleUpdateSettings(req, res);
  } catch (err) {
    next(err);
  }
});

// POST /api/merchant/onboarding & POST /api/merchant/setup
// Handles initial onboarding setup wizard submissions with direct WhatsApp number saving
const handleOnboardingSetup = (req: AuthenticatedStaffRequest, res: Response, next: any) => {
  try {
    const businessId = req.staffSession!.businessId;
    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const {
      name,
      category,
      city,
      country,
      whatsappNumber,
      loyaltyTarget,
      loyaltyReward,
      initialStaffPin,
    } = req.body;

    const formattedWhatsApp = normalizeWhatsAppNumber(whatsappNumber);

    const updatedProfile = staffService.updateSettings(businessId, {
      newStaffPin: initialStaffPin,
      whatsappNumber: formattedWhatsApp,
    });

    // Update basic merchant business metadata if provided
    if (name) business.name = name;
    if (category) business.category = category;
    if (city) business.city = city;
    if (country) business.country = country;
    if (loyaltyTarget) business.loyaltyTarget = Number(loyaltyTarget);
    if (loyaltyReward) business.loyaltyReward = loyaltyReward;
    if (formattedWhatsApp) business.whatsappNumber = formattedWhatsApp;

    res.json({
      success: true,
      message: 'Onboarding business profile setup complete',
      business: {
        id: business.id,
        name: business.name,
        whatsappNumber: business.whatsappNumber || '',
        tier: business.tier,
      },
      data: updatedProfile,
    });
  } catch (err) {
    next(err);
  }
};

router.post('/onboarding', staffAuthMiddleware, handleOnboardingSetup);
router.post('/setup', staffAuthMiddleware, handleOnboardingSetup);

// GET /api/merchant/customers
// Returns all customers for the merchant with rank, visit counts, active offer, and tier-gated WhatsApp access
router.get('/customers', staffAuthMiddleware, (req: AuthenticatedStaffRequest, res: Response, next) => {
  try {
    const businessId = req.staffSession!.businessId;
    const business = db.getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    // Feature gating: 1-Click WhatsApp CRM is exclusively available for LOYALTY and COMBINED tiers
    const normalizedTier = (business.tier || 'LOYALTY').toUpperCase();
    const canSendWhatsApp = normalizedTier === 'LOYALTY' || normalizedTier === 'COMBINED';

    const offer = db.getActiveOfferByBusinessId(businessId);
    const rankedCustomers = loyaltyService.computeStorewideDualRanks(businessId);

    // Sort ascending by storewide vipRank
    const sorted = [...rankedCustomers].sort((a: any, b: any) => (a.vipRank || 9999) - (b.vipRank || 9999));

    const customers = sorted.map((c) => {
      let activeOffer: { title: string; validUntil?: string } | undefined = undefined;
      if (offer && offer.status === 'active') {
        activeOffer = {
          title: offer.loyaltyReward || offer.title,
          validUntil: offer.expiresAt,
        };
      }

      return {
        id: c.id,
        businessId: c.businessId,
        name: c.name || 'Valued Guest',
        mobile: c.mobile,
        phone: c.mobile,
        rank: c.vipRank || 1,
        vipRank: c.vipRank || 1,
        streakerRank: c.streakerRank ?? null,
        lifetimeRank: c.vipRank || 1,
        activeOfferRank: c.streakerRank ?? null,
        visitCount: c.visitCount || 0,
        totalVisits: c.totalVisits || 0,
        lifetimeVisits: c.totalVisits || 0,
        activeOfferVisits: c.visitCount || 0,
        activeOfferId: c.activeOfferId,
        activeOffer,
        cycleStartedAt: c.cycleStartedAt,
        lastVisitAt: c.lastVisitAt,
        createdAt: c.createdAt,
      };
    });

    res.json({
      success: true,
      customers,
      permissions: {
        canSendWhatsApp,
        upgradeRequiredMessage: !canSendWhatsApp
          ? 'Upgrade to Loyalty or Combined tier to unlock 1-Click WhatsApp CRM.'
          : null,
      },
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        tier: business.tier,
        whatsappNumber: business.whatsappNumber || '',
        loyaltyTarget: offer?.loyaltyTarget || business.loyaltyTarget || 6,
      },
      offer: offer
        ? {
            id: offer.id,
            title: offer.title,
            loyaltyTarget: offer.loyaltyTarget,
            loyaltyReward: offer.loyaltyReward,
            status: offer.status,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;