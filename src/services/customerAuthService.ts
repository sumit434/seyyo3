import { request } from './api';
import { CustomerStatusResponse } from '../../shared/types/qr';

export const customerAuthService = {
  // Direct customer entry without OTP
  async identify(
    businessId: string,
    mobile: string,
    name?: string,
    countryCode: string = '+1',
    sessionKey?: string
  ): Promise<{
    success: boolean;
    sessionToken: string;
    sessionKey?: string;
    isNew: boolean;
    bypass?: boolean;
  } & CustomerStatusResponse> {
    return request('/api/auth/identify', {
      method: 'POST',
      body: JSON.stringify({ businessId, mobile, name, countryCode, sessionKey }),
    });
  },

  // Send OTP via MSG91 (WhatsApp with SMS fallback)
  async sendOtp(
    businessId: string,
    mobile: string,
    countryCode: string = '+1',
    sessionKey?: string,
    name?: string
  ) {
    return request<{
      success: boolean;
      maskedMobile?: string;
      demoOtp?: string;
      isExistingCustomer?: boolean;
      bypass?: boolean;
      verified?: boolean;
      otpBypassed?: boolean;
      message?: string;
    }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ businessId, mobile, countryCode, sessionKey, name }),
    });
  },

  // Backward-compatibility alias
  async requestOtp(businessId: string, mobile: string, countryCode: string = '+1', sessionKey?: string) {
    return this.sendOtp(businessId, mobile, countryCode, sessionKey);
  },

  // Verify OTP via MSG91
  async verifyOtp(
    businessId: string,
    mobile: string,
    otp: string,
    name?: string,
    countryCode: string = '+1',
    sessionKey?: string
  ): Promise<{
    success: boolean;
    sessionToken: string;
    sessionKey?: string;
    isNew: boolean;
    bypass?: boolean;
  } & CustomerStatusResponse> {
    return request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ businessId, mobile, otp, name, countryCode, sessionKey }),
    });
  },
};
