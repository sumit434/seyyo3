import { Router, Request, Response } from 'express';
import { CustomerSessionService } from '../services/customerSessionService';
import { CustomerStatusService } from '../services/customerStatusService';
import { MemoryDB } from '../db/MemoryDB';

const router = Router();
const sessionService = new CustomerSessionService();
const statusService = new CustomerStatusService();
const db = MemoryDB.getInstance();

/**
 * Permanent NFC Tap Handler
 * Conceptually: NTAG213 -> /api/entry/tap/:slug?k={nfcSecretKey}[&mode=loyalty]
 *
 * 1. Global Standard NFC (?k={nfcSecretKey}):
 *    - Required on ALL NFC taps across every tier.
 *    - Missing or invalid k is rejected with 403 Forbidden.
 *    - Directs customer into merchant's configured tier sequence:
 *      * Review Booster tier -> Review flow
 *      * Spin tier -> Spin flow
 *      * Loyalty tier -> Loyalty flow
 *      * Combined tier -> Full Combined flow (Spin -> Loyalty -> Review -> Cooldown)
 *
 * 2. Combined-Tier Exclusive Loyalty NFC (?k={nfcSecretKey}&mode=loyalty):
 *    - Restricted only and strictly to Combined Tier's Loyalty NFC Tag.
 *    - If mode === 'loyalty' is passed by a merchant from another tier, the flag is ignored.
 *    - Initiates session directly at Loyalty Stamp stage, bypassing Spin Wheel.
 */
router.get(['/tap/:identifier', '/tap/:identifier/:subpath'], (req: Request, res: Response, next) => {
  try {
    const { identifier, subpath } = req.params;
    const { k, mode } = req.query;

    let business = db.getBusinessBySlug(identifier);
    if (!business) {
      const entry = db.getMerchantEntryByPermanentCode(identifier);
      if (entry) {
        business = db.getBusinessById(entry.businessId);
      }
    }

    if (!business) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    // 1. Cryptographic Key Check (if k is provided, it must match)
    if (k && String(k) !== String(business.nfcSecretKey)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized or invalid NFC tag',
      });
    }

    const offer = db.getActiveOfferByBusinessId(business.id);
    if (!offer || offer.status !== 'active') {
      // Inactive offer fallback -> redirect to merchant view
      return res.redirect(302, `/c/${business.slug}/v`);
    }

    // Record scan metric
    offer.metrics.scans += 1;
    db.saveOffer(offer);

    // 2. Strict Mode Enforcement (Applies ONLY to Combined Tier)
    const isLoyaltyRequested = mode === 'loyalty' || subpath === 'loyalty';
    const isCombinedLoyaltyBypass = isLoyaltyRequested && business.tier === 'combined';

    if (isCombinedLoyaltyBypass) {
      // Combined tier bypass: start directly at loyalty stage, skipping spin
      const session = sessionService.createNfcSession(business.id, offer.id, 'loyalty_express');
      return res.redirect(
        302,
        `/c/${business.slug}/loyalty?sk=${encodeURIComponent(session.sessionKey)}&entryType=loyalty_express`
      );
    }

    // Standard Tier Sequences for Global NFC
    if (business.tier === 'review') {
      const session = sessionService.createNfcSession(business.id, offer.id, 'review');
      return res.redirect(302, `/review/${business.slug}?sk=${encodeURIComponent(session.sessionKey)}`);
    }

    if (business.tier === 'loyalty') {
      const session = sessionService.createNfcSession(business.id, offer.id, 'loyalty');
      return res.redirect(
        302,
        `/c/${business.slug}/loyalty?sk=${encodeURIComponent(session.sessionKey)}&entryType=loyalty`
      );
    }

    if (business.tier === 'spin') {
      const session = sessionService.createNfcSession(business.id, offer.id, 'spin');
      return res.redirect(
        302,
        `/c/${business.slug}/v?sk=${encodeURIComponent(session.sessionKey)}&entryType=spin`
      );
    }

    // Combined Tier Standard sequence: Spin -> Loyalty -> Review -> Cooldown
    const session = sessionService.createNfcSession(business.id, offer.id, 'combined');
    return res.redirect(
      302,
      `/c/${business.slug}/v?sk=${encodeURIComponent(session.sessionKey)}`
    );
  } catch (err) {
    next(err);
  }
});

