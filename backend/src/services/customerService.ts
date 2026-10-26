import { Customer } from '../../../shared/types/customer';
import { LoyaltyService } from './loyaltyService';

export class CustomerService {
  /**
   * Format or sanitize customer payload ensuring activeOfferId and cycleStartedAt
   * are explicitly forwarded to downstream responses without stripping them.
   */
  public sanitizeCustomer<T extends Partial<Customer>>(customer: T | null | undefined): (T & { activeOfferId?: string; cycleStartedAt?: string; currentStreak: number; longestStreak?: number }) | null {
    if (!customer) return null;
    const currentStreak = typeof (customer as any).currentStreak === 'number'
      ? (customer as any).currentStreak
      : (((customer.visitCount || 0) > 0 || ((customer as any).totalVisits || 0) > 0) ? 1 : 0);
    return {
      ...customer,
      activeOfferId: customer.activeOfferId,
      cycleStartedAt: customer.cycleStartedAt,
      currentStreak,
      longestStreak: (customer as any).longestStreak ?? currentStreak,
    };
  }

  public formatCustomerPayload(customer: Customer | null): any {
    if (!customer) return null;
    const currentStreak = typeof customer.currentStreak === 'number'
      ? customer.currentStreak
      : (((customer.visitCount || 0) > 0 || (customer.totalVisits || 0) > 0) ? 1 : 0);
    return {
      id: customer.id,
      businessId: customer.businessId,
      name: customer.name,
      mobile: customer.mobile,
      visitCount: customer.visitCount,
      totalVisits: customer.totalVisits,
      currentStreak,
      longestStreak: customer.longestStreak ?? currentStreak,
      vipRank: customer.vipRank,
      streakerRank: customer.streakerRank ?? null,
      rank: customer.rank || customer.vipRank,
      lifetimeRank: customer.lifetimeRank || customer.vipRank,
      activeOfferId: customer.activeOfferId,
      cycleStartedAt: customer.cycleStartedAt,
      lastVisitAt: customer.lastVisitAt,
      lastSpinAt: customer.lastSpinAt,
      totalRewardsClaimed: customer.totalRewardsClaimed,
      totalSpins: customer.totalSpins,
      activeVoucher: customer.activeVoucher,
      reviewJourneyCompleted: customer.reviewJourneyCompleted,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  /**
   * Check for existing unverified stamp claims (status === 'PENDING') on tag scan or customer resolve.
   * Auto-expires pending claim if older than 15 minutes or if skipRedemptionPin setting changed.
   * Ensures daily stamp cooldowns and visit counts only advance upon successful verification (COMPLETED).
   */
  public resolvePendingClaimsOnTagScan(businessId: string, customerId: string): void {
    const loyaltyService = new LoyaltyService();
    loyaltyService.checkAndCleanPendingClaims(businessId, customerId);
  }
}

export const customerBackendService = new CustomerService();

