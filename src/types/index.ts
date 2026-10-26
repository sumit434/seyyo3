export * from '../../shared/types/business';
export * from '../../shared/types/customer';
export * from '../../shared/types/offer';
export * from '../../shared/types/reward';
export * from '../../shared/types/session';
export * from '../../shared/types/review';
export * from '../../shared/types/qr';
export * from '../../shared/types/payment';
export * from '../../shared/types/onboarding';

import { Business as SharedBusiness } from '../../shared/types/business';
import { Customer as SharedCustomer } from '../../shared/types/customer';

export type Business = SharedBusiness;
export type Customer = SharedCustomer;