// Resolve QR/NFC entry via POST or GET
const handleResolve = (req: Request, res: Response, next: any) => {
  try {
    let identifier = req.params.identifier || (req.body?.slug as string) || (req.query?.slug as string) || '';
    const sk = (req.query.sk || req.query.sessionKey || req.query.key || req.query.token || req.body?.sk || req.body?.sessionKey) as string | undefined;
    const reqType = (req.query.type || req.body?.type) as string | undefined;
    const k = (req.query.k || req.body?.k) as string | undefined;
    const mode = (req.query.mode || req.body?.mode) as string | undefined;

    // If identifier is not given or is 'entry', resolve from active session key
    if ((!identifier || identifier === 'entry') && sk) {
      const sess = db.getCustomerSession(sk);
      if (sess) {
        const biz = db.getBusinessById(sess.businessId);
        if (biz) {
          identifier = biz.slug;
        }
      }
    }

    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Merchant identifier or session key required' });
    }

    const { business, offer, entry, isActive } = sessionService.resolveMerchant(identifier);

    if (!isActive || !offer) {
      return res.json({
        success: true,
        isActive: false,
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug,
          category: business.category,
          logoEmoji: business.logoEmoji,
          logoUrl: business.logoUrl,
          accentColor: business.accentColor,
        },
        offer: null,
        message: 'No active offers currently running for this business.',
      });
    }

    // NFC Security & Mode Validation for direct API resolves
    if (reqType === 'nfc') {
      if (k && String(k) !== String(business.nfcSecretKey)) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized or invalid NFC tag',
        });
      }

      // If resolving an NFC tag without an existing sk, generate a fresh NFC session
      if (!sk) {
        const isCombinedLoyaltyBypass = mode === 'loyalty' && business.tier === 'combined';
        const effectiveEntryType = isCombinedLoyaltyBypass
          ? 'loyalty_express'
          : (business.tier === 'loyalty' ? 'loyalty' : business.tier === 'review' ? 'review' : business.tier === 'spin' ? 'spin' : 'combined');

        const session = sessionService.createNfcSession(business.id, offer.id, effectiveEntryType);
        const statusPayload = statusService.formatStatusResponse(business, offer, null, effectiveEntryType);

        return res.json({
          success: true,
          isActive: true,
          isViewOnly: false,
          sessionToken: session.sessionToken,
          sessionKey: session.sessionKey,
          entryType: effectiveEntryType,
          ...statusPayload,
        });
      }
    }

    const entryTypeStr = (entry?.entryType as string) || '';
    const requestedEntryType = (req.query.entryType as string) || (req.body?.entryType as string) || (mode === 'loyalty' ? 'loyalty' : (entryTypeStr === 'loyalty' || entryTypeStr === 'instant_loyalty' || entryTypeStr === 'loyalty_express' ? 'loyalty_express' : 'combined'));
    const isLoyaltyRequested = requestedEntryType === 'loyalty' || requestedEntryType === 'loyalty_express' || requestedEntryType === 'instant_loyalty';
    const effectiveEntryType: string = isLoyaltyRequested ? requestedEntryType : 'combined';

    // If no session key provided: PERMANENT BASE URL IS VIEW-ONLY
    // Must NOT create a claimable session.
    if (!sk) {
      const statusPayload = statusService.formatStatusResponse(business, offer, null, effectiveEntryType);
      return res.json({
        success: true,
        isActive: true,
        isViewOnly: true,
        sessionToken: null,
        sessionKey: null,
        entryType: effectiveEntryType,
        ...statusPayload,
        status: {
          ...statusPayload.status,
          claimAvailable: false,
          isViewOnly: true,
        },
      });
    }

    const session = db.getCustomerSession(sk);

    if (!session) {
      return res.status(403).json({
        success: false,
        error: 'SESSION_EXPIRED',
        message: 'Token already used or expired',
      });
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return res.status(403).json({
        success: false,
        error: 'SESSION_EXPIRED',
        message: 'Token already used or expired',
      });
    }

    if (session.status === 'completed') {
      return res.status(403).json({
        success: false,
        error: 'SESSION_ALREADY_USED',
        message: 'Token already used or expired',
      });
    }

    if (!session.entryType || (requestedEntryType === 'loyalty_express' && session.entryType !== 'loyalty_express')) {
      session.entryType = effectiveEntryType;
      db.saveCustomerSession(session);
    }

    // Initial status without logged-in customer
    const sessionEntryType = session.entryType || effectiveEntryType;
    const statusPayload = statusService.formatStatusResponse(business, offer, null, sessionEntryType);

    res.json({
      success: true,
      isActive: true,
      isViewOnly: false,
      sessionToken: session.sessionToken,
      sessionKey: session.sessionKey,
      entryType: sessionEntryType,
      ...statusPayload,
    });
  } catch (err) {
    next(err);
  }
};

router.get('/resolve', handleResolve);
router.get('/resolve/:identifier', handleResolve);
router.get('/:identifier', handleResolve);
router.post('/resolve', handleResolve);
router.post('/resolve/:identifier', handleResolve);
router.post('/:identifier', handleResolve);

export default router;
