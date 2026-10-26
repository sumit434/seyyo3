import { Request, Response, NextFunction } from 'express';
import { Msg91Service } from '../services/msg91Service';
import { ENABLE_PHONE_OTP, DEFAULT_MOCK_USER } from '../config/auth';

export interface AuthenticatedCustomerRequest extends Request {
  msg91User?: any;
  isOtpBypassed?: boolean;
}

const msg91Service = new Msg91Service();

/**
 * Customer Authentication Middleware with MSG91 phone OTP soft-bypass
 * When ENABLE_PHONE_OTP !== true, missing or mock tokens are accepted gracefully,
 * falling back to DEFAULT_MOCK_USER so customer onboarding is never blocked.
 */
export async function customerAuthMiddleware(
  req: AuthenticatedCustomerRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // 1. If Phone OTP is actively enabled, perform token verification
  if (ENABLE_PHONE_OTP) {
    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'OTP_TOKEN_REQUIRED',
        message: 'Authorization token required',
      });
    }

    try {
      const user = await msg91Service.verifyToken(token);
      req.msg91User = user;
      req.isOtpBypassed = false;
      return next();
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_AUTH_TOKEN',
        message: err.message || 'Invalid or expired auth token',
      });
    }
  }

  // 2. Phone OTP is Muted / Bypassed (ENABLE_PHONE_OTP !== true)
  req.msg91User = {
    ...DEFAULT_MOCK_USER,
    tokenProvided: !!token,
  };
  req.isOtpBypassed = true;

  return next();
}
