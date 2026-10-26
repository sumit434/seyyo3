import { createServer as createViteServer } from 'vite';
import path from 'path';
import express from 'express';
import { createExpressApp } from './backend/src/app';
import { connectMongo } from './backend/src/db/connection';
import { MemoryDB } from './backend/src/db/MemoryDB';

async function startServer() {
  // Connect to MongoDB with non-blocking fallback
  const isMongoConnected = await connectMongo();
  if (isMongoConnected) {
    await MemoryDB.getInstance().hydrateFromMongo();
  }

  const app = createExpressApp();
  // Bind Express dynamically to process.env.PORT with fallback to 3000 for local execution
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[seyyo Engine] Running on http://0.0.0.0:${port}`);
  });
}

/**
 * Payment & Onboarding Email HTML Template
 * Sent to merchants after successful payment confirmation.
 */
export function getPaymentConfirmationEmailTemplate(setupLink: string = 'http://localhost:3000/setup'): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed! Complete Your Setup</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #10181c;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);">
          
          <!-- 1. Header Branding with Official Logo Mark & seyyo Text -->
          <tr>
            <td style="background-color: #0b1311; padding: 32px 24px; text-align: center; border-bottom: 2px solid #10B981;">
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align: middle;">
                    <svg width="38" height="38" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                      <rect width="100" height="100" rx="24" fill="#10B981" />
                      <path d="M68 34C68 28.5 63.5 24 58 24H42C33.2 24 26 31.2 26 40C26 48.8 33.2 56 42 56H58C61.3 56 64 58.7 64 62C64 65.3 61.3 68 58 68H32M32 66C32 71.5 36.5 76 42 76H58C66.8 76 74 68.8 74 60C74 51.2 66.8 44 58 44H42C38.7 44 36 41.3 36 38C36 34.7 38.7 32 42 32H68" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <span style="font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">seyyo</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 40px 32px; background-color: #ffffff;">
              <!-- 2. Heading in Brand Emerald Green (#10B981) -->
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 800; color: #10B981; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.5px;">
                Payment Confirmed! Complete Your Setup
              </h1>

              <!-- 2. Subtitle Center-Aligned -->
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #4b5563; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Thank you for choosing seyyo. Your payment of ₹1,999 for the Combined Tier (Spin + Loyalty + Reviews) has been successfully processed.
              </p>

              <!-- 3. Primary Action Button (Complete Merchant Setup) -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 36px;">
                <tr>
                  <td align="center">
                    <a href="${setupLink}" target="_blank" style="display: inline-block; background-color: #10B981; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 800; padding: 16px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Complete Merchant Setup
                    </a>
                  </td>
                </tr>
              </table>

              <!-- 5. NFC Dispatch Section (Relocated Below Primary Button) -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin: 0 0 16px; text-align: center;">
                <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #166534; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  NFC Hardware Delivery: Your package includes custom smart NFC tags. Completing this form via the link below allows our team to immediately dispatch your NFC hardware kit.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="https://forms.gle/2b579PtnR1nDzK3w5" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 10px; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25); text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        NFC Tags Dispatch
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding: 24px 32px; background-color: #f9fafb; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                © ${new Date().getFullYear()} seyyo Inc. All rights reserved.<br>
                Need assistance? Contact our merchant support team at <a href="mailto:team.seyyo@gmail.com" style="color: #10B981; text-decoration: none; font-weight: 600;">team.seyyo@gmail.com</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export const getOnboardingEmailTemplate = getPaymentConfirmationEmailTemplate;
export const generateOnboardingEmailHtml = getPaymentConfirmationEmailTemplate;

startServer().catch(err => {
  console.error('[seyyo Server] Failed to start:', err);
  process.exit(1);
});
