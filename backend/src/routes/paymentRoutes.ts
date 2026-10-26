import { Router, Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService';

const router = Router();
const paymentService = new PaymentService();

// Get public payment configuration (Razorpay key_id and tier pricing)
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    ...paymentService.getPublicConfig(),
  });
});

// Create Razorpay Order
router.post('/create-order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tier, planId, email, currency } = req.body;
    const effectiveTierOrPlan = planId || tier;

    if (!effectiveTierOrPlan || !email) {
      return res.status(400).json({
        success: false,
        message: 'Tier/planId and merchant email are required',
      });
    }

    const orderData = await paymentService.createOrder(effectiveTierOrPlan, email, currency);
    res.json(orderData);
  } catch (err: any) {
    next(err);
  }
});

// Verify Payment and Issue Setup Magic Link (Strict Verification, No Bypass)
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay order ID, payment ID, and signature are required for verification',
      });
    }

    const result = await paymentService.verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    res.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || (err.message?.toLowerCase().includes('signature') ? 403 : 400);
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Payment verification failed',
    });
  }
});

// Razorpay Webhook
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing x-razorpay-signature header',
      });
    }
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const result = await paymentService.handleWebhook(rawBody, signature);
    res.json(result);
  } catch (err: any) {
    console.error('[PaymentRoutes] Webhook verification error:', err.message);
    res.status(400).json({
      success: false,
      message: err.message || 'Webhook verification failed',
    });
  }
});

export default router;
