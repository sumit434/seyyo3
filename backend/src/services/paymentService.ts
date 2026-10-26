import crypto from 'crypto';
import Razorpay from 'razorpay';
import { MemoryDB } from '../db/MemoryDB';
import { OnboardingService } from './onboardingService';
import { EmailService } from './emailService';
import { ProductTier, PRODUCT_TIERS } from '../../../shared/constants/tiers';
import { PaymentRecord, CreateOrderResponse, VerifyPaymentResponse } from '../../../shared/types/payment';
import { generateSecureToken } from '../utils/crypto';
import { PRICING_PLANS, TIER_TO_PLAN_KEY, CurrencyCode } from '../config/pricingPlans';

// Server-authoritative pricing configuration (amounts in smallest unit: paise for INR, cents for USD)
export const SERVER_TIER_PRICING: Record<
  ProductTier,
  {
    amount: number; // in paise
    currency: string;
    displayAmount: string;
    name: string;
  }
> = {
  spin: {
    amount: 99900,
    currency: 'INR',
    displayAmount: '₹999',
    name: 'Spin Tier',
  },
  loyalty: {
    amount: 129900,
    currency: 'INR',
    displayAmount: '₹1,299',
    name: 'Loyalty Tier',
  },
  review: {
    amount: 49900,
    currency: 'INR',
    displayAmount: '₹499',
    name: 'Review',
  },
  combined: {
    amount: 199900,
    currency: 'INR',
    displayAmount: '₹1,999',
    name: 'Combined Tier',
  },
};

export class PaymentService {
  private db: MemoryDB;
  private onboardingService: OnboardingService;
  private emailService: EmailService;
  private razorpayInstance: Razorpay | null = null;
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private isConfigured: boolean = false;

