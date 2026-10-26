import { MIN_SPIN_SLICES, MAX_SPIN_SLICES } from '../constants/limits';
import { SpinSliceConfig } from '../types/business';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSpinConfiguration(slices: SpinSliceConfig[] | undefined): ValidationResult {
  if (!slices || !Array.isArray(slices)) {
    return { valid: false, error: 'Spin slices array is required' };
  }

  if (slices.length < MIN_SPIN_SLICES) {
    return { valid: false, error: `Minimum ${MIN_SPIN_SLICES} slices required` };
  }

  if (slices.length > MAX_SPIN_SLICES) {
    return { valid: false, error: `Maximum ${MAX_SPIN_SLICES} slices allowed` };
  }

  let totalWeight = 0;
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    if (!slice.rewardLabel || !slice.rewardLabel.trim()) {
      return { valid: false, error: `Slice ${i + 1} reward label cannot be empty` };
    }
    if (typeof slice.weight !== 'number' || slice.weight <= 0) {
      return { valid: false, error: `Slice ${i + 1} must have a positive weight` };
    }
    totalWeight += slice.weight;
  }

  // Weight total MUST equal 100%
  if (Math.round(totalWeight) !== 100) {
    return { valid: false, error: `Slice weights must sum to exactly 100% (currently ${totalWeight}%)` };
  }

  return { valid: true };
}
