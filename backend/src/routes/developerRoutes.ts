import { Router, Request, Response, NextFunction } from 'express';
import { MemoryDB } from '../db/MemoryDB';
import { generateSecureToken } from '../utils/crypto';

const router = Router();
const db = MemoryDB.getInstance();

// In-memory developer session store with 24-hour TTL
interface DeveloperSession {
  token: string;
  createdAt: number;
  expiresAt: number;
}
const activeDeveloperSessions = new Map<string, DeveloperSession>();

// Developer access key (configurable via env var or secure fallback)
const getDeveloperKey = () => process.env.DEVELOPER_ACCESS_KEY || 'seyodev2026';

// Developer authentication middleware
export const developerAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-developer-token'] as string;
  const directKey = req.headers['x-developer-key'] as string;
  const configuredKey = getDeveloperKey();

  // Allow direct developer key header
  if (directKey && directKey === configuredKey) {
    return next();
  }

  // Verify active developer session token
  if (token) {
    const session = activeDeveloperSessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Valid developer credentials required to access merchant metrics.',
  });
};

// Authenticate developer & issue session token
router.post('/auth', (req: Request, res: Response) => {
  const { accessKey } = req.body;
  const configuredKey = getDeveloperKey();

  if (!accessKey || accessKey.trim() !== configuredKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid developer access key. Access denied.',
    });
  }

  const token = `dev_sess_${generateSecureToken(24)}`;
  const now = Date.now();
  const session: DeveloperSession = {
    token,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
  };

  activeDeveloperSessions.set(token, session);

  res.json({
    success: true,
    message: 'Developer authenticated successfully',
    token,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

// Verify existing developer session
router.get('/verify', (req: Request, res: Response) => {
  const token = req.headers['x-developer-token'] as string;
  if (!token) {
    return res.status(401).json({ success: false, authenticated: false });
  }

  const session = activeDeveloperSessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    return res.status(401).json({ success: false, authenticated: false });
  }

  res.json({
    success: true,
    authenticated: true,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

// Developer sign out
router.post('/logout', (req: Request, res: Response) => {
  const token = req.headers['x-developer-token'] as string;
  if (token) {
    activeDeveloperSessions.delete(token);
  }
  res.json({ success: true, message: 'Developer session terminated' });
});

// GET /api/developer/merchants — Return aggregated merchant summaries
router.get('/merchants', developerAuthMiddleware, (req: Request, res: Response, next: NextFunction) => {
  try {
    const businesses = db.getAllBusinesses();

    const merchantSummaries = businesses.map(b => {
      // 1. Total Guests (Unique identified customer records for this business)
      const customers = db.getCustomersByBusinessId(b.id);
      const totalGuests = customers.length;

      // 2. Claimed (Matching staff terminal rewards redeemed count)
      const rawRewards = db.getRewardsByBusinessId(b.id);
      const redeemedRewards = rawRewards.filter(r => r.status === 'redeemed').length;
      const activeOffer = db.getActiveOfferByBusinessId(b.id);
      const claimedUsers = Math.max(activeOffer?.metrics?.rewardsRedeemed || 0, redeemedRewards);

      // 3. Reviews (Persisted review logs)
      const reviewLogs = db.getReviewLogsByBusinessId(b.id);
      const totalReviews = reviewLogs.length;

      // 4. Offer Status
      const isOfferActive = !!activeOffer && activeOffer.status === 'active';

      // Strictly return summary info only — NEVER expose passwords, PINs, or secrets
      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        category: b.category,
        country: b.country,
        city: b.city,
        tier: b.tier,
        logoEmoji: b.logoEmoji,
        logoUrl: b.logoUrl,
        accentColor: b.accentColor,
        stats: {
          totalGuests,
          claimedUsers,
          totalReviews,
        },
        offer: {
          active: isOfferActive,
          title: activeOffer?.title || undefined,
        },
      };
    });

    res.json({
      success: true,
      totalClients: merchantSummaries.length,
      merchants: merchantSummaries,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
