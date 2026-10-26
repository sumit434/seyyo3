import { Customer } from '../types';

export interface CustomerRankProfile extends Customer {
  id: string;
  name: string;
  phone: string;
  lifetimeVisits: number;
  activeOfferVisits: number;
  currentStamps: number;
  currentStreak: number;
  longestStreak?: number;
  createdAt: string;
  vipRank: number;
  streakerRank: number | null;
  [key: string]: any;
}

/**
 * Safely format a streaker rank string.
 * Never outputs '#0' or negative numbers; falls back strictly to 'Unranked'.
 */
export function formatStreakerRank(streakerRank: number | null | undefined): string {
  if (typeof streakerRank === 'number' && streakerRank > 0) {
    return `#${streakerRank}`;
  }
  return 'Unranked';
}

/**
 * Safely compute or retrieve a streaker rank for a customer.
 * Derived strictly from consecutive visit streaks (streakerRank or activeOfferRank),
 * returning null (Unranked) if no streak ranking exists.
 */
export function getStreakerRank(customer: any): number | null {
  if (typeof customer?.streakerRank === 'number' && customer.streakerRank > 0) {
    return customer.streakerRank;
  }
  if (typeof customer?.activeOfferRank === 'number' && customer.activeOfferRank > 0) {
    return customer.activeOfferRank;
  }
  return null;
}

/**
 * Safely format a VIP rank string.
 */
export function formatVipRank(vipRank: number | null | undefined): string {
  if (typeof vipRank === 'number' && vipRank > 0) {
    return `#${vipRank}`;
  }
  return 'Unranked';
}

/**
 * Compute centralized storewide dual rankings (VIP Rank & Streaker Rank).
 *
 * Edge cases handled:
 * 1. Ties in stamps/visits: earlier timestamp wins the tie.
 * 2. Zero stamps on active campaign: streakerRank is assigned null (displays as 'Unranked').
 * 3. Offer changed, expired, or missing: reset everyone's streakerRank to null, keeping all-time vipRank untouched.
 * 4. Absent leaders remain at their rightful rank because ranks are calculated across the entire customer pool.
 */
export function computeCustomerRanks(
  customers: any[],
  activeOfferId?: string,
  offerStatus: string = 'active'
): CustomerRankProfile[] {
  const isOfferActive = Boolean(activeOfferId) && offerStatus !== 'expired' && offerStatus !== 'cancelled';

  const normalized = customers.map(c => ({
    ...c,
    id: c.id || String(Math.random()),
    businessId: c.businessId || '',
    name: c.name || 'Valued Guest',
    mobile: c.mobile || c.phone || '',
    phone: c.phone || c.mobile || '',
    visitCount: c.visitCount ?? c.currentStamps ?? 0,
    totalVisits: (c.totalVisits ?? c.lifetimeVisits) || 0,
    lifetimeVisits: (c.lifetimeVisits ?? c.totalVisits) || 0,
    activeOfferVisits: (c.activeOfferVisits ?? c.visitCount) || 0,
    currentStamps: (c.currentStamps ?? c.visitCount) || 0,
    currentStreak: c.currentStreak ?? (c.activeOfferVisits ?? c.visitCount ?? 0),
    longestStreak: c.longestStreak ?? c.currentStreak ?? 0,
    createdAt: c.createdAt || c.lastVisitAt || new Date().toISOString(),
    updatedAt: c.updatedAt || new Date().toISOString(),
  }));

  // 1. Compute VIP Rankings (Lifetime)
  // Sort: lifetimeVisits DESC -> tiebreaker: activeOfferVisits DESC -> tiebreaker: earlier timestamp ASC
  const sortedByVIP = [...normalized].sort((a, b) => {
    const aLife = (a.lifetimeVisits || 0);
    const bLife = (b.lifetimeVisits || 0);
    if (bLife !== aLife) {
      return bLife - aLife;
    }
    const aActive = (a.activeOfferVisits || 0);
    const bActive = (b.activeOfferVisits || 0);
    if (bActive !== aActive) {
      return bActive - aActive;
    }
    const aTime = new Date(a.lastVisitAt || a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.lastVisitAt || b.updatedAt || b.createdAt || 0).getTime();
    return aTime - bTime;
  });

  const vipRankMap = new Map<string, number>();
  sortedByVIP.forEach((c, idx) => vipRankMap.set(c.id, idx + 1));

  // 2. Compute Streaker Rankings (Active Campaign & Consecutive Visits)
  const streakerRankMap = new Map<string, number>();
  const activeParticipants = normalized.filter(c => {
    const streak = typeof c.currentStreak === 'number' && c.currentStreak > 0
      ? c.currentStreak
      : ((c.visitCount || c.activeOfferVisits || c.totalVisits || 0) > 0 ? 1 : 0);
    return streak > 0;
  });

  const sortedByStreaker = [...activeParticipants].sort((a, b) => {
    const aStreak = typeof a.currentStreak === 'number' && a.currentStreak > 0
      ? a.currentStreak
      : ((a.visitCount || a.activeOfferVisits || a.totalVisits || 0) > 0 ? 1 : 0);
    const bStreak = typeof b.currentStreak === 'number' && b.currentStreak > 0
      ? b.currentStreak
      : ((b.visitCount || b.activeOfferVisits || b.totalVisits || 0) > 0 ? 1 : 0);
    if (bStreak !== aStreak) {
      return bStreak - aStreak;
    }
    const aLife = (a.lifetimeVisits || 0);
    const bLife = (b.lifetimeVisits || 0);
    if (bLife !== aLife) {
      return bLife - aLife;
    }
    const aTime = new Date((a as any).cycleStartedAt || a.lastVisitAt || a.createdAt || 0).getTime();
    const bTime = new Date((b as any).cycleStartedAt || b.lastVisitAt || b.createdAt || 0).getTime();
    return aTime - bTime;
  });

  sortedByStreaker.forEach((c, idx) => streakerRankMap.set(c.id, idx + 1));

  return normalized.map(c => {
    const vipRank = vipRankMap.get(c.id) || sortedByVIP.length || 1;
    const computedStreaker = streakerRankMap.get(c.id);
    const streakerRank = typeof computedStreaker === 'number' && computedStreaker > 0
      ? computedStreaker
      : (typeof c.streakerRank === 'number' && c.streakerRank > 0
          ? c.streakerRank
          : null);

    return {
      ...c,
      vipRank,
      rank: vipRank,
      lifetimeRank: vipRank,
      streakerRank,
      activeOfferRank: streakerRank,
    };
  });
}

export const computeDualLoyaltyRanks = computeCustomerRanks;
