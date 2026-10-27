import { useState, useCallback } from 'react';
import { customerAuthService } from '../services/customerAuthService';
import { CustomerStatusResponse } from '../../shared/types/qr';

export type AuthMode = 'msg91_otp' | 'seyo_direct';

export interface UseAuthModeReturn {
  authMode: AuthMode;
  isOtpBypassed: boolean;
  isLoading: boolean;
  error: string | null;
  sendOtp: (businessId: string, mobile: string, countryCode?: string) => Promise<{
    maskedMobile?: string;
    demoOtp?: string;
    isExistingCustomer?: boolean;
    bypass?: boolean;
  }>;
  verifyOtp: (
    businessId: string,
    mobile: string,
    otp: string,
    name?: string,
    countryCode?: string
  ) => Promise<{
    sessionToken: string;
    isNew: boolean;
  } & CustomerStatusResponse>;
  quickMockLogin: (
    businessId: string,
    name?: string
  ) => Promise<{
    sessionToken: string;
    isNew: boolean;
  } & CustomerStatusResponse>;
}

/**
 * Authentication Abstraction Layer Hook (useAuthMode)
 * Allows the authentication provider to switch between live MSG91 phone OTP
 * and SEYYO direct inline verification seamlessly, with automatic soft-bypass
 * for smooth local customer onboarding.
 */
export function useAuthMode(): UseAuthModeReturn {
  const [authMode] = useState<AuthMode>('msg91_otp');
  // In development, OTP is soft-disabled/bypassed by default
  const [isOtpBypassed] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = useCallback(
    async (businessId: string, mobile: string, countryCode: string = '+1') => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await customerAuthService.sendOtp(businessId, mobile, countryCode);
        return {
          maskedMobile: res.maskedMobile,
          demoOtp: res.demoOtp,
          isExistingCustomer: res.isExistingCustomer,
          bypass: res.bypass,
        };
      } catch (err: any) {
        const msg = err.message || 'Failed to send verification code';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (
      businessId: string,
      mobile: string,
      otp: string,
      name?: string,
      countryCode: string = '+1'
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await customerAuthService.verifyOtp(businessId, mobile, otp, name, countryCode);
        return res;
      } catch (err: any) {
        const msg = err.message || 'Verification failed';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const quickMockLogin = useCallback(
    async (businessId: string, name: string = 'Dev Customer') => {
      return verifyOtp(businessId, '+15551234567', '123456', name, '+1');
    },
    [verifyOtp]
  );

  return {
    authMode,
    isOtpBypassed,
    isLoading,
    error,
    sendOtp,
    verifyOtp,
    quickMockLogin,
  };
}
