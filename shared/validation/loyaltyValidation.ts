import { MIN_LOYALTY_TARGET, MAX_LOYALTY_TARGET, MIN_VALIDATION_DAYS, MAX_VALIDATION_DAYS } from '../constants/limits';
import { ValidationResult } from './spinValidation';

export function validateLoyaltyConfiguration(
  target: number | undefined,
  validationDays: number | undefined,
  reward: string | undefined
): ValidationResult {
  if (typeof target !== 'number' || isNaN(target)) {
    return { valid: false, error: 'Loyalty visit target is required' };
  }
  if (target < MIN_LOYALTY_TARGET || target > MAX_LOYALTY_TARGET) {
    return { valid: false, error: `Loyalty target must be between ${MIN_LOYALTY_TARGET} and ${MAX_LOYALTY_TARGET} visits` };
  }

  if (typeof validationDays !== 'number' || isNaN(validationDays)) {
    return { valid: false, error: 'Validation days is required' };
  }
  if (validationDays < MIN_VALIDATION_DAYS || validationDays > MAX_VALIDATION_DAYS) {
    return { valid: false, error: `Validation days must be between ${MIN_VALIDATION_DAYS} and ${MAX_VALIDATION_DAYS} days` };
  }

  if (!reward || !reward.trim()) {
    return { valid: false, error: 'Loyalty milestone reward cannot be empty' };
  }

  return { valid: true };
}
