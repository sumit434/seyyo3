import { MemoryDB } from '../db/MemoryDB';
import { generateSecureToken, hashPassword, hashPin, sha256 } from '../utils/crypto';
import { MAGIC_LINK_TTL_MS } from '../../../shared/constants/limits';
import { ProductTier, PRODUCT_TIERS } from '../../../shared/constants/tiers';
import { OnboardingDraftData, OnboardingSession, OnboardingToken, OnboardingAttribution } from '../../../shared/types/onboarding';
import { Business, OnboardingStepName } from '../../../shared/types/business';
import { Offer } from '../../../shared/types/offer';
import { MerchantEntry } from '../../../shared/types/qr';
import { StaffSession } from '../../../shared/types/session';
import { validateOnboardingProfile, validateOnboardingSecurity, validateTierConfiguration } from '../../../shared/validation/offerValidation';

export class OnboardingService {
  private db: MemoryDB;

  constructor() {
    this.db = MemoryDB.getInstance();
  }

  /**
   * Create a 15-minute TTL magic link token upon simulated or real payment
   */
  public createMagicLink(
    email: string,
    tier: ProductTier,
    attribution?: OnboardingAttribution
  ): { rawToken: string; tokenRecord: OnboardingToken; setupUrl: string } {
    if (!PRODUCT_TIERS[tier]) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = sha256(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + MAGIC_LINK_TTL_MS).toISOString();

    const tokenRecord: OnboardingToken = {
      id: `ot_${generateSecureToken(8)}`,
      tokenHash,
      email: email.trim().toLowerCase(),
      tier,
      status: 'pending',
      currentStep: 'profile',
      attribution,
      draftData: {
        accentColor: '#0e7c66',
        logoEmoji: '🏪',
        attribution,
        spinWheelConfiguration: tier === 'spin' || tier === 'combined' ? [
          { id: 's1', rewardLabel: '10% Off Your Purchase', emoji: '🎁', weight: 35 },
          { id: 's2', rewardLabel: 'Free Beverage Upgrade', emoji: '☕', weight: 35 },
          { id: 's3', rewardLabel: 'Chef Signature Dessert', emoji: '🍰', weight: 20 },
          { id: 's4', rewardLabel: 'VIP Grand Mystery Prize', emoji: '⭐', weight: 10 },
        ] : undefined,
        loyaltyTarget: tier === 'loyalty' || tier === 'combined' ? 6 : undefined,
        loyaltyValidationDays: tier === 'loyalty' || tier === 'combined' ? 60 : undefined,
        loyaltyReward: tier === 'loyalty' || tier === 'combined' ? 'Free Specialty Entree or Gift' : undefined,
      },
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.db.saveOnboardingToken(tokenRecord);

    const getBaseUrl = (): string => {
      if (process.env.APP_URL) {
        return process.env.APP_URL;
      }
      if (process.env.RENDER_EXTERNAL_URL) {
        return process.env.RENDER_EXTERNAL_URL;
      }
      return 'https://www.seyyo.co.in';
    };

    const baseUrl = getBaseUrl().replace(/\/$/, '');
    const setupUrl = `${baseUrl}/setup?token=${rawToken}`;
    return { rawToken, tokenRecord, setupUrl };
  }

  /**
   * Verify the magic link token (rawToken) and create an authorized OnboardingSession
   * so the merchant never has to re-verify the magic link if refreshing or returning later.
   */
  public verifyMagicLink(rawToken: string): { session: OnboardingSession; token: OnboardingToken } {
    const tokenHash = sha256(rawToken);
    const token = this.db.getOnboardingTokenByHash(tokenHash);

    if (!token) {
      throw new Error('INVALID_TOKEN: Magic link token not found');
    }

    const now = new Date().toISOString();
    if (token.expiresAt < now) {
      token.status = 'expired';
      this.db.saveOnboardingToken(token);
      throw new Error('TOKEN_EXPIRED: Magic link has expired (15-minute TTL exceeded)');
    }

    if (token.status === 'completed') {
      throw new Error('TOKEN_ALREADY_USED: Magic link token has already been used');
    }

    // Create an authorized permanent onboarding session for wizard resumability
    const sessionId = generateSecureToken(24);

    const session: OnboardingSession = {
      sessionId,
      tokenId: token.id,
      email: token.email,
      tier: token.tier,
      currentStep: token.currentStep,
      // Permanent session: no 24-hour expiration window so merchant can resume onboarding anytime
    };

    this.db.saveOnboardingSession(session);
    return { session, token };
  }

  /**
   * Resume an ongoing onboarding session
   */
  public getSessionState(sessionId: string): { session: OnboardingSession; token: OnboardingToken } {
    const session = this.db.getOnboardingSession(sessionId);
    if (!session) {
      throw new Error('INVALID_SESSION: Onboarding session not found or expired');
    }

    const token = this.db.getOnboardingTokenById(session.tokenId);
    if (!token) {
      throw new Error('TOKEN_NOT_FOUND: Associated onboarding token not found');
    }

    return { session, token };
  }

  /**
   * Save draft data for a wizard step
   */
  public updateStepData(
    sessionId: string,
    step: OnboardingStepName,
    data: Partial<OnboardingDraftData>,
    nextStep?: OnboardingStepName
  ): { session: OnboardingSession; token: OnboardingToken } {
    const { session, token } = this.getSessionState(sessionId);

    // Merge draft data
    token.draftData = {
      ...token.draftData,
      ...data,
    };

    if (nextStep) {
      token.currentStep = nextStep;
      session.currentStep = nextStep;
    }

    this.db.saveOnboardingToken(token);
    this.db.saveOnboardingSession(session);

    return { session, token };
  }

  /**
   * Launch offer: Complete all server-side revalidations and create Business + Offer + MerchantEntry + StaffSession
   */
  public launchOffer(sessionId: string): { business: Business; offer: Offer; staffSession: StaffSession; defaultStaffPin: string } {
    const { session, token } = this.getSessionState(sessionId);
    const draft = token.draftData;

    // 1. Strict Server-Side Re-validation of Profile
    const profileVal = validateOnboardingProfile(draft);
    if (!profileVal.valid) {
      throw new Error(`Profile validation failed: ${profileVal.error}`);
    }

    // 2. Strict Server-Side Re-validation of Tier Config
    const tierVal = validateTierConfiguration(token.tier, draft);
    if (!tierVal.valid) {
      throw new Error(`Configuration validation failed: ${tierVal.error}`);
    }

    // 3. Strict Server-Side Re-validation of Security
    const secVal = validateOnboardingSecurity(draft);
    if (!secVal.valid) {
      throw new Error(`Security validation failed: ${secVal.error}`);
    }

    // 4. Generate unique business slug
    const baseSlug = (draft.businessName || 'seyo-store')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (this.db.getBusinessBySlug(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    const businessId = `biz_${generateSecureToken(8)}`;
    const nowIso = new Date().toISOString();
    const subscriptionExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const business: Business = {
      id: businessId,
      name: draft.businessName!.trim(),
      slug,
      email: token.email,
      passwordHash: hashPassword(draft.staffPassword!),
      staffPinHash: hashPin(draft.staffPin!),
      tier: token.tier,
      timezone: draft.timezone!.trim(),
      country: draft.country!.trim(),
      city: draft.city!.trim(),
      category: draft.category!.trim(),
      googleReviewUrl: draft.googleReviewUrl?.trim(),
      googlePlaceId: draft.googlePlaceId?.trim(),
      zomatoUrl: draft.zomatoUrl?.trim() || undefined,
      swiggyUrl: draft.swiggyUrl?.trim() || undefined,
      instagramUrl: draft.instagramUrl?.trim() || undefined,
      whatsappNumber: draft.whatsappNumber?.trim() || undefined,
      loyaltyTarget: draft.loyaltyTarget,
      loyaltyValidationDays: draft.loyaltyValidationDays,
      loyaltyReward: draft.loyaltyReward?.trim(),
      spinWheelConfiguration: draft.spinWheelConfiguration,
      active: true,
      nfcSecretKey: generateSecureToken(8),
      logoEmoji: draft.logoEmoji || '🏪',
      logoUrl: draft.logoUrl,
      accentColor: draft.accentColor || '#0e7c66',
      onboardingStep: 'completed',
      referralCode: draft.attribution?.referralCode,
      utmSource: draft.attribution?.utmSource,
      utmCampaign: draft.attribution?.utmCampaign,
      subscriptionExpiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.db.saveBusiness(business);

    // 5. Create active immutable offer
    const offerId = `off_${generateSecureToken(8)}`;
    const offer: Offer = {
      id: offerId,
      businessId,
      title: `${business.name} Grand Engagement Campaign`,
      description: `Official ${token.tier.toUpperCase()} experience for ${business.name}`,
      tier: token.tier,
      status: 'active', // IMMUTABLE
      createdAt: nowIso,
      activatedAt: nowIso,
      durationDays: 365,
      spinWheelConfiguration: business.spinWheelConfiguration,
      loyaltyTarget: business.loyaltyTarget,
      loyaltyValidationDays: business.loyaltyValidationDays,
      loyaltyReward: business.loyaltyReward,
      googleReviewUrl: business.googleReviewUrl,
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

    this.db.saveOffer(offer);

    // 6. Create permanent MerchantEntry identifiers (QR & NFC)
    const permanentQrCode = `${slug.toUpperCase()}-QR`;
    const qrEntry: MerchantEntry = {
      id: `entry_qr_${generateSecureToken(6)}`,
      businessId,
      businessSlug: slug,
      entryType: 'merchant_qr',
      label: 'Dynamic QR',
      permanentCode: permanentQrCode,
      targetTier: token.tier,
      createdAt: nowIso,
    };
    this.db.saveMerchantEntry(qrEntry);

    const permanentNfcCode = `${slug.toUpperCase()}-NFC`;
    const nfcEntry: MerchantEntry = {
      id: `entry_nfc_${generateSecureToken(6)}`,
      businessId,
      businessSlug: slug,
      entryType: token.tier === 'combined' ? 'combined' : 'nfc_tag',
      label: 'Physical NFC Tag',
      permanentCode: permanentNfcCode,
      targetTier: token.tier,
      createdAt: nowIso,
    };
    this.db.saveMerchantEntry(nfcEntry);

    if (token.tier === 'combined') {
      const instantLoyaltyEntry: MerchantEntry = {
        id: `entry_loyalty_${generateSecureToken(6)}`,
        businessId,
        businessSlug: slug,
        entryType: 'loyalty',
        label: 'Express Loyalty NFC Tag',
        permanentCode: `${slug.toUpperCase()}-LOYALTY`,
        targetTier: 'combined',
        createdAt: nowIso,
      };
      this.db.saveMerchantEntry(instantLoyaltyEntry);
    }

    // 7. Mark onboarding completed & burn token permanently
    token.status = 'completed';
    (token as any).isUsed = true;
    token.businessId = businessId;
    token.usedAt = nowIso;
    this.db.saveOnboardingToken(token);

    // 8. Generate authenticated StaffSession for immediate terminal access
    const staffSessionId = generateSecureToken(32);
    const staffSession: StaffSession = {
      sessionId: staffSessionId,
      businessId,
      businessName: business.name,
      businessSlug: business.slug,
      tier: business.tier,
      createdAt: nowIso,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    this.db.saveStaffSession(staffSession);

    return {
      business,
      offer,
      staffSession,
      defaultStaffPin: draft.staffPin!,
    };
  }
}
