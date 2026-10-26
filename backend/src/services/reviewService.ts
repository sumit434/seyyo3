import { MemoryDB } from '../db/MemoryDB';
import { ReviewLog } from '../../../shared/types/review';
import { generateSecureToken } from '../utils/crypto';

export class ReviewService {
  private db: MemoryDB;

  constructor() {
    this.db = MemoryDB.getInstance();
  }

  /**
   * Persist customer review before redirecting to Google Maps
   */
  public persistReview(
    businessId: string,
    customerId: string,
    rating: number,
    tags: string[],
    reviewText: string
  ): { reviewLog: ReviewLog; googleReviewUrl: string } {
    const business = this.db.getBusinessById(businessId);
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND');
    }

    const offer = this.db.getActiveOfferByBusinessId(businessId);
    const googleReviewUrl = offer?.googleReviewUrl || business.googleReviewUrl;
    if (!googleReviewUrl) {
      throw new Error('GOOGLE_REVIEW_URL_MISSING: Business has not configured a Google Review URL');
    }

    const customer = this.db.getCustomerById(customerId);
    if (!customer || customer.businessId !== businessId) {
      throw new Error('CUSTOMER_NOT_FOUND: Customer not found or cross-business violation');
    }

    const nowIso = new Date().toISOString();
    const logId = `rev_${generateSecureToken(8)}`;

    // Record one-time review accelerator entry on customer data
    customer.hasEnteredReviewFlow = true;
    if (!customer.reviewAcceleratorEntryId) {
      customer.reviewAcceleratorEntryId = `rev_acc_${generateSecureToken(8)}`;
    }
    customer.updatedAt = nowIso;
    this.db.saveCustomer(customer);

    const cleanReviewText = (reviewText || '').replace(/<[^>]*>/g, '').trim().slice(0, 1000);
    const cleanTags = Array.isArray(tags) ? tags.map(t => String(t).replace(/<[^>]*>/g, '').trim().slice(0, 50)) : [];

    const reviewLog: ReviewLog = {
      id: logId,
      businessId,
      customerId,
      customerName: customer.name,
      reviewText: cleanReviewText,
      rating: Math.max(1, Math.min(5, Number(rating) || 5)),
      tags: cleanTags,
      createdAt: nowIso,
      status: 'persisted',
    };

    this.db.saveReviewLog(reviewLog);

    if (offer) {
      offer.metrics.reviewsPersisted += 1;
      this.db.saveOffer(offer);
    }

    return {
      reviewLog,
      googleReviewUrl,
    };
  }

  /**
   * Mark that Google Review link was opened and complete review journey
   */
  public markGoogleOpened(reviewLogId: string, customerId: string): { success: boolean } {
    const logs = this.db.getReviewLogsByBusinessId(''); // search all
    // Since we have reviewLog ID, let's find it
    const log = this.db.getReviewLogsByBusinessId('').find(l => l.id === reviewLogId) || null;
    
    const customer = this.db.getCustomerById(customerId);
    if (customer) {
      customer.hasEnteredReviewFlow = true;
      if (!customer.reviewAcceleratorEntryId) {
        customer.reviewAcceleratorEntryId = `rev_acc_${generateSecureToken(8)}`;
      }
      customer.reviewJourneyCompleted = true;
      customer.reviewJourneyCompletedAt = new Date().toISOString();
      customer.updatedAt = new Date().toISOString();
      this.db.saveCustomer(customer);
    }

    if (log) {
      log.googleReviewOpenedAt = new Date().toISOString();
      log.status = 'google_opened';
      this.db.saveReviewLog(log);
    }

    return { success: true };
  }
}
