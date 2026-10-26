import { request } from './api';
import { safeSessionStorage } from '../utils/safeStorage';

export interface DeveloperMerchantSummary {
  id: string;
  slug: string;
  name: string;
  category: string;
  country?: string;
  city?: string;
  tier: string;
  logoEmoji?: string;
  logoUrl?: string;
  accentColor?: string;
  stats: {
    totalGuests: number;
    claimedUsers: number;
    totalReviews: number;
  };
  offer: {
    active: boolean;
    title?: string;
  };
}

export interface DeveloperMerchantsResponse {
  success: boolean;
  totalClients: number;
  merchants: DeveloperMerchantSummary[];
}

export const developerApi = {
  // Authenticate developer using access key
  async authenticate(accessKey: string): Promise<{ success: boolean; token: string }> {
    return request('/api/developer/auth', {
      method: 'POST',
      body: JSON.stringify({ accessKey }),
    });
  },

  // Verify current developer session token
  async verifySession(token: string): Promise<{ success: boolean; authenticated: boolean }> {
    return request('/api/developer/verify', {
      headers: {
        'x-developer-token': token,
      },
    });
  },

  // Fetch all registered merchant business summaries
  async getMerchants(token?: string): Promise<DeveloperMerchantsResponse> {
    const devToken = token || safeSessionStorage.getItem('seyo_developer_token') || '';
    return request<DeveloperMerchantsResponse>('/api/developer/merchants', {
      headers: {
        'x-developer-token': devToken,
      },
    });
  },

  // Developer session sign out
  async logout(token?: string): Promise<void> {
    const devToken = token || safeSessionStorage.getItem('seyo_developer_token') || '';
    try {
      await request('/api/developer/logout', {
        method: 'POST',
        headers: {
          'x-developer-token': devToken,
        },
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      safeSessionStorage.removeItem('seyo_developer_token');
    }
  },
};
