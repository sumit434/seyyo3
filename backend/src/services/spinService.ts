import { MemoryDB } from '../db/MemoryDB';
import { Customer } from '../../../shared/types/customer';
import { Reward } from '../../../shared/types/reward';
import { generateSecureToken, generateVoucherCode, maskMobile, selectWeightedReward } from '../utils/crypto';
import { isSameMerchantDay } from '../utils/timezone';
import { SpinSliceConfig } from '../../../shared/types/business';

export class SpinService {
  private db: MemoryDB;

  constructor() {
    this.db = MemoryDB.getInstance();
  }

  /**
   * Authoritative spin execution
   */
  public executeSpin(businessId: string, customerId: string): { reward: Reward; sliceIndex: number; slice: SpinSliceConfig } {
    const business = this.db.getBusinessById(businessId);
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND');
    }

    if (business.tier !== 'spin' && business.tier !== 'combined') {
      throw new Error('INVALID_TIER: This tier does not support spin rewards');
    }

    const offer = this.db.getActiveOfferByBusinessId(businessId);
    if (!offer || offer.status !== 'active') {
      throw new Error('OFFER_NOT_ACTIVE: No active offer available for spin');
    }

    const customer = this.db.getCustomerById(customerId);
    if (!customer || customer.businessId !== businessId) {
      throw new Error('CUSTOMER_NOT_FOUND: Customer not found or cross-business violation');
    }

    // Check if customer already spun today in merchant timezone
    const now = new Date();
    const tz = business.timezone || 'UTC';
    if (customer.lastSpinAt && isSameMerchantDay(customer.lastSpinAt, now, tz)) {
      throw new Error('SPIN_ALREADY_COMPLETED: You have already spun today. Resets at midnight.');
    }

    // Check if customer already has an active unredeemed voucher
    if (customer.activeVoucher) {
      throw new Error('ACTIVE_VOUCHER_EXISTS: Please have staff redeem your current reward voucher first.');
    }

    const slices = offer.spinWheelConfiguration || business.spinWheelConfiguration;
    if (!slices || slices.length < 2) {
      throw new Error('INVALID_CONFIGURATION: Spin wheel slices not configured');
    }

    // Cryptographically secure weighted selection
    const selectedSlice = selectWeightedReward(slices);
    const sliceIndex = slices.findIndex(s => s.id === selectedSlice.id);

    // Create Reward Record
    const rewardId = `rew_${generateSecureToken(8)}`;
    const voucherCode = generateVoucherCode('SY');
    const nowIso = now.toISOString();

    const reward: Reward = {
      id: rewardId,
      businessId,
      customerId,
      customerName: customer.name,
      customerMobileMasked: maskMobile(customer.mobile),
      code: voucherCode,
      title: selectedSlice.rewardLabel,
      type: 'spin',
      status: 'issued',
      claimedAt: nowIso,
    };

    this.db.saveReward(reward);

    // Update Customer
    customer.lastSpinAt = nowIso;
    customer.totalSpins = (customer.totalSpins || 0) + 1;
    customer.activeVoucher = {
      rewardId,
      code: voucherCode,
      title: selectedSlice.rewardLabel,
      type: 'spin',
      claimedAt: nowIso,
    };
    customer.updatedAt = nowIso;
    this.db.saveCustomer(customer);

    // Update Offer Metrics
    offer.metrics.rewardsIssued += 1;
    this.db.saveOffer(offer);

    return {
      reward,
      sliceIndex,
      slice: selectedSlice,
    };
  }
}
