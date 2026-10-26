import express, { Express } from 'express';
import onboardingRoutes from './routes/onboardingRoutes';
import entryRoutes from './routes/entryRoutes';
import customerAuthRoutes from './routes/customerAuth';
import customerRoutes from './routes/customerRoutes';
import staffRoutes from './routes/staffRoutes';
import merchantRoutes from './routes/merchantRoutes';
import paymentRoutes from './routes/paymentRoutes';
import developerRoutes from './routes/developerRoutes';
import { errorMiddleware } from './middleware/errorMiddleware';
import { MemoryDB } from './db/MemoryDB';

export function createExpressApp(): Express {
  const app = express();

  // Enable reverse proxy trust immediately after Express initialization to handle SSL termination and edge headers
  app.set('trust proxy', 1);

  // Middleware with rawBody preservation for payment webhooks
  app.use(
    express.json({
      limit: '5mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Security Headers & CORS
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      platform: 'seyyo Merchant & Customer Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Routes
  app.use('/api/onboarding', onboardingRoutes);
  app.use(['/api/payments', '/api/payment'], paymentRoutes);
  app.use('/api/entry', entryRoutes);
  // Conceptual shorthand /tap/:slug redirects to /api/entry/tap/:slug
  app.use('/tap', (req, res) => {
    res.redirect(302, `/api/entry/tap${req.url}`);
  });
  // Live test or direct entry shortcut /entry?sk=... redirects to customer path
  app.get('/entry', (req, res) => {
    const sk = (req.query.sk || req.query.sessionKey || req.query.key) as string | undefined;
    if (sk) {
      const session = MemoryDB.getInstance().getCustomerSession(sk);
      if (session) {
        const business = MemoryDB.getInstance().getBusinessById(session.businessId);
        if (business) {
          const isLoyalty = session.entryType === 'loyalty' || session.entryType === 'loyalty_express';
          const targetPath = isLoyalty ? `/c/${business.slug}/loyalty` : `/c/${business.slug}/v`;
          const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
          return res.redirect(302, `${targetPath}${query}`);
        }
      }
    }
    return res.redirect(302, '/');
  });
  app.use('/api/auth', customerAuthRoutes);
  app.use('/api/customer', customerRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/merchant', merchantRoutes);
  app.use('/api/developer', developerRoutes);

  // Central Error Handler
  app.use(errorMiddleware);

  return app;
}
