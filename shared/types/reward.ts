export type RewardType = 'spin' | 'loyalty';
export type RewardStatus = 'issued' | 'redeemed' | 'expired';

export interface Reward {
  id: string;
  businessId: string;
  customerId: string;
  customerName?: string;
  customerMobileMasked?: string;
  code: string; // 6-character alphanumeric voucher code
  title: string;
  type: RewardType;
  status: RewardStatus;
  claimedAt: string; // ISO UTC
  redeemedAt?: string; // ISO UTC
  staffPinVerifiedBy?: string;
}
