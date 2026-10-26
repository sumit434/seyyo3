import { Router, Request, Response } from 'express';
import { CustomerAuthService } from '../services/customerAuthService';
import { CustomerStatusService } from '../services/customerStatusService';
import { LoyaltyService } from '../services/loyaltyService';
import { MemoryDB } from '../db/MemoryDB';
import { normalizePhone } from '../utils/crypto';
import { getCountryPhoneLength } from '../../../shared/constants/countries';
import { ENABLE_PHONE_OTP } from '../config/auth';

const router = Router();
const authService = new CustomerAuthService();
const statusService = new CustomerStatusService();
const loyaltyService = new LoyaltyService();
const db = MemoryDB.getInstance();

// 1. Send / Request OTP (MSG91 WhatsApp with SMS fallback)
router.post(
  ['/send-otp', '/otp/request', '/customer/send-otp', '/customer/otp/request'],
  async (req: Request, res: Response, next) => {
    try {
      const { businessId, mobile, countryCode, sessionKey, sessionToken } = req.body;
      if (!businessId || !mobile) {
        return res.status(400).json({ success: false, message: 'businessId and mobile are required' });
      }

      const tokenOrKey = sessionKey || sessionToken || (req.headers['x-customer-session'] as string);
      if (!tokenOrKey) {
        return res.status(400).json({
          success: false,
          error: 'SESSION_REQUIRED',
          message: 'A valid QR or NFC session is required. Please scan the QR code.',
        });
      }

      const nationalDigits = String(mobile).replace(/\D/g, '');
      const expectedLen = getCountryPhoneLength(countryCode || '+1');
      if (nationalDigits.length !== expectedLen) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_MOBILE_LENGTH',
          message: `Mobile number must be exactly ${expectedLen} digits for ${countryCode || '+1'}.`,
        });
      }

      const cleanMobile = mobile.replace(/\s+/g, '');
      const fullMobile = cleanMobile.startsWith('+') ? cleanMobile : `${countryCode || '+1'}${cleanMobile}`;

      const session = db.getCustomerSession(tokenOrKey);
      if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
        return res.status(403).json({
          success: false,
          error: 'SESSION_EXPIRED',
          message: 'Token already used or expired',
        });
      }

      if (session.status === 'completed') {
        return res.status(403).json({
          success: false,
          error: 'SESSION_ALREADY_USED',
          message: 'Token already used or expired',
        });
      }

      if (session.status === 'used' && session.customerNumber) {
        const cleanSessionPhone = normalizePhone(session.customerNumber);
        const cleanReqPhone = normalizePhone(fullMobile);
        if (cleanSessionPhone && cleanSessionPhone !== cleanReqPhone) {
          return res.status(403).json({
            success: false,
            error: 'SESSION_ALREADY_USED',
            message: 'Token already used or expired',
          });
        }
      }

      // Feature flag check: If phone OTP is muted, immediately return bypass success
      if (!ENABLE_PHONE_OTP) {
        const existingCustomer = db.getCustomerByBusinessAndMobile(businessId, fullMobile);
        return res.json({
          success: true,
          verified: true,
          bypass: true,
          otpBypassed: true,
          message: 'Phone OTP verification muted by feature flag',
          demoOtp: '123456',
          isExistingCustomer: !!existingCustomer,
        });
      }

      const result = await authService.requestOtp(businessId, mobile, countryCode);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 2. Direct Customer Entry (OTP completely bypassed)