  constructor() {
    this.db = MemoryDB.getInstance();
    this.onboardingService = new OnboardingService();
    this.emailService = EmailService.getInstance();

    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'seyyo_webhook_secret_dev';

    if (
      this.keyId &&
      this.keySecret &&
      this.keyId !== 'rzp_test_placeholder' &&
      !this.keyId.includes('YOUR_')
    ) {
      try {
        this.razorpayInstance = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret,
        });
        this.isConfigured = true;
      } catch (err) {
        console.error('[PaymentService] Failed to initialize Razorpay SDK:', err);
      }
    }
  }

  public getPublicConfig() {
    return {
      keyId: this.keyId,
      isLiveConfigured: this.isConfigured,
      currency: 'INR',
      pricing: SERVER_TIER_PRICING,
      pricingPlans: PRICING_PLANS,
    };
  }

  /**
   * Create Razorpay Order with server-enforced amount
   */
  public async createOrder(
    tier: ProductTier | string,
    email: string,
    currencyInput?: string
  ): Promise<CreateOrderResponse> {
    const rawCurrency = (currencyInput || 'INR').toUpperCase();
    const currency: CurrencyCode = rawCurrency === 'USD' ? 'USD' : 'INR';

    // Standardize tier / plan ID
    const planKey = TIER_TO_PLAN_KEY[tier] || tier;
    const planPricing = PRICING_PLANS[planKey];

    if (!planPricing) {
      throw new Error(`Invalid plan or tier requested: ${tier}`);
    }

    const price = planPricing[currency];
    const amount = price * 100; // paise for INR, cents for USD
    const displayAmount = currency === 'INR' ? `₹${price.toLocaleString('en-IN')}` : `$${price}`;

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('A valid merchant email is required to associate payment and magic link');
    }

    const tierKey: ProductTier = (
      tier === 'review_accelerator' ? 'review' :
      tier === 'spin_tier' ? 'spin' :
      tier === 'loyalty_tier' ? 'loyalty' :
      tier === 'combined_tier' ? 'combined' :
      tier
    ) as ProductTier;

    const tierName =
      tierKey === 'review' ? 'Review' :
      tierKey === 'spin' ? 'Spin Tier' :
      tierKey === 'loyalty' ? 'Loyalty Tier' :
      'Combined Tier';

    const receipt = `rcpt_${tierKey}_${Date.now()}`;
    let orderId = '';

    if (this.razorpayInstance && this.isConfigured) {
      try {
        const order = await this.razorpayInstance.orders.create({
          amount,
          currency,
          receipt,
          notes: {
            tier: tierKey,
            planId: planKey,
            email: normalizedEmail,
            currency,
            service: 'seyyo Platform Merchant License',
          },
        });
        orderId = order.id;
      } catch (err: any) {
        console.error('[PaymentService] Razorpay order creation failed:', err);
        throw new Error(err.error?.description || err.message || 'Razorpay order creation failed');
      }
    } else {
      // Sandbox fallback order for development/demo review
      orderId = `order_${generateSecureToken(14)}`;
    }

    const paymentRecord: PaymentRecord = {
      id: `pay_${generateSecureToken(12)}`,
      businessEmail: normalizedEmail,
      tier: tierKey,
      amount,
      currency,
      displayAmount,
      razorpayOrderId: orderId,
      status: 'created',
      createdAt: new Date().toISOString(),
      notes: {
        receipt,
        currency,
        planKey,
      },
    };

    this.db.savePayment(paymentRecord);

    return {
      success: true,
      orderId,
      amount,
      currency,
      displayAmount,
      keyId: this.keyId,
      businessEmail: normalizedEmail,
      tier: tierKey,
      tierName,
    };
  }

  /**
   * Verify Razorpay Payment Signature, Amount, and Issue Setup Magic Link
   */
  public async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<VerifyPaymentResponse> {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      const err: any = new Error('Razorpay order ID, payment ID, and signature are required for verification');
      err.statusCode = 400;
      throw err;
    }

    const payment = this.db.getPaymentByOrderId(razorpayOrderId);
    if (!payment) {
      const err: any = new Error('Payment record not found for the supplied Razorpay order ID');
      err.statusCode = 404;
      throw err;
    }

    // Idempotent: If already captured, return the existing magic link
    if (payment.status === 'captured' && payment.magicLinkUrl) {
      return {
        success: true,
        message: 'Payment already verified',
        setupUrl: payment.magicLinkUrl,
        rawToken: payment.magicLinkToken,
        paymentId: payment.id,
        tier: payment.tier,
        email: payment.businessEmail,
      };
    }

    // Strict HMAC-SHA256 Cryptographic Signature Verification
    const secret = this.keySecret || process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      const err: any = new Error('Razorpay live key secret is not configured on the server. Signature verification failed.');
      err.statusCode = 403;
      throw err;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const signatureBuffer = Buffer.from(razorpaySignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    const isMatch =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isMatch) {
      payment.status = 'failed';
      payment.failureReason = 'Cryptographic signature mismatch';
      this.db.savePayment(payment);
      const err: any = new Error('Invalid Razorpay signature. Payment verification failed.');
      err.statusCode = 403;
      throw err;
    }

    // Backend verification against Razorpay API
    if (this.razorpayInstance) {
      try {
        const paymentDetails: any = await this.razorpayInstance.payments.fetch(razorpayPaymentId);
        
        // Verify exact amount and currency from trusted Razorpay server response
        if (paymentDetails.amount !== payment.amount) {
          payment.status = 'failed';
          payment.failureReason = `Amount mismatch: expected ${payment.amount}, received ${paymentDetails.amount}`;
          this.db.savePayment(payment);
          const err: any = new Error('Payment amount verification failed');
          err.statusCode = 400;
          throw err;
        }

        if (paymentDetails.currency !== payment.currency) {
          payment.status = 'failed';
          payment.failureReason = `Currency mismatch: expected ${payment.currency}, received ${paymentDetails.currency}`;
          this.db.savePayment(payment);
          const err: any = new Error('Payment currency verification failed');
          err.statusCode = 400;
          throw err;
        }

        if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
          payment.status = 'failed';
          payment.failureReason = `Unexpected payment status: ${paymentDetails.status}`;
          this.db.savePayment(payment);
          const err: any = new Error(`Payment is not in captured status (${paymentDetails.status})`);
          err.statusCode = 400;
          throw err;
        }
      } catch (fetchErr: any) {
        if (fetchErr.statusCode) throw fetchErr;
        console.error('[PaymentService] Error fetching Razorpay payment details:', fetchErr);
        const err: any = new Error('Failed to verify payment status with Razorpay gateway');
        err.statusCode = 400;
        throw err;
      }
    }

    // Payment successfully verified!
    payment.status = 'captured';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.verifiedAt = new Date().toISOString();

    // Generate single-use setup magic link for the merchant
    const magicLinkResult = this.onboardingService.createMagicLink(payment.businessEmail, payment.tier);
    payment.magicLinkUrl = magicLinkResult.setupUrl;
    payment.magicLinkToken = magicLinkResult.rawToken;

    this.db.savePayment(payment);

    // Asynchronously send merchant onboarding & hardware delivery email
    this.emailService
      .sendOnboardingEmail({
        to: payment.businessEmail,
        tier: payment.tier,
        setupUrl: payment.magicLinkUrl,
        displayAmount: payment.displayAmount,
      })
      .catch((err) => {
        console.error('[PaymentService] Failed to send onboarding email during verification:', err);
      });

    return {
      success: true,
      message: 'Payment verified successfully. Onboarding magic link generated.',
      setupUrl: payment.magicLinkUrl,
      rawToken: payment.magicLinkToken,
      paymentId: payment.id,
      tier: payment.tier,
      email: payment.businessEmail,
    };
  }

  /**
   * Handle Razorpay Webhooks idempotently
   */
  public async handleWebhook(rawBody: string | Buffer, signature: string): Promise<{ received: boolean }> {
    if (!this.webhookSecret) {
      console.warn('[PaymentService] Webhook received but RAZORPAY_WEBHOOK_SECRET is not configured');
      return { received: true };
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid webhook signature');
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf-8'));
    const eventType = event.event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const orderId = event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id;
      const paymentId = event.payload?.payment?.entity?.id;

      if (orderId) {
        const payment = this.db.getPaymentByOrderId(orderId);
        if (payment && payment.status !== 'captured') {
          payment.status = 'captured';
          payment.razorpayPaymentId = paymentId || payment.razorpayPaymentId;
          payment.verifiedAt = new Date().toISOString();

          if (!payment.magicLinkUrl) {
            const magicLinkResult = this.onboardingService.createMagicLink(payment.businessEmail, payment.tier);
            payment.magicLinkUrl = magicLinkResult.setupUrl;
            payment.magicLinkToken = magicLinkResult.rawToken;
          }

          this.db.savePayment(payment);

          // Asynchronously send merchant onboarding & hardware delivery email
          this.emailService
            .sendOnboardingEmail({
              to: payment.businessEmail,
              tier: payment.tier,
              setupUrl: payment.magicLinkUrl!,
              displayAmount: payment.displayAmount,
            })
            .catch((err) => {
              console.error('[PaymentService] Failed to send onboarding email from webhook:', err);
            });
        }
      }
    } else if (eventType === 'payment.failed') {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) {
        const payment = this.db.getPaymentByOrderId(orderId);
        if (payment && payment.status !== 'captured') {
          payment.status = 'failed';
          payment.failureReason = event.payload?.payment?.entity?.error_description || 'Payment failed';
          this.db.savePayment(payment);
        }
      }
    }

    return { received: true };
  }
}
