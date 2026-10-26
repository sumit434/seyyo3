import { Router, Request, Response } from 'express';
import { OnboardingService } from '../services/onboardingService';

const router = Router();
const onboardingService = new OnboardingService();

// Trigger magic-link creation (simulating merchant purchase on marketing page)
router.post('/create-magic-link', (req: Request, res: Response, next) => {
  try {
    const { email, tier, attribution } = req.body;
    if (!email || !tier) {
      return res.status(400).json({ success: false, message: 'Email and tier are required' });
    }
    if (!['spin', 'loyalty', 'combined', 'review'].includes(tier)) {
      return res.status(400).json({ success: false, message: 'Invalid tier specified' });
    }
    const result = onboardingService.createMagicLink(email, tier, attribution);
    res.json({
      success: true,
      setupUrl: result.setupUrl,
      rawToken: result.rawToken,
      expiresAt: result.tokenRecord.expiresAt,
      tier: result.tokenRecord.tier,
      email: result.tokenRecord.email,
    });
  } catch (err) {
    next(err);
  }
});

// Verify magic link token and establish authorized onboarding session
router.all(['/verify', '/verify-magic-link'], (req: Request, res: Response, next) => {
  try {
    const token = (req.query.token as string) || req.body?.token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Magic link token is required' });
    }
    const result = onboardingService.verifyMagicLink(token);
    res.json({
      success: true,
      sessionToken: result.session.sessionId,
      tier: result.token.tier,
      email: result.token.email,
      currentStep: result.token.currentStep,
      draftData: result.token.draftData,
    });
  } catch (err) {
    next(err);
  }
});

// Resume onboarding session
router.get('/session-state', (req: Request, res: Response, next) => {
  try {
    const sessionId = (req.headers['x-onboarding-session'] as string) || (req.query.sessionId as string);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }
    const result = onboardingService.getSessionState(sessionId);
    res.json({
      success: true,
      tier: result.token.tier,
      email: result.token.email,
      currentStep: result.token.currentStep,
      draftData: result.token.draftData,
    });
  } catch (err) {
    next(err);
  }
});

// Save draft data for a wizard step
router.put('/step', (req: Request, res: Response, next) => {
  try {
    const sessionId = req.headers['x-onboarding-session'] as string;
    const { step, data, nextStep } = req.body;
    if (!sessionId) {
      return res.status(401).json({ success: false, message: 'Onboarding session header missing' });
    }
    const result = onboardingService.updateStepData(sessionId, step, data, nextStep);
    res.json({
      success: true,
      currentStep: result.token.currentStep,
      draftData: result.token.draftData,
    });
  } catch (err) {
    next(err);
  }
});

// Launch offer & create live business
router.post('/launch', (req: Request, res: Response, next) => {
  try {
    const sessionId = req.headers['x-onboarding-session'] as string;
    if (!sessionId) {
      return res.status(401).json({ success: false, message: 'Onboarding session header missing' });
    }
    const result = onboardingService.launchOffer(sessionId);
    res.json({
      success: true,
      business: {
        id: result.business.id,
        name: result.business.name,
        slug: result.business.slug,
        tier: result.business.tier,
        referralCode: result.business.referralCode,
        utmSource: result.business.utmSource,
        utmCampaign: result.business.utmCampaign,
      },
      offer: {
        id: result.offer.id,
        status: result.offer.status,
      },
      staffSession: result.staffSession,
      defaultStaffPin: result.defaultStaffPin,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