router.post(['/identify', '/customer/identify'], async (req: Request, res: Response, next) => {
  try {
    const { businessId, mobile, phone, name, customerName, countryCode, sessionKey, sessionToken } = req.body;
    const effectiveMobile = mobile || phone;
    const effectiveName = name || customerName;

    // Server-side validation check: name is mandatory and must be at least 2 characters long
    if (!effectiveName || typeof effectiveName !== 'string' || effectiveName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_NAME',
        message: 'Full name is required and must be at least 2 characters long.',
      });
    }

    if (!businessId || !effectiveMobile) {
      return res.status(400).json({ success: false, message: 'businessId and mobile are required' });
    }

    const tokenOrKey = sessionKey || sessionToken || (req.headers['x-customer-session'] as string);
    if (!tokenOrKey) {
      return res.status(400).json({
        success: false,
        error: 'SESSION_REQUIRED',
        message: 'A valid QR or NFC session is required. Please scan the QR code.',
      });
    }

    const nationalDigits = String(mobile).replace(/\D/g, '');
    const expectedLen = getCountryPhoneLength(countryCode || '+1');
    if (nationalDigits.length !== expectedLen) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_MOBILE_LENGTH',
        message: `Mobile number must be exactly ${expectedLen} digits for ${countryCode || '+1'}.`,
      });
    }

    const cleanMobile = mobile.replace(/\s+/g, '');
    const fullMobile = cleanMobile.startsWith('+') ? cleanMobile : `${countryCode || '+1'}${cleanMobile}`;

    // Atomically claim or validate sessionKey
    const claimResult = db.claimSessionKey(tokenOrKey, fullMobile);
    if (!claimResult.success) {
      return res.status(403).json({
        success: false,
        error: claimResult.reason === 'SESSION_EXPIRED' ? 'SESSION_EXPIRED' : 'SESSION_ALREADY_USED',
        message: 'Token already used or expired',
      });
    }

    const session = claimResult.session!;

    const { customer, isNew, sessionToken: finalSessionToken } = await authService.identifyCustomer(
      businessId,
      mobile,
      name,
      countryCode,
      session
    );

    const business = db.getBusinessById(businessId);
    const offer = db.getActiveOfferByBusinessId(businessId);

    // Recompute real-time dual ranks before returning customer payload
    loyaltyService.computeStorewideDualRanks(businessId);
    const freshCustomer = db.getCustomerById(customer.id) || customer;

    const statusPayload = statusService.formatStatusResponse(
      business!,
      offer || null,
      freshCustomer,
      session.entryType
    );

    res.json({
      success: true,
      sessionToken: finalSessionToken,
      sessionKey: session.sessionKey,
      isNew,
      bypass: true,
      ...statusPayload,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Verify OTP / Direct Auth Route
router.post(
  ['/verify-otp', '/otp/verify', '/customer/verify-otp', '/customer/otp/verify'],
  async (req: Request, res: Response, next) => {
    try {
      const { businessId, mobile, phone, otp, name, customerName, countryCode, sessionKey, sessionToken } = req.body;
      const effectiveMobile = mobile || phone;
      const effectiveName = name || customerName;

      // Server-side validation check: name is mandatory and must be at least 2 characters long
      if (!effectiveName || typeof effectiveName !== 'string' || effectiveName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_NAME',
          message: 'Full name is required and must be at least 2 characters long.',
        });
      }

      if (!businessId || !effectiveMobile) {
        return res.status(400).json({ success: false, message: 'businessId and mobile are required' });
      }

      const tokenOrKey = sessionKey || sessionToken || (req.headers['x-customer-session'] as string);
      if (!tokenOrKey) {
        return res.status(400).json({
          success: false,
          error: 'SESSION_REQUIRED',
          message: 'A valid QR or NFC session is required. Please scan the QR code.',
        });
      }

      const nationalDigits = String(mobile).replace(/\D/g, '');
      const expectedLen = getCountryPhoneLength(countryCode || '+1');
      if (nationalDigits.length !== expectedLen) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_MOBILE_LENGTH',
          message: `Mobile number must be exactly ${expectedLen} digits for ${countryCode || '+1'}.`,
        });
      }

      const cleanMobile = mobile.replace(/\s+/g, '');
      const fullMobile = cleanMobile.startsWith('+') ? cleanMobile : `${countryCode || '+1'}${cleanMobile}`;

      // Atomically claim or validate sessionKey
      const claimResult = db.claimSessionKey(tokenOrKey, fullMobile);
      if (!claimResult.success) {
        return res.status(403).json({
          success: false,
          error: claimResult.reason === 'SESSION_EXPIRED' ? 'SESSION_EXPIRED' : 'SESSION_ALREADY_USED',
          message: 'Token already used or expired',
        });
      }

      const session = claimResult.session!;

      let customerResult;
      // When feature flag is disabled: skip OTP challenge generation and immediately create/return customer session
      if (!ENABLE_PHONE_OTP) {
        customerResult = await authService.identifyCustomer(
          businessId,
          mobile,
          name,
          countryCode,
          session
        );
      } else if (otp && otp.trim()) {
        customerResult = await authService.verifyOtp(
          businessId,
          mobile,
          otp,
          name,
          countryCode,
          session
        );
      } else {
        customerResult = await authService.identifyCustomer(
          businessId,
          mobile,
          name,
          countryCode,
          session
        );
      }

      const business = db.getBusinessById(businessId);
      const offer = db.getActiveOfferByBusinessId(businessId);

      // Recompute real-time dual ranks before returning customer payload
      loyaltyService.computeStorewideDualRanks(businessId);
      const freshCustomer = db.getCustomerById(customerResult.customer.id) || customerResult.customer;

      const statusPayload = statusService.formatStatusResponse(
        business!,
        offer || null,
        freshCustomer,
        session.entryType
      );

      res.json({
        success: true,
        sessionToken: customerResult.sessionToken,
        sessionKey: session.sessionKey,
        isNew: customerResult.isNew,
        bypass: !ENABLE_PHONE_OTP,
        ...statusPayload,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
