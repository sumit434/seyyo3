export type ReviewLogStatus = 'generated' | 'persisted' | 'google_opened';

export interface ReviewLog {
  id: string;
  businessId: string;
  customerId: string;
  customerName?: string;
  reviewText: string;
  rating: number; // 1-5
  tags: string[];
  createdAt: string; // ISO UTC
  googleReviewOpenedAt?: string; // ISO UTC
  status: ReviewLogStatus;
}
