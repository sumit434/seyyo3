import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ProductTier, PRODUCT_TIERS } from '../../../shared/constants/tiers';
import { paymentApi } from '../../services/paymentApi';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Lock,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTier: ProductTier;
  currency?: 'INR' | 'USD';
}

type PaymentFlowState =
  | 'input'
  | 'creating_order'
  | 'checkout_open'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'cancelled';

const FIXED_RATES: Record<ProductTier, { INR: number; USD: number }> = {
  review: { INR: 499, USD: 6 },
  spin: { INR: 999, USD: 12 },
  loyalty: { INR: 1299, USD: 18 },
  combined: { INR: 1999, USD: 25 },
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  selectedTier,
  currency = 'INR',
}) => {
  const [email, setEmail] = useState('');
  const [flowState, setFlowState] = useState<PaymentFlowState>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [serverPricing, setServerPricing] = useState<{
    displayAmount: string;
    amount: number;
    currency: string;
  } | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Fetch official server pricing on mount or tier/currency change
  useEffect(() => {
    if (isOpen) {
      setFlowState('input');
      setErrorMessage(null);
      setSetupUrl(null);
      setActiveOrderId(null);

      const rate = FIXED_RATES[selectedTier] || FIXED_RATES.combined;
      const price = rate[currency];
      const displayAmount = currency === 'INR' ? `₹${price.toLocaleString('en-IN')}/year` : `$${price}/year`;
      setServerPricing({
        displayAmount,
        amount: price * 100,
        currency,
      });

      paymentApi
        .getConfig()
        .then(cfg => {
          if (cfg.pricing && cfg.pricing[selectedTier]) {
            // Keep currency alignment
          }
        })
        .catch(() => {
          // Fallback if config route has transient delay
        });
    }
  }, [isOpen, selectedTier, currency]);

  // Dynamically load Razorpay SDK
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise(resolve => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid business email address.');
      return;
    }

    setErrorMessage(null);
    setFlowState('creating_order');

    try {
      // 1. Request official Razorpay order from backend with selected currency
      const order = await paymentApi.createOrder(selectedTier, cleanEmail, currency);
      setActiveOrderId(order.orderId);

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Failed to load Razorpay checkout SDK. Please check your internet connection.');
      }

      if (!order.keyId || order.keyId === 'rzp_test_placeholder') {
        throw new Error('Razorpay live key ID is not configured on the server. Please set RAZORPAY_KEY_ID in .env.');
      }

      setFlowState('checkout_open');

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'seyyo Technologies',
        description: `seyyo ${PRODUCT_TIERS[selectedTier]?.name} Merchant License`,
        order_id: order.orderId,
        prefill: {
          email: cleanEmail,
        },
        theme: {
          color: '#0e7c66',
        },
        modal: {
          ondismiss: () => {
            setFlowState('cancelled');
            setErrorMessage('Payment window was closed before completion. You can retry anytime.');
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          await handleVerifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setFlowState('failed');
        setErrorMessage(
          resp.error?.description || 'The transaction was declined by the bank or payment gateway.'
        );
      });
      rzp.open();
    } catch (err: any) {
      setFlowState('failed');
      setErrorMessage(err.message || 'Unable to initialize Razorpay checkout order.');
    }
  };

  const handleVerifyPayment = async (
    orderId: string,
    paymentId: string,
    signature: string
  ) => {
    setFlowState('verifying');
    setErrorMessage(null);

    try {
      const verifyRes = await paymentApi.verifyPayment({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });

      if (verifyRes.success && verifyRes.setupUrl) {
        setSetupUrl(verifyRes.setupUrl);
        setFlowState('success');
      } else {
        setFlowState('failed');
        setErrorMessage(verifyRes.message || 'Payment signature verification failed.');
      }
    } catch (err: any) {
      setFlowState('failed');
      setErrorMessage(
        err.message || 'Payment verification failed. Your setup magic link could not be issued.'
      );
    }
  };

  const tierInfo = PRODUCT_TIERS[selectedTier] || PRODUCT_TIERS.combined;
  const rate = FIXED_RATES[selectedTier] || FIXED_RATES.combined;
  const price = rate[currency];
  const priceFormatted = currency === 'INR' ? `₹${price.toLocaleString('en-IN')}` : `$${price}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        flowState === 'success'
          ? 'Payment Confirmed!'
          : `Subscribe to Seyyo ${tierInfo.name}`
      }
    >
      {/* 1. SUCCESS STATE */}
      {flowState === 'success' && setupUrl && (
        <div className="space-y-5 text-left animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-[#e2f1ec] border border-[#0e7c66]/30 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#0e7c66] text-white mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-[#0e7c66] text-base">Payment Verified Successfully</h4>
            <p className="text-xs text-[#0a6252]">
              Order verified via Razorpay. Your single-use 15-minute onboarding link is ready.
            </p>
          </div>

          <div className="p-3 bg-[#f8faf9] rounded-2xl border border-[#e2e7e6] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a787e]">
              Merchant Account Email
            </span>
            <p className="text-xs font-semibold text-[#10181c]">{email}</p>
          </div>

          <div className="p-3 bg-[#f8faf9] rounded-2xl border border-[#e2e7e6] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a787e]">
              Setup Magic Link
            </span>
            <p className="text-xs font-mono text-[#0e7c66] truncate">{setupUrl}</p>
          </div>

          <a href={setupUrl} className="block pt-1">
            <Button variant="primary" size="lg" fullWidth className="gap-2 shadow-md">
              <span>Merchant Setup</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </a>
        </div>
      )}

      {/* 2. VERIFYING STATE */}
      {flowState === 'verifying' && (
        <div className="py-8 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#0e7c66] animate-spin mx-auto" />
          <h4 className="font-bold text-[#10181c] text-base">Verifying Payment...</h4>
          <p className="text-xs text-[#6a787e] max-w-xs mx-auto">
            Validating cryptographic signature and payment capture with Razorpay. Please do not refresh.
          </p>
        </div>
      )}

      {/* 3. CHECKOUT OPEN WAITING STATE */}
      {flowState === 'checkout_open' && (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0e7c66] mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-[#10181c] text-base">Razorpay Checkout Window Open</h4>
          <p className="text-xs text-[#6a787e] max-w-xs mx-auto">
            Please complete the transaction in the Razorpay popup to verify your merchant license.
          </p>
        </div>
      )}

      {/* 4. FAILED OR CANCELLED STATE */}
      {(flowState === 'failed' || flowState === 'cancelled') && (
        <div className="space-y-4 text-left">
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1.5 text-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto" />
            <h4 className="font-bold text-red-900 text-sm">
              {flowState === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed'}
            </h4>
            <p className="text-xs text-red-700 leading-relaxed">
              {errorMessage || 'Your payment was not completed. No subscription has been activated.'}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setFlowState('input')}
            >
              <span>Try Again</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              onClick={handleStartPayment}
            >
              <span>Retry Payment</span>
            </Button>
          </div>
        </div>
      )}

      {/* 5. INPUT STATE */}
      {(flowState === 'input' || flowState === 'creating_order') && (
        <form onSubmit={handleStartPayment} className="space-y-4 text-left">
          {/* Selected Tier Summary */}
          <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#6a787e] uppercase tracking-wider">
                Plan Selected
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e2f1ec] text-[#0e7c66] font-extrabold uppercase text-[11px]">
                {tierInfo.name}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#10181c]">{priceFormatted}</span>
                <span className="text-xs text-[#6a787e] font-semibold">/ year</span>
              </div>
              <span className="text-[11px] font-semibold text-[#0e7c66] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Instant Onboarding
              </span>
            </div>
          </div>

          {/* Email Input */}
          <Input
            label="Merchant Business Email"
            type="email"
            placeholder="owner@yourbusiness.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            helperText="Your single-use onboarding magic link will be securely delivered to this address."
            required
            autoFocus
          />

          {errorMessage && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {errorMessage}
            </p>
          )}

          {/* Razorpay Trust & Security Badge */}
          <div className="p-3 rounded-2xl bg-[#f1f3f2] border border-[#e2e7e6] flex items-center gap-2.5 text-xs text-[#2a383f]">
            <ShieldCheck className="w-5 h-5 text-[#0e7c66] shrink-0" />
            <span className="font-bold text-[#10181c] text-xs">Secure Online Payment via Razorpay</span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={flowState === 'creating_order'}
            className="shadow-md cursor-pointer justify-center"
          >
            <span>Pay via Razorpay</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>

          {/* Legal / Compliance Links required by Razorpay Onboarding */}
          <div className="pt-2 border-t border-[#e2e7e6] text-center">
            <p className="text-[11px] text-[#6a787e] mb-1.5">
              By proceeding with payment, you agree to SEYYO's policies:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0e7c66] font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                <span>Terms & Conditions</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-[#6a787e]">•</span>
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0e7c66] font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                <span>Privacy Policy</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-[#6a787e]">•</span>
              <a
                href="/refund-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0e7c66] font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                <span>Cancellation & Refund</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
