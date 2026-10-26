import { ProductTier } from '../constants/tiers';

export type PaymentStatus = 'created' | 'attempted' | 'captured' | 'failed';

export interface PaymentRecord {
  id: string;
  businessEmail: string;
  tier: ProductTier;
  amount: number; // in smallest sub-unit (paise for INR, cents for USD)
  currency: string;
  displayAmount: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: PaymentStatus;
  magicLinkUrl?: string;
  magicLinkToken?: string;
  createdAt: string;
  verifiedAt?: string;
  failureReason?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderRequest {
  tier: ProductTier;
  email: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  displayAmount: string;
  keyId: string;
  businessEmail: string;
  tier: ProductTier;
  tierName: string;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  setupUrl?: string;
  rawToken?: string;
  paymentId?: string;
  tier?: ProductTier;
  email?: string;
}
