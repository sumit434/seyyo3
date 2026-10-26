import mongoose, { Schema } from 'mongoose';
import { Business } from '../../../shared/types/business';
import { Offer } from '../../../shared/types/offer';
import { Customer } from '../../../shared/types/customer';
import { Reward } from '../../../shared/types/reward';
import { ReviewLog } from '../../../shared/types/review';
import { MerchantEntry } from '../../../shared/types/qr';
import { PaymentRecord } from '../../../shared/types/payment';
import { OnboardingToken, OnboardingSession } from '../../../shared/types/onboarding';


const businessSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
  },
  { strict: false, timestamps: true }
);

const offerSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
  },
  { strict: false, timestamps: true }
);

const customerSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
  },
  { strict: false, timestamps: true }
);

const rewardSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
  },
  { strict: false, timestamps: true }
);

const reviewLogSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
  },
  { strict: false, timestamps: true }
);

const merchantEntrySchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
  },
  { strict: false, timestamps: true }
);

const paymentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
  },
  { strict: false, timestamps: true }
);

const onboardingTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
  },
  { strict: false, timestamps: true }
);

const onboardingSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
  },
  { strict: false, timestamps: true }
);

export const MongoBusiness = mongoose.models.Business || mongoose.model<Business>('Business', businessSchema);
export const MongoOffer = mongoose.models.Offer || mongoose.model<Offer>('Offer', offerSchema);
export const MongoCustomer = mongoose.models.Customer || mongoose.model<Customer>('Customer', customerSchema);
export const MongoReward = mongoose.models.Reward || mongoose.model<Reward>('Reward', rewardSchema);
export const MongoReviewLog = mongoose.models.ReviewLog || mongoose.model<ReviewLog>('ReviewLog', reviewLogSchema);
export const MongoMerchantEntry = mongoose.models.MerchantEntry || mongoose.model<MerchantEntry>('MerchantEntry', merchantEntrySchema);
export const MongoPayment = mongoose.models.Payment || mongoose.model<PaymentRecord>('Payment', paymentSchema);
export const MongoOnboardingToken = mongoose.models.OnboardingToken || mongoose.model<OnboardingToken>('OnboardingToken', onboardingTokenSchema);
export const MongoOnboardingSession = mongoose.models.OnboardingSession || mongoose.model<OnboardingSession>('OnboardingSession', onboardingSessionSchema);