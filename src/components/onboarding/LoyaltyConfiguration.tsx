import React, { useState, useEffect } from 'react';
import { MIN_LOYALTY_TARGET, MAX_LOYALTY_TARGET, MIN_VALIDATION_DAYS, MAX_VALIDATION_DAYS } from '../../../shared/constants/limits';
import { Input } from '../common/Input';
import { Award, Calendar, Target } from 'lucide-react';

interface LoyaltyConfigurationProps {
  loyaltyTarget: number;
  loyaltyValidationDays: number;
  loyaltyReward: string;
  onChange: (fields: { loyaltyTarget?: number; loyaltyValidationDays?: number; loyaltyReward?: string }) => void;
  errors?: { [key: string]: string };
}

export const LoyaltyConfiguration: React.FC<LoyaltyConfigurationProps> = ({
  loyaltyTarget,
  loyaltyValidationDays,
  loyaltyReward,
  onChange,
  errors = {},
}) => {
  // Allow free text typing, complete backspacing, and intermediate digits
  const [validityDays, setValidityDays] = useState<string>(
    loyaltyValidationDays !== undefined ? String(loyaltyValidationDays) : '30'
  );
  const [targetVisits, setTargetVisits] = useState<string>(
    loyaltyTarget !== undefined ? String(loyaltyTarget) : '6'
  );

  // Synchronize when external props change
  useEffect(() => {
    if (loyaltyValidationDays !== undefined && String(loyaltyValidationDays) !== validityDays && validityDays !== '') {
      setValidityDays(String(loyaltyValidationDays));
    }
  }, [loyaltyValidationDays]);

  useEffect(() => {
    if (loyaltyTarget !== undefined && String(loyaltyTarget) !== targetVisits && targetVisits !== '') {
      setTargetVisits(String(loyaltyTarget));
    }
  }, [loyaltyTarget]);

  const handleValidityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty input so user can backspace freely
    if (val === '') {
      setValidityDays('');
      return;
    }
    // Only allow numeric digits
    if (/^\d+$/.test(val)) {
      setValidityDays(val);
      const num = Number(val);
      if (num >= MIN_VALIDATION_DAYS && num <= MAX_VALIDATION_DAYS) {
        onChange({ loyaltyValidationDays: num });
      }
    }
  };

  const handleValidityBlur = () => {
    const numericVal = Number(validityDays);
    if (!validityDays || isNaN(numericVal) || numericVal < MIN_VALIDATION_DAYS) {
      setValidityDays(String(MIN_VALIDATION_DAYS));
      onChange({ loyaltyValidationDays: MIN_VALIDATION_DAYS });
    } else if (numericVal > MAX_VALIDATION_DAYS) {
      setValidityDays(String(MAX_VALIDATION_DAYS));
      onChange({ loyaltyValidationDays: MAX_VALIDATION_DAYS });
    } else {
      setValidityDays(String(numericVal));
      onChange({ loyaltyValidationDays: numericVal });
    }
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setTargetVisits('');
      return;
    }
    if (/^\d+$/.test(val)) {
      setTargetVisits(val);
      const num = Number(val);
      if (num >= MIN_LOYALTY_TARGET && num <= MAX_LOYALTY_TARGET) {
        onChange({ loyaltyTarget: num });
      }
    }
  };

  const handleTargetBlur = () => {
    const numericVal = Number(targetVisits);
    if (!targetVisits || isNaN(numericVal) || numericVal < MIN_LOYALTY_TARGET) {
      setTargetVisits(String(MIN_LOYALTY_TARGET));
      onChange({ loyaltyTarget: MIN_LOYALTY_TARGET });
    } else if (numericVal > MAX_LOYALTY_TARGET) {
      setTargetVisits(String(MAX_LOYALTY_TARGET));
      onChange({ loyaltyTarget: MAX_LOYALTY_TARGET });
    } else {
      setTargetVisits(String(numericVal));
      onChange({ loyaltyTarget: numericVal });
    }
  };

  return (
    <div className="space-y-4 bg-white p-6 rounded-3xl border border-[#e2e7e6] text-left">
      <div className="pb-3 border-b border-[#e2e7e6]">
        <h3 className="text-lg font-bold text-[#10181c] flex items-center gap-2">
          <span>Digital Stamp Card & Milestones</span>
        </h3>
        <p className="text-xs text-[#6a787e] mt-0.5">
          Customers collect 1 stamp per calendar day. Visit target and validation days are independent.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={`Visit Milestone Target (${MIN_LOYALTY_TARGET}–${MAX_LOYALTY_TARGET} visits)`}
          type="text"
          inputMode="numeric"
          value={targetVisits}
          onChange={handleTargetChange}
          onBlur={handleTargetBlur}
          placeholder="e.g. 6"
          error={errors.loyaltyTarget}
          helperText="Number of visits required to unlock the loyalty voucher."
          leftAddon={<Target className="w-5 h-5 text-[#0e7c66]" />}
        />

        <Input
          label={`Validation Window (${MIN_VALIDATION_DAYS}–${MAX_VALIDATION_DAYS} days)`}
          type="text"
          inputMode="numeric"
          value={validityDays}
          onChange={handleValidityChange}
          onBlur={handleValidityBlur}
          placeholder="e.g. 30"
          error={errors.loyaltyValidationDays}
          helperText="Independent cycle validity window before visit stamps expire."
          leftAddon={<Calendar className="w-5 h-5 text-[#0e7c66]" />}
        />
      </div>

      <Input
        label="Milestone Reward Prize Title"
        placeholder="e.g. Free Wood-Fired Margherita Pizza, 50% Off Total Bill"
        value={loyaltyReward}
        onChange={e => onChange({ loyaltyReward: e.target.value })}
        error={errors.loyaltyReward}
        helperText="The high-value voucher awarded when customer reaches their visit milestone."
        leftAddon={<Award className="w-5 h-5 text-[#0e7c66]" />}
      />
    </div>
  );
};
