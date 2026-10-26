import dotenv from 'dotenv';
dotenv.config();

export interface Msg91Config {
  enablePhoneOtp: boolean;
  authKey: string;
  templateId: string;
  integratedNumber: string;
}

export const authConfig: Msg91Config = {
  // Master toggle: default false keeps customer onboarding frictionless
  enablePhoneOtp: process.env.ENABLE_PHONE_OTP === 'true',
  authKey: process.env.MSG91_AUTH_KEY || '',
  templateId: process.env.MSG91_OTP_TEMPLATE_ID || '',
  integratedNumber: process.env.MSG91_INTEGRATED_NUMBER || '',
};

export const ENABLE_PHONE_OTP = authConfig.enablePhoneOtp;

// Fallback mock customer user used when OTP is in muted/bypass mode
export const DEFAULT_MOCK_USER = {
  sub: 'msg91|mock-dev-customer-001',
  name: 'Dev Guest',
  phone_number: '+15551234567',
  verified: true,
  updated_at: new Date().toISOString(),
};
