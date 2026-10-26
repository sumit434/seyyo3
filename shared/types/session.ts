import { ProductTier } from '../constants/tiers';

export interface StaffSession {
  sessionId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  tier: ProductTier;
  createdAt: string;
  expiresAt: string;
}
