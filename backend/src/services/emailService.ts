import nodemailer, { Transporter } from 'nodemailer';

export interface SendOnboardingEmailOptions {
  to: string;
  tier: string;
  setupUrl: string;
  displayAmount?: string;
}

export class EmailService {
  private static instance: EmailService | null = null;
  private transporter: Transporter | null = null;
  private from: string;
  private isConfigured: boolean = false;

  private constructor() {
    const host =
      process.env.SMTP_HOST ||
      process.env.BREVO_SMTP_HOST ||
      'smtp-relay.brevo.com';

    const rawPort =
      process.env.SMTP_PORT ||
      process.env.BREVO_SMTP_PORT ||
      '587';
    const port = parseInt(rawPort, 10);

    const user = (
      process.env.SMTP_USER ||
      process.env.BREVO_SMTP_USER ||
      ''
    ).trim();

    const pass = (
      process.env.SMTP_PASS ||
      process.env.BREVO_SMTP_KEY ||
      ''
    ).trim();

    this.from =
      process.env.EMAIL_FROM ||
      process.env.BREVO_FROM_EMAIL ||
      process.env.SMTP_FROM ||
      'contact@seyyo.co.in';

    if (user && pass) {
      try {
        const isSecure = port === 465;

        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: isSecure,
          auth: {
            user,
            pass,
          },
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
          },
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 45000,
          family: 4,
        } as any);

        this.isConfigured = true;
        console.log(`[EmailService] Nodemailer initialized successfully (host: ${host}, port: ${port}, user: ${user})`);
      } catch (err) {
        console.error('[EmailService] Failed to initialize Nodemailer transporter:', err);
      }
    } else {
      console.warn('[EmailService] SMTP credentials missing. Checked SMTP_USER / BREVO_SMTP_USER.');
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private getTierName(tier: string): string {
    const t = (tier || '').toLowerCase();
    if (t === 'spin' || t === 'spin_tier') return 'Spin Tier';
    if (t === 'loyalty' || t === 'loyalty_tier') return 'Loyalty Tier';
    if (t === 'review' || t === 'review_accelerator') return 'Review Accelerator';
    if (t === 'combined' || t === 'combined_tier') return 'Combined Tier (Spin + Loyalty + Reviews)';
    return tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Standard Tier';
  }

  private getTierAmount(tier: string, displayAmount?: string): string {
    if (displayAmount) {
      return displayAmount.replace(/₹|\?/g, '&#8377;');
    }
    const t = (tier || '').toLowerCase();
    if (t === 'spin' || t === 'spin_tier') return '&#8377;999';
    if (t === 'loyalty' || t === 'loyalty_tier') return '&#8377;1,499';
    if (t === 'review' || t === 'review_accelerator') return '&#8377;799';
    if (t === 'combined' || t === 'combined_tier') return '&#8377;1,999';
    return '&#8377;1,999';
  }

  public async sendOnboardingEmail(
    options: SendOnboardingEmailOptions
  ): Promise<{ success: boolean; mode: 'smtp' | 'fallback-log' }> {
    const { to, tier, setupUrl, displayAmount } = options;
    const tierName = this.getTierName(tier);
    const amountText = this.getTierAmount(tier, displayAmount);

    if (!this.isConfigured || !this.transporter) {
      console.log('================================================================');
      console.log('[EmailService] SMTP credentials not configured (fallback log mode)');
      console.log(`[EmailService] Recipient: ${to}`);
      console.log(`[EmailService] Tier: ${tierName} (${amountText})`);
      console.log(`[EmailService] Setup & Delivery Magic Link: ${setupUrl}`);
      console.log('================================================================');
      return { success: true, mode: 'fallback-log' };
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed! Complete Your Setup</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #10181c;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner with Single Brand Header -->
          <tr>
  <td style="background-color: #147d65; padding: 32px 24px; text-align: center;">
    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
      <tr>
        <td style="vertical-align: middle;">
          <img 
            src="https://www.seyyo.co.in/seyyo-logo.png" 
            alt="seyyo" 
            width="40" 
            height="40" 
            style="display: block; width: 40px; height: 40px; border-radius: 8px; border: 0;" 
          />
        </td>
        <td style="vertical-align: middle; padding-left: 12px;">
          <span style="font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">seyyo</span>
        </td>
      </tr>
    </table>
  </td>
</tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 40px 32px; background-color: #ffffff;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 800; color: #147d65; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.5px;">
                Payment Confirmed! Complete Your Setup
              </h1>

              <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #4b5563; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Thank you for choosing seyyo. Your payment of ${amountText} for the ${tierName} has been successfully processed.
              </p>

              <!-- Primary Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 36px;">
                <tr>
                  <td align="center">
                    <a href="${setupUrl}" target="_blank" style="display: inline-block; background-color: #147d65; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 800; padding: 16px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(20, 125, 101, 0.3); text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Merchant Onboarding
                    </a>
                  </td>
                </tr>
              </table>

              <!-- NFC Dispatch Card -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin: 0 0 16px; text-align: center;">
                <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #334155; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Your plan includes an NFC tag provided as a complimentary promotional benefit by SEYYO, at no additional charge. Please complete the form below to request dispatch of your NFC hardware kit.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="https://forms.gle/2b579PtnR1nDzK3w5" target="_blank" style="display: inline-block; background-color: #f69f1e; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 10px; box-shadow: 0 3px 10px rgba(246, 159, 30, 0.35); text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
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
            <td style="border-top: 1px solid #f1f5f9; padding: 24px 32px; background-color: #ffffff; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                © ${new Date().getFullYear()} seyyo Inc. All rights reserved.<br>
                Need assistance? Contact our merchant support team at <a href="mailto:team@seyyo.co.in" style="color: #147d65; text-decoration: none; font-weight: 600;">team@seyyo.co.in</a>.
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

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: `Payment Confirmed! Complete Your seyyo Setup`,
        html: htmlContent,
        text: `Welcome to seyyo!\n\nYour payment of INR 1,999 for the ${tierName} is confirmed.\n\nMerchant Onboarding:\n${setupUrl}\n\nNFC Hardware Delivery Form:\nhttps://forms.gle/2b579PtnR1nDzK3w5\n\nThank you,\nseyyo Team`,
      });

      console.log(`[EmailService] Onboarding email dispatched successfully to ${to}`);
      return { success: true, mode: 'smtp' };
    } catch (err: any) {
      console.error(`[EmailService] Error dispatching onboarding email to ${to}:`, err);
      throw err;
    }
  }
}