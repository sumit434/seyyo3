import { Business } from '../../../shared/types/business';
import { Offer } from '../../../shared/types/offer';
import { Customer } from '../../../shared/types/customer';
import { Reward } from '../../../shared/types/reward';
import { ReviewLog } from '../../../shared/types/review';
import { MerchantEntry, CustomerSession } from '../../../shared/types/qr';
import { OnboardingToken, OnboardingSession } from '../../../shared/types/onboarding';
import { StaffSession } from '../../../shared/types/session';
import { PaymentRecord } from '../../../shared/types/payment';
import { createInitialSeedData } from './seed';
import { generateSecureToken, normalizePhone } from '../utils/crypto';
import { QR_SESSION_KEY_TTL_MS } from '../../../shared/constants/limits';
import mongoose from 'mongoose';
import {
  MongoBusiness,
  MongoOffer,
  MongoCustomer,
  MongoReward,
  MongoReviewLog,
  MongoMerchantEntry,
  MongoPayment,
  MongoOnboardingToken,
  MongoOnboardingSession,
} from '../models/Schemas';

export interface StampClaim {
  id: string;
  businessId: string;
  customerId: string;
  sessionToken?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  skipRedemptionPin: boolean;
  createdAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  completedAt?: string;
}

export class MemoryDB {
  private static instance: MemoryDB;

