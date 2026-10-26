import { request } from './api';
import { SubscriptionMeta } from '../../shared/types/business';

export interface TerminalDataResponse {
  success: boolean;
  business: any;
  subscription?: SubscriptionMeta;
  offer: any;
  trackerMetrics?: any;
  metrics?: any;
  entries: any[];
  loyaltyRecords: any[];
  rewards: any[];
  reviews: any[];
  offerHistory: any[];
}

export const staffApi = {
  // Staff login
  async login(identifier: string, password: string) {
    return request('/api/staff/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  // Terminal data
  async getTerminalData(sessionToken: string): Promise<TerminalDataResponse> {
    return request<TerminalDataResponse>('/api/staff/terminal-data', {
      headers: {
        'x-staff-session': sessionToken,
      },
    });
  },

  // Renew merchant subscription
  async renewSubscription(sessionToken: string) {
    return request<{
      success: boolean;
      message: string;
      subscriptionExpiresAt?: string;
    }>('/api/staff/renew-subscription', {
      method: 'POST',
      headers: {
        'x-staff-session': sessionToken,
      },
    });
  },

  // Redeem voucher using 4-digit PIN
  async redeemVoucher(sessionToken: string, voucherCode: string, staffPin: string) {
    return request('/api/staff/redeem-voucher', {
      method: 'POST',
      headers: {
        'x-staff-session': sessionToken,
      },
      body: JSON.stringify({ voucherCode, staffPin }),
    });
  },

  // Delete / cancel active offer
  async deleteOffer(sessionToken: string) {
    return request('/api/staff/delete-offer', {
      method: 'POST',
      headers: {
        'x-staff-session': sessionToken,
      },
    });
  },

  // Cancel offer (alias)
  async cancelOffer(sessionToken: string) {
    return request('/api/staff/delete-offer', {
      method: 'POST',
      headers: {
        'x-staff-session': sessionToken,
      },
    });
  },

  // Get historical offers for business
  async getOfferHistory(sessionToken: string) {
    return request<{ success: boolean; offers: any[] }>('/api/staff/offer-history', {
      headers: {
        'x-staff-session': sessionToken,
      },
    });
  },

  // Activate new campaign/offer matching tier plan
  async activateOffer(sessionToken: string, offerData: any) {
    return request<{ success: boolean; message: string; offer: any }>('/api/staff/activate-offer', {
      method: 'POST',
      headers: {
        'x-staff-session': sessionToken,
      },
      body: JSON.stringify(offerData),
    });
  },

  // Standalone QR code generation
  async getQrCode(url: string) {
    return request<{ success: boolean; qrDataUrl: string }>(`/api/staff/qr-code?url=${encodeURIComponent(url)}`);
  },

  // Refresh Dynamic Counter QR session key
  async refreshQr(sessionToken: string, entryId?: string, entryType?: string) {
    return request<{
      success: boolean;
      sessionKey: string;
      customerUrl: string;
      qrDataUrl: string;
      expiresAt: string;
    }>('/api/staff/qr/refresh', {
      method: 'POST',
      headers: {
        'x-staff-session': sessionToken,
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ entryId, entryType }),
    });
  },

  // Update Merchant Profile and Branding
  async updateProfile(
    sessionToken: string,
    profileData: {
      name?: string;
      logoEmoji?: string;
      logoUrl?: string;
      googleReviewUrl?: string;
      instagramUrl?: string;
      websiteUrl?: string;
      facebookUrl?: string;
      zomatoUrl?: string;
      swiggyUrl?: string;
      accentColor?: string;
      whatsappNumber?: string;
    }
  ) {
    return request<{
      success: boolean;
      message: string;
      business: any;
    }>('/api/staff/profile', {
      method: 'PUT',
      headers: {
        'x-staff-session': sessionToken,
      },
      body: JSON.stringify(profileData),
    });
  },

  // Update Staff Terminal Settings (PIN, Fast Redemption Toggle, WhatsApp)
  async updateSettings(
    sessionToken: string,
    payload: { newStaffPin?: string; skipRedemptionPin?: boolean; whatsappNumber?: string; isRushMode?: boolean }
  ) {
    return request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/staff/settings', {
      method: 'PATCH',
      headers: {
        'x-staff-session': sessionToken,
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
  },

  // Get Merchant Customers list for WhatsApp outreach
  async getMerchantCustomers(sessionToken: string) {
    return request<{
      success: boolean;
      customers: any[];
      business: any;
      offer: any;
    }>('/api/merchant/customers', {
      headers: {
        'x-staff-session': sessionToken,
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  },

  // Get Merchant Settings
  async getMerchantSettings(sessionToken: string) {
    return request<{
      success: boolean;
      settings: any;
      business: any;
    }>('/api/merchant/settings', {
      headers: {
        'x-staff-session': sessionToken,
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  },

  // Update Merchant Settings
  async updateMerchantSettings(
    sessionToken: string,
    payload: { whatsappNumber?: string; newStaffPin?: string; skipRedemptionPin?: boolean; isRushMode?: boolean }
  ) {
    return request<{
      success: boolean;
      message: string;
      settings: any;
      data: any;
    }>('/api/merchant/settings', {
      method: 'PATCH',
      headers: {
        'x-staff-session': sessionToken,
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
};

export const merchantApi = staffApi;

