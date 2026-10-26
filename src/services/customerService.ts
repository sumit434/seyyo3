import { request } from './api';
import { CustomerStatusResponse, TopRanker } from '../../shared/types/qr';

export const customerService = {
  // Resolve merchant entry from QR/NFC code or slug
  async resolveEntry(identifier: string, type: 'qr' | 'nfc' = 'qr', sessionKey?: string, entryType?: string): Promise<{
    success: boolean;
    isActive: boolean;
    sessionToken?: string;
    sessionKey?: string;
    entryType?: string;
    message?: string;
  } & Partial<CustomerStatusResponse>> {
    let url = `/api/entry/resolve/${encodeURIComponent(identifier)}?type=${type}`;
    if (sessionKey) {
      url += `&sk=${encodeURIComponent(sessionKey)}`;
    }
    if (entryType) {
      url += `&entryType=${encodeURIComponent(entryType)}`;
    }
    return request(url);
  },

  // Refresh status
  async getStatus(slug: string, sessionToken?: string, customerId?: string, entryType?: string): Promise<CustomerStatusResponse> {
    const headers: Record<string, string> = {};
    if (sessionToken) headers['x-customer-session'] = sessionToken;
    if (customerId) headers['x-customer-id'] = customerId;
    if (entryType) headers['x-entry-type'] = entryType;

    let url = `/api/customer/status/${encodeURIComponent(slug)}`;
    if (entryType) {
      url += `?entryType=${encodeURIComponent(entryType)}`;
    }

    return request(url, {
      headers,
    });
  },

  // Execute Spin
  async executeSpin(businessId: string, customerId: string, sessionToken?: string) {
    const headers: Record<string, string> = {};
    if (sessionToken) headers['x-customer-session'] = sessionToken;
    return request('/api/customer/spin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ businessId, customerId }),
    });
  },

  // Stamp Loyalty visit
  async stampLoyalty(
    businessId: string,
    customerId: string,
    sessionToken?: string,
    staffPin?: string,
    requirePin?: boolean,
    entryMode?: string,
    isRushMode?: boolean
  ): Promise<{
    success: boolean;
    milestoneReached: boolean;
    reward?: any;
    customer?: any;
    status?: any;
  } & Partial<CustomerStatusResponse>> {
    const headers: Record<string, string> = {};
    if (sessionToken) headers['x-customer-session'] = sessionToken;
    return request('/api/customer/loyalty/stamp', {
      method: 'POST',
      headers,
      body: JSON.stringify({ businessId, customerId, staffPin, requirePin, entryMode, isRushMode }),
    });
  },

  // Alias for stampLoyalty
  async addVisitStamp(businessId: string, customerId: string, sessionToken?: string) {
    return this.stampLoyalty(businessId, customerId, sessionToken);
  },

  // Persist review before Google handoff
  async persistReview(businessId: string, customerId: string, rating: number, tags: string[], reviewText: string) {
    return request<{
      success: boolean;
      reviewLogId: string;
      googleReviewUrl: string;
    }>('/api/customer/review/persist', {
      method: 'POST',
      body: JSON.stringify({ businessId, customerId, rating, tags, reviewText }),
    });
  },

  // Mark Google review opened
  async markGoogleOpened(reviewLogId: string, customerId: string) {
    return request('/api/customer/review/opened', {
      method: 'POST',
      body: JSON.stringify({ reviewLogId, customerId }),
    });
  },

  // Get Top 5 Loyal Legends
  async getTopRankers(slug: string): Promise<{
    success: boolean;
    businessName: string;
    topRankers: TopRanker[];
  }> {
    return request(`/api/customer/top-rankers/${encodeURIComponent(slug)}`);
  },

  // Redeem voucher on customer phone with staff PIN
  async redeemVoucher(businessId: string, voucherCode: string, staffPin: string) {
    return request<{
      success: boolean;
      message: string;
      reward: any;
    }>('/api/customer/voucher/redeem', {
      method: 'POST',
      body: JSON.stringify({ businessId, voucherCode, staffPin }),
    });
  },

  // Defer voucher to retain active in session while continuing journey to review check
  async deferVoucher(businessId: string, customerId: string) {
    return request<CustomerStatusResponse>('/api/customer/voucher/defer', {
      method: 'POST',
      body: JSON.stringify({ businessId, customerId }),
    });
  },
};
