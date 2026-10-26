import { request } from './api';
import { ProductTier } from '../../shared/constants/tiers';
import {
  CreateOrderResponse,
  VerifyPaymentResponse,
} from '../../shared/types/payment';

export interface PaymentPublicConfig {
  success: boolean;
  keyId: string;
  isLiveConfigured: boolean;
  currency: string;
  pricing: Record<
    ProductTier,
    {
      amount: number;
      currency: string;
      displayAmount: string;
      name: string;
    }
  >;
}

export const paymentApi = {
  // Get public payment configuration & server-enforced pricing
  async getConfig(): Promise<PaymentPublicConfig> {
    return request<PaymentPublicConfig>('/api/payments/config');
  },

  // Create Razorpay Order server-side
  async createOrder(tier: ProductTier | string, email: string, currency: 'INR' | 'USD' = 'INR'): Promise<CreateOrderResponse> {
    return request<CreateOrderResponse>('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ tier, planId: tier, email, currency }),
    });
  },

  // Verify payment signature & capture server-side
  async verifyPayment(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<VerifyPaymentResponse> {
    return request<VerifyPaymentResponse>('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
