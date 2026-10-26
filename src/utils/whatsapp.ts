export function generateUserCheckMessage({
  customerName,
  businessName,
  vipRank,
  totalVisits,
  streakerRank,
  currentStamps,
  maxStamps,
}: {
  customerName: string;
  businessName: string;
  vipRank: number;
  totalVisits: number;
  streakerRank: number | string | null;
  currentStamps: number;
  maxStamps: number;
}): string {
  const streakerText = streakerRank ? `#${streakerRank}` : 'unranked';

  return `Hi ${customerName}! You're our VIP #${vipRank} loyal guests at ${businessName}! with Total visits of ${totalVisits}. You have Streaker Rank ${streakerText} with ${currentStamps}/${maxStamps} stamps toward your next reward. Keep up the streak—we love having you!`;
}
