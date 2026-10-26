import { paymentApi } from './paymentApi';
import { ProductTier } from '../../shared/constants/tiers';
import { VerifyPaymentResponse, CreateOrderResponse } from '../../shared/types/payment';

export const paymentService = {
  getConfig: () => paymentApi.getConfig(),
  getPublicConfig: () => paymentApi.getConfig(),
  createOrder: (tier: ProductTier | string, email: string, currency: 'INR' | 'USD' = 'INR'): Promise<CreateOrderResponse> =>
    paymentApi.createOrder(tier, email, currency),
  verifyPayment: async (payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    tier?: ProductTier | string;
    email?: string;
  }): Promise<VerifyPaymentResponse> => {
    if (!payload.razorpayOrderId || !payload.razorpayPaymentId || !payload.razorpaySignature) {
      throw new Error('Missing required Razorpay credentials for payment verification.');
    }
    return paymentApi.verifyPayment({
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
      razorpaySignature: payload.razorpaySignature,
    });
  },
};

export default paymentService;
