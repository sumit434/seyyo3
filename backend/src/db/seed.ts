import { hashPassword, hashPin } from '../utils/crypto';
import { Business } from '../../../shared/types/business';
import { Offer } from '../../../shared/types/offer';
import { MerchantEntry } from '../../../shared/types/qr';
import { Customer } from '../../../shared/types/customer';
import { Reward } from '../../../shared/types/reward';
import { ReviewLog } from '../../../shared/types/review';

export type SeedBusiness = Business & { countryCode?: string };

export function createInitialSeedData() {
  const defaultPasswordHash = hashPassword('password123');
  const defaultPinHash = hashPin('7788');

  // ==========================================
  // BUSINESS 1: Combined Tier - "Bella Napoli Pizzeria"
  // ==========================================
  const business1: SeedBusiness = {
    id: 'biz_bella_napoli',
    name: 'Bella Napoli Pizzeria',
    slug: 'bella-napoli',
    email: 'owner@bellanapoli.com',
    passwordHash: defaultPasswordHash,
    staffPinHash: defaultPinHash,
    tier: 'combined',
    timezone: 'Asia/Kolkata',
    country: 'India',
    countryCode: '+91',
    city: 'Mumbai',
    category: 'Restaurant & Bar',
    whatsappNumber: '+919820123456',
    googleReviewUrl: 'https://maps.google.com/?q=Bella+Napoli+Pizza+NY',
    googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    zomatoUrl: 'https://www.zomato.com/mumbai/bella-napoli',
    swiggyUrl: 'https://www.swiggy.com/restaurants/bella-napoli-pizzeria',
    instagramUrl: 'https://www.instagram.com/bellanapolipizza',
    loyaltyTarget: 6,
    loyaltyValidationDays: 45,
    loyaltyReward: 'Free Wood-Fired Margherita Pizza',
    spinWheelConfiguration: [
      { id: 's1', rewardLabel: '15% Off Your Entire Bill', emoji: '🎁', weight: 20 },
      { id: 's2', rewardLabel: 'Free Artisanal Gelato Cup', emoji: '🏆', weight: 20 },
      { id: 's3', rewardLabel: 'Free Garlic Knots Basket', emoji: '🥇', weight: 15 },
      { id: 's4', rewardLabel: 'Complimentary Soft Beverage', emoji: '👑', weight: 15 },
      { id: 's5', rewardLabel: 'Free Italian Tiramisu Slice', emoji: '💎', weight: 10 },
      { id: 's6', rewardLabel: 'VIP Free Appetizer Voucher', emoji: '🎟️', weight: 10 },
      { id: 's7', rewardLabel: 'Chef Special VIP Tasting Plate', emoji: '🌟', weight: 10 },
    ],
    active: true,
    nfcSecretKey: 'a1b2c3d4e5f60718',
    logoEmoji: '🍕',
    accentColor: '#0e7c66',
    onboardingStep: 'completed',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const offer1: Offer = {
    id: 'off_bella_combined',
    businessId: 'biz_bella_napoli',
    title: 'Spring Loyalty & Dining Fiesta',
    description: 'Spin for instant treats, earn stamps toward your free Margherita pizza, and share your experience!',
    tier: 'combined',
    status: 'active',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    activatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    durationDays: 90,
    spinWheelConfiguration: business1.spinWheelConfiguration,
    loyaltyTarget: 6,
    loyaltyValidationDays: 45,
    loyaltyReward: 'Free Wood-Fired Margherita Pizza',
    googleReviewUrl: business1.googleReviewUrl,
    metrics: {
      scans: 284,
      identifiedGuests: 142,
      rewardsIssued: 96,
      rewardsRedeemed: 78,
      reviewsPrompted: 64,
      reviewsPersisted: 58,
      loyaltyStampsIssued: 168,
      loyaltyMilestonesClaimed: 24,
    },
  };

  const entry1_qr: MerchantEntry = {
    id: 'entry_bella_qr',
    businessId: 'biz_bella_napoli',
    businessSlug: 'bella-napoli',
    entryType: 'merchant_qr',
    label: 'Dynamic QR',
    permanentCode: 'BN-QR-COUNTER',
    targetTier: 'combined',
    createdAt: new Date().toISOString(),
  };

  const entry1_nfc: MerchantEntry = {
    id: 'entry_bella_nfc',
    businessId: 'biz_bella_napoli',
    businessSlug: 'bella-napoli',
    entryType: 'combined',
    label: 'Physical NFC Tag',
    permanentCode: 'BN-NFC-T10',
    targetTier: 'combined',
    createdAt: new Date().toISOString(),
  };

  const entry1_loyalty: MerchantEntry = {
    id: 'entry_bella_instant_loyalty',
    businessId: 'biz_bella_napoli',
    businessSlug: 'bella-napoli',
    entryType: 'loyalty',
    label: 'Express Loyalty NFC Tag',
    permanentCode: 'BN-LOYALTY-EXPRESS',
    targetTier: 'combined',
    createdAt: new Date().toISOString(),
  };

  // Customers for Bella Napoli (3 customers, visit counts 35-58)
  const customersBella: Customer[] = [
    {
      id: 'cust_marco',
      businessId: 'biz_bella_napoli',
      mobile: '+919820111001',
      name: 'Marco Rossi',
      visitCount: 5,
      totalVisits: 58,
      currentStreak: 6,
      longestStreak: 9,
      lastVisitAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      totalRewardsClaimed: 8,
      lastSpinAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      totalSpins: 24,
      reviewJourneyCompleted: true,
      reviewJourneyCompletedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cust_sarah',
      businessId: 'biz_bella_napoli',
      mobile: '+919820111002',
      name: 'Sarah Jenkins',
      visitCount: 4,
      totalVisits: 44,
      currentStreak: 4,
      longestStreak: 7,
      lastVisitAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      totalRewardsClaimed: 6,
      lastSpinAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      totalSpins: 18,
      reviewJourneyCompleted: true,
      createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cust_alex',
      businessId: 'biz_bella_napoli',
      mobile: '+919820111003',
      name: 'Alex Chen',
      visitCount: 3,
      totalVisits: 36,
      currentStreak: 3,
      longestStreak: 5,
      lastVisitAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      totalRewardsClaimed: 4,
      totalSpins: 14,
      reviewJourneyCompleted: false,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // ==========================================
  // BUSINESS 2: Spin Tier - "Tokyo Ramen Lab"
  // ==========================================
  const business2: SeedBusiness = {
    id: 'biz_tokyo_ramen',
    name: 'Tokyo Ramen Lab',
    slug: 'tokyo-ramen',
    email: 'lab@tokyoramen.jp',
    passwordHash: defaultPasswordHash,
    staffPinHash: defaultPinHash,
    tier: 'spin',
    timezone: 'Asia/Kolkata',
    country: 'India',
    countryCode: '+91',
    city: 'Mumbai',
    category: 'Ramen & Noodles',
    whatsappNumber: '+919820123457',
    googleReviewUrl: 'https://maps.google.com/?q=Tokyo+Ramen+Lab',
    spinWheelConfiguration: [
      { id: 'tr1', rewardLabel: 'Extra Chashu Slice Topping', emoji: '🍜', weight: 30 },
      { id: 'tr2', rewardLabel: 'Complimentary Ajitsuke Tamago (Egg)', emoji: '⭐', weight: 25 },
      { id: 'tr3', rewardLabel: 'Free Side of Gyoza (4 pcs)', emoji: '🥟', weight: 20 },
      { id: 'tr4', rewardLabel: 'Free Iced Oolong Tea', emoji: '🍵', weight: 15 },
      { id: 'tr5', rewardLabel: 'Full Bowl Ramen Upgrade', emoji: '🏆', weight: 10 },
    ],
    active: true,
    nfcSecretKey: 'f8e7d6c5b4a39201',
    logoEmoji: '🍜',
    accentColor: '#d97706',
    onboardingStep: 'completed',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const offer2: Offer = {
    id: 'off_tokyo_spin',
    businessId: 'biz_tokyo_ramen',
    title: 'Tokyo Slurp & Spin Wheel',
    description: 'Every bowl earns a lucky spin! 100% all-win guaranteed upgrades.',
    tier: 'spin',
    status: 'active',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    activatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    durationDays: 60,
    spinWheelConfiguration: business2.spinWheelConfiguration,
    googleReviewUrl: business2.googleReviewUrl,
    metrics: {
      scans: 198,
      identifiedGuests: 112,
      rewardsIssued: 112,
      rewardsRedeemed: 94,
      reviewsPrompted: 0,
      reviewsPersisted: 0,
      loyaltyStampsIssued: 0,
      loyaltyMilestonesClaimed: 0,
    },
  };

  const entry2_qr: MerchantEntry = {
    id: 'entry_tokyo_qr',
    businessId: 'biz_tokyo_ramen',
    businessSlug: 'tokyo-ramen',
    entryType: 'merchant_qr',
    label: 'Counter QR Card',
    permanentCode: 'TR-QR-MAIN',
    targetTier: 'spin',
    createdAt: new Date().toISOString(),
  };

  // Customers for Tokyo Ramen (3 customers, visit counts 38-52)
  const customersTokyo: Customer[] = [
    {
      id: 'cust_kenji',
      businessId: 'biz_tokyo_ramen',
      mobile: '+919820111005',
      name: 'Kenji Sato',
      visitCount: 8,
      totalVisits: 52,
      currentStreak: 5,
      longestStreak: 8,
      lastVisitAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      totalRewardsClaimed: 11,
      lastSpinAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      totalSpins: 32,
      reviewJourneyCompleted: false,
      createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cust_ryo',
      businessId: 'biz_tokyo_ramen',
      mobile: '+919820111006',
      name: 'Ryo Takahashi',
      visitCount: 4,
      totalVisits: 41,
      currentStreak: 3,
      longestStreak: 6,
      lastVisitAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      totalRewardsClaimed: 8,
      lastSpinAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      totalSpins: 25,
      reviewJourneyCompleted: false,
      createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cust_ananya',
      businessId: 'biz_tokyo_ramen',
      mobile: '+919820111007',
      name: 'Ananya Roy',
      visitCount: 3,
      totalVisits: 38,
      currentStreak: 2,
      longestStreak: 4,
      lastVisitAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      totalRewardsClaimed: 7,
      lastSpinAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      totalSpins: 21,
      reviewJourneyCompleted: false,
      createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // ==========================================
  // BUSINESS 3: Loyalty Tier - "Artisan Bakery & Cafe"
  // ==========================================
  const business3: SeedBusiness = {
    id: 'biz_artisan_bakery',
    name: 'Artisan Bakery & Cafe',
    slug: 'artisan-bakery',
    email: 'owner@artisanbakery.in',
    passwordHash: defaultPasswordHash,
    staffPinHash: defaultPinHash,
    tier: 'loyalty',
    timezone: 'Asia/Kolkata',
    country: 'India',
    countryCode: '+91',
    city: 'Mumbai',
    category: 'Bakery & Cafe',
    whatsappNumber: '+919820123458',
    googleReviewUrl: 'https://maps.google.com/?q=Artisan+Bakery+Mumbai',
    loyaltyTarget: 5,
    loyaltyValidationDays: 30,
    loyaltyReward: 'Free Artisanal Croissant & Brewed Coffee',
    active: true,
    nfcSecretKey: 'b2c3d4e5f6a10729',
    logoEmoji: '🥐',
    accentColor: '#0e7c66',
    onboardingStep: 'completed',
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const offer3: Offer = {
    id: 'off_artisan_loyalty',
    businessId: 'biz_artisan_bakery',
    title: 'Artisan Loyalty Stamp Club',
    description: 'Collect 5 stamps with every visit and claim a free fresh-baked croissant and coffee!',
    tier: 'loyalty',
    status: 'active',
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    activatedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    durationDays: 90,
    loyaltyTarget: 5,
    loyaltyValidationDays: 30,
    loyaltyReward: 'Free Artisanal Croissant & Brewed Coffee',
    googleReviewUrl: business3.googleReviewUrl,
    metrics: {
      scans: 162,
      identifiedGuests: 88,
      rewardsIssued: 48,
      rewardsRedeemed: 42,
      reviewsPrompted: 0,
      reviewsPersisted: 0,
      loyaltyStampsIssued: 172,
      loyaltyMilestonesClaimed: 18,
    },
  };

  const entry3_qr: MerchantEntry = {
    id: 'entry_bakery_qr',
    businessId: 'biz_artisan_bakery',
    businessSlug: 'artisan-bakery',
    entryType: 'merchant_qr',
    label: 'Bakery Counter QR',
    permanentCode: 'AB-LOYALTY-COUNTER',
    targetTier: 'loyalty',
    createdAt: new Date().toISOString(),
  };

  const entry3_nfc: MerchantEntry = {
    id: 'entry_bakery_nfc',
    businessId: 'biz_artisan_bakery',
    businessSlug: 'artisan-bakery',
    entryType: 'nfc_tag',
    label: 'Bakery NFC Tag',
    permanentCode: 'AB-NFC-T01',
    targetTier: 'loyalty',
    createdAt: new Date().toISOString(),
  };

  // Customers for Artisan Bakery (3 customers, visit counts 34-62)
  const customersArtisan: Customer[] = [
    {
      id: 'cust_priya',
      businessId: 'biz_artisan_bakery',
      mobile: '+919819234567',
      name: 'Priya Sharma',
      visitCount: 4,
      totalVisits: 62,
      currentStreak: 6,
      longestStreak: 10,
      lastVisitAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      totalRewardsClaimed: 9,
      reviewJourneyCompleted: false,
      createdAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cust_rohan',
      businessId: 'biz_artisan_bakery',
      mobile: '+919819234568',
      name: 'Rohan Mehta',
      visitCount: 3,
      totalVisits: 47,
      currentStreak: 4,
      longestStreak: 7,
      lastVisitAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      totalRewardsClaimed: 6,
      reviewJourneyCompleted: false,
      createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cust_meera',
      businessId: 'biz_artisan_bakery',
      mobile: '+919819234569',
      name: 'Meera Patel',
      visitCount: 2,
      totalVisits: 34,
      currentStreak: 3,
      longestStreak: 5,
      lastVisitAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      totalRewardsClaimed: 4,
      reviewJourneyCompleted: false,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // ==========================================
  // Sample Rewards & Review Logs
  // ==========================================
  const sampleReward: Reward = {
    id: 'rew_sample_voucher_1',
    businessId: 'biz_bella_napoli',
    customerId: 'cust_marco',
    customerName: 'Marco Rossi',
    customerMobileMasked: '******1001',
    code: 'SY-MARCO9',
    title: '15% Off Your Entire Bill',
    type: 'spin',
    status: 'issued',
    claimedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  };

  const sampleRedeemedReward: Reward = {
    id: 'rew_sample_redeemed_1',
    businessId: 'biz_bella_napoli',
    customerId: 'cust_sarah',
    customerName: 'Sarah Jenkins',
    customerMobileMasked: '******1002',
    code: 'SY-SARAH3',
    title: 'Free Wood-Fired Margherita Pizza',
    type: 'loyalty',
    status: 'redeemed',
    claimedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    redeemedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
    staffPinVerifiedBy: 'Staff Terminal Mumbai',
  };

  const sampleReviewLog: ReviewLog = {
    id: 'rev_sample_1',
    businessId: 'biz_bella_napoli',
    customerId: 'cust_marco',
    customerName: 'Marco Rossi',
    reviewText: 'Outstanding wood-fired crust! The staff is incredibly friendly and welcoming.',
    rating: 5,
    tags: ['Great Service', 'Delicious Pizza', 'Authentic Taste'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    googleReviewOpenedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 4000).toISOString(),
    status: 'google_opened',
  };

  return {
    businesses: [business1, business2, business3],
    offers: [offer1, offer2, offer3],
    merchantEntries: [entry1_qr, entry1_nfc, entry1_loyalty, entry2_qr, entry3_qr, entry3_nfc],
    customers: [...customersBella, ...customersTokyo, ...customersArtisan],
    rewards: [sampleReward, sampleRedeemedReward],
    reviewLogs: [sampleReviewLog],
  };
}