  private businesses: Map<string, Business> = new Map();
  private offers: Map<string, Offer> = new Map();
  private customers: Map<string, Customer> = new Map(); // id -> Customer
  private customerLookup: Map<string, string> = new Map(); // businessId:mobile -> customerId
  private rewards: Map<string, Reward> = new Map();
  private reviewLogs: Map<string, ReviewLog> = new Map();
  private merchantEntries: Map<string, MerchantEntry> = new Map(); // id -> MerchantEntry
  private merchantEntryCodeLookup: Map<string, string> = new Map(); // permanentCode -> id
  private customerSessions: Map<string, CustomerSession> = new Map(); // sessionToken -> CustomerSession
  private sessionKeyLookup: Map<string, string> = new Map(); // sessionKey -> sessionToken
  private onboardingTokens: Map<string, OnboardingToken> = new Map(); // tokenHash -> OnboardingToken
  private onboardingSessions: Map<string, OnboardingSession> = new Map(); // sessionId -> OnboardingSession
  private staffSessions: Map<string, StaffSession> = new Map(); // sessionId -> StaffSession
  private payments: Map<string, PaymentRecord> = new Map(); // id -> PaymentRecord
  private paymentOrderLookup: Map<string, string> = new Map(); // razorpayOrderId -> id
  private stampClaims: Map<string, StampClaim> = new Map(); // id -> StampClaim

  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.init();
  }

  public static getInstance(): MemoryDB {
    if (!MemoryDB.instance) {
      MemoryDB.instance = new MemoryDB();
    }
    return MemoryDB.instance;
  }

  private init() {
    // Populate in-memory map with initial seed data on startup
    this.seed();

    // Start background TTL cleaner every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.runTtlCleanup();
    }, 60 * 1000);
  }

  private seed() {
    const seedData = createInitialSeedData();
    seedData.businesses.forEach(b => this.businesses.set(b.id, b));
    seedData.offers.forEach(o => this.offers.set(o.id, o));
    seedData.merchantEntries.forEach(m => {
      this.merchantEntries.set(m.id, m);
      this.merchantEntryCodeLookup.set(m.permanentCode, m.id);
    });
    seedData.customers.forEach(c => {
      this.customers.set(c.id, c);
      this.customerLookup.set(`${c.businessId}:${c.mobile}`, c.id);
    });
    seedData.rewards.forEach(r => this.rewards.set(r.id, r));
    seedData.reviewLogs.forEach(rv => this.reviewLogs.set(rv.id, rv));
  }

  public scheduleSave() {
    // Disabled: Disk JSON caching turned off in favor of pure MongoDB
  }

  public saveImmediate() {
    // Disabled: Disk JSON caching turned off in favor of pure MongoDB
  }

  /**
   * MongoDB Hydration
   * Hydrates in-memory Maps with persisted records from MongoDB.
   * If MongoDB is empty, it seeds the 3 accounts and persists them to MongoDB.
   */
  public async hydrateFromMongo(): Promise<void> {
    if (mongoose.connection.readyState !== 1) {
      console.info('[MemoryDB] MongoDB not connected; skipping Mongo hydration.');
      return;
    }

    try {
      console.info('[MemoryDB] Hydrating state from MongoDB...');
      const [
        businesses,
        offers,
        customers,
        rewards,
        reviews,
        entries,
        payments,
        onboardingTokens,
        onboardingSessions,
      ] = await Promise.all([
        MongoBusiness.find({}).lean(),
        MongoOffer.find({}).lean(),
        MongoCustomer.find({}).lean(),
        MongoReward.find({}).lean(),
        MongoReviewLog.find({}).lean(),
        MongoMerchantEntry.find({}).lean(),
        MongoPayment.find({}).lean(),
        MongoOnboardingToken.find({}).lean(),
        MongoOnboardingSession.find({}).lean(),
      ]);

      if (Array.isArray(businesses) && businesses.length > 0) {
        this.businesses.clear();
        for (const b of businesses as any[]) {
          if (b && b.id) {
            this.businesses.set(b.id, b as Business);
          }
        }
      }

      if (Array.isArray(offers) && offers.length > 0) {
        this.offers.clear();
        for (const o of offers as any[]) {
          if (o && o.id) {
            this.offers.set(o.id, o as Offer);
          }
        }
      }

      if (Array.isArray(customers) && customers.length > 0) {
        this.customers.clear();
        this.customerLookup.clear();
        for (const c of customers as any[]) {
          if (c && c.id) {
            this.customers.set(c.id, c as Customer);
            this.customerLookup.set(`${c.businessId}:${c.mobile}`, c.id);
          }
        }
      }

      if (Array.isArray(rewards) && rewards.length > 0) {
        this.rewards.clear();
        for (const r of rewards as any[]) {
          if (r && r.id) {
            this.rewards.set(r.id, r as Reward);
          }
        }
      }

      if (Array.isArray(reviews) && reviews.length > 0) {
        this.reviewLogs.clear();
        for (const rv of reviews as any[]) {
          if (rv && rv.id) {
            this.reviewLogs.set(rv.id, rv as ReviewLog);
          }
        }
      }

      if (Array.isArray(entries) && entries.length > 0) {
        this.merchantEntries.clear();
        this.merchantEntryCodeLookup.clear();
        for (const m of entries as any[]) {
          if (m && m.id) {
            this.merchantEntries.set(m.id, m as MerchantEntry);
            if (m.permanentCode) {
              this.merchantEntryCodeLookup.set(m.permanentCode, m.id);
            }
          }
        }
      }

      if (Array.isArray(payments) && payments.length > 0) {
        this.payments.clear();
        this.paymentOrderLookup.clear();
        for (const p of payments as any[]) {
          if (p && p.id) {
            this.payments.set(p.id, p as PaymentRecord);
            if (p.razorpayOrderId) {
              this.paymentOrderLookup.set(p.razorpayOrderId, p.id);
            }
          }
        }
      }

      if (Array.isArray(onboardingTokens) && onboardingTokens.length > 0) {
        this.onboardingTokens.clear();
        for (const ot of onboardingTokens as any[]) {
          if (ot && ot.tokenHash) {
            this.onboardingTokens.set(ot.tokenHash, ot as OnboardingToken);
          }
        }
      }

      if (Array.isArray(onboardingSessions) && onboardingSessions.length > 0) {
        this.onboardingSessions.clear();
        for (const os of onboardingSessions as any[]) {
          if (os && os.sessionId) {
            this.onboardingSessions.set(os.sessionId, os as OnboardingSession);
          }
        }
      }

      // If MongoDB was completely empty, seed MongoDB with the default 3 accounts
      if (!businesses || businesses.length === 0) {
        this.ensureDeveloperDummyAccounts();
      }

      console.info(
        `[MemoryDB] Successfully hydrated from MongoDB (${this.businesses.size} businesses, ${this.customers.size} customers, ${this.payments.size} payments).`
      );
    } catch (err: any) {
      console.warn('[MemoryDB] Hydration from MongoDB encountered an error, keeping RAM state:', err?.message || err);
    }
  }

  /**
   * Guarantees that the 3 developer dummy accounts from seed.ts
   * exist in RAM and MongoDB.
   */
  public ensureDeveloperDummyAccounts(): void {
    const seedData = createInitialSeedData();

    // Ensure RAM state
    for (const b of seedData.businesses) {
      this.businesses.set(b.id, b);
    }
    for (const o of seedData.offers) {
      this.offers.set(o.id, o);
    }
    for (const m of seedData.merchantEntries) {
      this.merchantEntries.set(m.id, m);
      this.merchantEntryCodeLookup.set(m.permanentCode, m.id);
    }
    for (const c of seedData.customers) {
      this.customers.set(c.id, c);
      this.customerLookup.set(`${c.businessId}:${c.mobile}`, c.id);
    }
    for (const r of seedData.rewards) {
      this.rewards.set(r.id, r);
    }
    for (const rv of seedData.reviewLogs) {
      this.reviewLogs.set(rv.id, rv);
    }

    // Persist to MongoDB
    if (mongoose.connection.readyState === 1) {
      for (const b of seedData.businesses) {
        MongoBusiness.updateOne({ id: b.id }, { $set: b }, { upsert: true }).catch(() => {});
      }
      for (const o of seedData.offers) {
        MongoOffer.updateOne({ id: o.id }, { $set: o }, { upsert: true }).catch(() => {});
      }
      for (const m of seedData.merchantEntries) {
        MongoMerchantEntry.updateOne({ id: m.id }, { $set: m }, { upsert: true }).catch(() => {});
      }
      for (const c of seedData.customers) {
        MongoCustomer.updateOne({ id: c.id }, { $set: c }, { upsert: true }).catch(() => {});
      }
      for (const r of seedData.rewards) {
        MongoReward.updateOne({ id: r.id }, { $set: r }, { upsert: true }).catch(() => {});
      }
      for (const rv of seedData.reviewLogs) {
        MongoReviewLog.updateOne({ id: rv.id }, { $set: rv }, { upsert: true }).catch(() => {});
      }
    }
  }

  public runTtlCleanup() {
    const now = new Date().toISOString();

    for (const [token, session] of this.customerSessions.entries()) {
      if (session.expiresAt < now) {
        this.customerSessions.delete(token);
      }
    }

    for (const [hash, ot] of this.onboardingTokens.entries()) {
      if (ot.status === 'pending' && ot.expiresAt < now) {
        ot.status = 'expired';
        if (mongoose.connection.readyState === 1) {
          MongoOnboardingToken.updateOne({ tokenHash: hash }, { $set: { status: 'expired' } }).catch(() => {});
        }
      }
    }

    for (const [id, session] of this.staffSessions.entries()) {
      if (session.expiresAt < now) {
        this.staffSessions.delete(id);
      }
    }

    for (const [id, claim] of this.stampClaims.entries()) {
      if (claim.status === 'PENDING' && claim.expiresAt < now) {
        claim.status = 'CANCELLED';
        this.stampClaims.delete(id);
      }
    }
  }

  // --- BUSINESS REPOSITORY METHODS ---
  public getBusinessById(id: string): Business | undefined {
    return this.businesses.get(id);
  }

  public getBusinessBySlug(slug: string): Business | undefined {
    for (const b of this.businesses.values()) {
      if (b.slug.toLowerCase() === slug.toLowerCase()) return b;
    }
    return undefined;
  }

  public getBusinessByEmail(email: string): Business | undefined {
    for (const b of this.businesses.values()) {
      if (b.email.toLowerCase() === email.toLowerCase()) return b;
    }
    return undefined;
  }

  public getAllBusinesses(): Business[] {
    return Array.from(this.businesses.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  public saveBusiness(business: Business): Business {
    if (!business.nfcSecretKey) {
      business.nfcSecretKey = generateSecureToken(8);
    }
    this.businesses.set(business.id, business);
    if (mongoose.connection.readyState === 1) {
      MongoBusiness.updateOne({ id: business.id }, { $set: business }, { upsert: true }).catch(err => {
        console.warn('[MongoDB Sync Error]', err.message);
      });
    }
    return business;
  }

  // --- OFFER REPOSITORY METHODS ---
  public getOfferById(id: string): Offer | undefined {
    return this.offers.get(id);
  }

  public getActiveOfferByBusinessId(businessId: string): Offer | undefined {
    for (const offer of this.offers.values()) {
      if (offer.businessId === businessId && offer.status === 'active') {
        return offer;
      }
    }
    return undefined;
  }

  public getOffersByBusinessId(businessId: string): Offer[] {
    return Array.from(this.offers.values()).filter(o => o.businessId === businessId);
  }

  public saveOffer(offer: Offer): Offer {
    this.offers.set(offer.id, offer);
    if (mongoose.connection.readyState === 1) {
      MongoOffer.updateOne({ id: offer.id }, { $set: offer }, { upsert: true }).catch(err => {
        console.warn('[MongoDB Sync Error]', err.message);
      });
    }
    return offer;
  }

  // --- MERCHANT ENTRY REPOSITORY METHODS ---
  public getMerchantEntryByPermanentCode(code: string): MerchantEntry | undefined {
    const id = this.merchantEntryCodeLookup.get(code);
    return id ? this.merchantEntries.get(id) : undefined;
  }

  public getMerchantEntriesByBusinessId(businessId: string): MerchantEntry[] {
    return Array.from(this.merchantEntries.values()).filter(m => m.businessId === businessId);
  }

  public saveMerchantEntry(entry: MerchantEntry): MerchantEntry {
    this.merchantEntries.set(entry.id, entry);
    this.merchantEntryCodeLookup.set(entry.permanentCode, entry.id);
    if (mongoose.connection.readyState === 1) {
      MongoMerchantEntry.updateOne({ id: entry.id }, { $set: entry }, { upsert: true }).catch(err => {
        console.warn('[MongoDB Sync Error]', err.message);
      });
    }
    return entry;
  }

  // --- CUSTOMER REPOSITORY METHODS ---
  public getCustomerById(id: string): Customer | undefined {
    return this.customers.get(id);
  }

  public getCustomerByBusinessAndMobile(businessId: string, mobile: string): Customer | undefined {
    const id = this.customerLookup.get(`${businessId}:${mobile}`);
    return id ? this.customers.get(id) : undefined;
  }

  public getCustomersByBusinessId(businessId: string): Customer[] {
    return Array.from(this.customers.values()).filter(c => c.businessId === businessId);
  }

  public saveCustomer(customer: Customer): Customer {
    if (customer.activeOfferId === undefined) customer.activeOfferId = undefined;
    if (customer.cycleStartedAt === undefined) customer.cycleStartedAt = undefined;
    this.customers.set(customer.id, customer);
    this.customerLookup.set(`${customer.businessId}:${customer.mobile}`, customer.id);
    if (mongoose.connection.readyState === 1) {
      MongoCustomer.updateOne({ id: customer.id }, { $set: customer }, { upsert: true }).catch(err => {
        console.warn('[MongoDB Sync Error]', err.message);
      });
    }
    return customer;
  }

  // --- CUSTOMER SESSION REPOSITORY METHODS ---
  public getCustomerSession(tokenOrKey: string): CustomerSession | undefined {
    let session = this.customerSessions.get(tokenOrKey);
    if (!session) {
      const token = this.sessionKeyLookup.get(tokenOrKey);
      if (token) {
        session = this.customerSessions.get(token);
      }
    }
    if (!session) return undefined;
    if (session.expiresAt < new Date().toISOString()) {
      this.deleteCustomerSession(session.sessionToken);
      return undefined;
    }
    return session;
  }

  public getCustomerSessionByKey(sessionKey: string): CustomerSession | undefined {
    const token = this.sessionKeyLookup.get(sessionKey);
    if (token) {
      return this.getCustomerSession(token);
    }
    for (const s of this.customerSessions.values()) {
      if (s.sessionKey === sessionKey) {
        return this.getCustomerSession(s.sessionToken);
      }
    }
    return undefined;
  }

  public saveCustomerSession(session: CustomerSession): CustomerSession {
    this.customerSessions.set(session.sessionToken, session);
    if (session.sessionKey) {
      this.sessionKeyLookup.set(session.sessionKey, session.sessionToken);
    }
    return session;
  }

  public deleteCustomerSession(token: string): void {
    const session = this.customerSessions.get(token);
    if (session?.sessionKey) {
      this.sessionKeyLookup.delete(session.sessionKey);
    }
    this.customerSessions.delete(token);
  }

  public getActiveQrSessionForBusiness(businessId: string): CustomerSession | undefined {
    const nowIso = new Date().toISOString();
    for (const s of this.customerSessions.values()) {
      if (
        s.businessId === businessId &&
        s.authType === 'qr' &&
        s.status === 'unused' &&
        s.expiresAt > nowIso
      ) {
        return s;
      }
    }
    return undefined;
  }

  public invalidateUnusedQrSessions(businessId: string): void {
    const nowIso = new Date().toISOString();
    for (const s of this.customerSessions.values()) {
      if (s.businessId === businessId && s.authType === 'qr' && s.status === 'unused') {
        s.status = 'expired';
        s.expiresAt = nowIso;
      }
    }
  }

  public createQrSession(businessId: string, offerId: string): CustomerSession {
    const sessionToken = generateSecureToken(32);
    const sessionKey = `sk_${generateSecureToken(16)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + QR_SESSION_KEY_TTL_MS).toISOString();

    const sessionId = `cs_${generateSecureToken(8)}`;
    const session: CustomerSession = {
      id: sessionId,
      sessionId,
      sessionToken,
      sessionKey,
      businessId,
      offerId,
      authType: 'qr',
      source: 'qr',
      entryType: 'combined',
      qrKey: sessionKey,
      currentStage: 'auth',
      status: 'unused',
      isUsed: false,
      createdAt: now.toISOString(),
      expiresAt,
    };

    return this.saveCustomerSession(session);
  }

  public claimSessionKey(
    sessionKeyOrToken: string,
    customerNumber: string,
    customerId?: string
  ): { success: boolean; session?: CustomerSession; reason?: string } {
    const session = this.getCustomerSession(sessionKeyOrToken);
    if (!session) {
      return { success: false, reason: 'INVALID_SESSION' };
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return { success: false, reason: 'SESSION_EXPIRED' };
    }

    if (session.status === 'completed') {
      return { success: false, reason: 'ALREADY_USED' };
    }

    const cleanInputPhone = normalizePhone(customerNumber);
    const cleanSessionPhone = normalizePhone(session.customerNumber || '');

    if (session.status === 'used') {
      if (cleanSessionPhone && cleanSessionPhone !== cleanInputPhone) {
        return { success: false, reason: 'ALREADY_USED' };
      }
      if (customerId && !session.customerId) {
        session.customerId = customerId;
        this.saveCustomerSession(session);
      }
      return { success: true, session };
    }

    session.customerNumber = customerNumber;
    if (customerId) session.customerId = customerId;
    session.status = 'used';
    session.isUsed = true;
    session.usedAt = new Date().toISOString();
    this.saveCustomerSession(session);

    return { success: true, session };
  }

  public markSessionClaimCompleted(sessionTokenOrKey: string): void {
    const session = this.getCustomerSession(sessionTokenOrKey);
    if (session && session.status !== 'completed') {
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      this.saveCustomerSession(session);
    }
  }

  // --- REWARD REPOSITORY METHODS ---
  public getRewardById(id: string): Reward | undefined {
    return this.rewards.get(id);
  }

  public getRewardsByBusinessId(businessId: string): Reward[] {
    return Array.from(this.rewards.values())
      .filter(r => r.businessId === businessId)
      .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime());
  }

  public getRewardByCodeAndBusiness(code: string, businessId: string): Reward | undefined {
    for (const r of this.rewards.values()) {
      if (r.businessId === businessId && r.code.toUpperCase() === code.toUpperCase()) {
        return r;
      }
    }
    return undefined;
  }

  public saveReward(reward: Reward): Reward {
    this.rewards.set(reward.id, reward);
    if (mongoose.connection.readyState === 1) {
      MongoReward.updateOne({ id: reward.id }, { $set: reward }, { upsert: true }).catch(err => {
        console.warn('[MongoDB Sync Error]', err.message);
      });
    }
    return reward;
  }

  // --- REVIEW LOG REPOSITORY METHODS ---
  public getReviewLogsByBusinessId(businessId: string): ReviewLog[] {
    return Array.from(this.reviewLogs.values())
      .filter(rv => rv.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public saveReviewLog(log: ReviewLog): ReviewLog {
    this.reviewLogs.set(log.id, log);
    if (mongoose.connection.readyState === 1) {
      MongoReviewLog.updateOne({ id: log.id }, { $set: log }, { upsert: true }).catch(err => {
        console.warn('[MongoDB Sync Error]', err.message);
      });
    }
    return log;
  }

  // --- ONBOARDING TOKEN & SESSION REPOSITORY METHODS ---
  public getOnboardingTokenByHash(hash: string): OnboardingToken | undefined {
    return this.onboardingTokens.get(hash);
  }

  public getOnboardingTokenById(id: string): OnboardingToken | undefined {
    for (const ot of this.onboardingTokens.values()) {
      if (ot.id === id) return ot;
    }
    return undefined;
  }

  public saveOnboardingToken(token: OnboardingToken): OnboardingToken {
    this.onboardingTokens.set(token.tokenHash, token);
    if (mongoose.connection.readyState === 1) {
      MongoOnboardingToken.updateOne({ tokenHash: token.tokenHash }, { $set: token }, { upsert: true }).catch(err => {
        console.warn('[MongoDB Sync Error - OnboardingToken]', err.message);
      });
    }
    return token;
  }

  public getOnboardingSession(sessionId: string): OnboardingSession | undefined {
    const session = this.onboardingSessions.get(sessionId);
    if (!session) return undefined;
    if (session.expiresAt && session.expiresAt < new Date().toISOString()) {
      this.onboardingSessions.delete(sessionId);
      return undefined;
    }
    return session;
  }

  public saveOnboardingSession(session: OnboardingSession): OnboardingSession {
    this.onboardingSessions.set(session.sessionId, session);
    if (mongoose.connection.readyState === 1) {
      MongoOnboardingSession.updateOne({ sessionId: session.sessionId }, { $set: session }, { upsert: true }).catch(err => {
        console.warn('[MongoDB Sync Error - OnboardingSession]', err.message);
      });
    }
    return session;
  }

  // --- STAFF SESSION REPOSITORY METHODS ---
  public getStaffSession(sessionId: string): StaffSession | undefined {
    const session = this.staffSessions.get(sessionId);
    if (!session) return undefined;
    if (session.expiresAt < new Date().toISOString()) {
      this.staffSessions.delete(sessionId);
      return undefined;
    }
    return session;
  }

  public saveStaffSession(session: StaffSession): StaffSession {
    this.staffSessions.set(session.sessionId, session);
    return session;
  }

  public deleteStaffSession(sessionId: string): void {
    this.staffSessions.delete(sessionId);
  }

  // --- PAYMENT REPOSITORY METHODS ---
  public getPaymentById(id: string): PaymentRecord | undefined {
    return this.payments.get(id);
  }

  public getPaymentByOrderId(orderId: string): PaymentRecord | undefined {
    const id = this.paymentOrderLookup.get(orderId);
    return id ? this.payments.get(id) : undefined;
  }

  public savePayment(payment: PaymentRecord): PaymentRecord {
    this.payments.set(payment.id, payment);
    if (payment.razorpayOrderId) {
      this.paymentOrderLookup.set(payment.razorpayOrderId, payment.id);
    }
    if (mongoose.connection.readyState === 1) {
      MongoPayment.updateOne({ id: payment.id }, { $set: payment }, { upsert: true }).catch(err => {
        console.warn('[MongoDB Sync Error - Payment]', err.message);
      });
    }
    return payment;
  }

  // --- STAMP CLAIM REPOSITORY METHODS ---
  public getStampClaimById(id: string): StampClaim | undefined {
    return this.stampClaims.get(id);
  }

  public getPendingStampClaim(businessId: string, customerId: string): StampClaim | undefined {
    for (const claim of this.stampClaims.values()) {
      if (claim.businessId === businessId && claim.customerId === customerId && claim.status === 'PENDING') {
        return claim;
      }
    }
    return undefined;
  }

  public saveStampClaim(claim: StampClaim): StampClaim {
    this.stampClaims.set(claim.id, claim);
    return claim;
  }

  public deleteStampClaim(id: string): void {
    this.stampClaims.delete(id);
  }

  public clearPendingStampClaims(businessId: string, customerId: string): void {
    for (const [id, claim] of this.stampClaims.entries()) {
      if (claim.businessId === businessId && claim.customerId === customerId && claim.status === 'PENDING') {
        claim.status = 'CANCELLED';
        this.stampClaims.delete(id);
      }
    }
  }
}