import React, { useState } from 'react';
import { OnboardingDraftData } from '../../../shared/types/onboarding';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ArrowLeft, ArrowRight, Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { validateOnboardingSecurity } from '../../../shared/validation/offerValidation';

interface SecurityStepProps {
  initialData: OnboardingDraftData;
  onNext: (data: Partial<OnboardingDraftData>) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const SecurityStep: React.FC<SecurityStepProps> = ({ initialData, onNext, onBack, isLoading }) => {
  const [staffPassword, setStaffPassword] = useState(initialData.staffPassword || '');
  const [staffPin, setStaffPin] = useState(initialData.staffPin || '');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handlePinChange = (val: string) => {
    // Only numbers, max 4 digits
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    setStaffPin(cleaned);
    if (errors.staffPin) setErrors({ ...errors, staffPin: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidateData: OnboardingDraftData = {
      staffPassword,
      staffPin,
    };

    const valResult = validateOnboardingSecurity(candidateData);
    if (!valResult.valid) {
      if (!staffPassword || staffPassword.length < 6) {
        setErrors({ staffPassword: 'Staff password must be at least 6 characters' });
      } else if (!staffPin || !/^\d{4}$/.test(staffPin)) {
        setErrors({ staffPin: 'Verification PIN must be exactly 4 digits' });
      } else {
        setErrors({ form: valResult.error || 'Please correct security fields' });
      }
      return;
    }

    onNext(candidateData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left pb-6 sm:pb-0">
      <div>
        <h2 className="text-2xl font-bold text-[#10181c]">Staff Security & Verification PIN</h2>
        <p className="text-sm text-[#6a787e] mt-1">
          Protect your staff terminal and enable on-site reward redemption with an encrypted 4-digit PIN.
        </p>
      </div>

      <div className="bg-[#e2f1ec]/60 border border-[#0e7c66]/20 p-4 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#0e7c66] shrink-0 mt-0.5" />
        <p className="text-xs text-[#0a6252] leading-relaxed">
          <strong>Security Notice:</strong> The 4-digit PIN is cryptographically salted and hashed. It is never displayed back to customers or stored in plaintext. Staff enter this PIN on the customer&apos;s phone to redeem vouchers.
        </p>
      </div>

      <div className="space-y-4 pb-6 sm:pb-0">
        <Input
          label="Staff Portal Login Password"
          type="password"
          placeholder="At least 6 characters"
          value={staffPassword}
          onChange={e => {
            setStaffPassword(e.target.value);
            if (errors.staffPassword) setErrors({ ...errors, staffPassword: '' });
          }}
          error={errors.staffPassword}
          helperText="Used to log in to /staff/login on mobile, tablet, or POS terminal."
          leftAddon={<Lock className="w-5 h-5" />}
        />

        <div className="space-y-1.5">
          <Input
            label="Staff 4-Digit Voucher Redemption PIN"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="e.g. 7788"
            value={staffPin}
            onChange={e => handlePinChange(e.target.value)}
            error={errors.staffPin}
            helperText="4 numeric digits entered by staff to verify reward redemptions."
            leftAddon={<KeyRound className="w-5 h-5" />}
          />
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar / Desktop Inline Buttons */}
      <div className="fixed sm:static bottom-0 inset-x-0 p-4 sm:p-0 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-t-0 border-[#e2e7e6] z-30 mt-4 pt-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg sm:shadow-none w-full">
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={onBack}
          className="gap-2 min-h-[48px] px-4 sm:px-5 sm:w-auto"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          className="gap-2 min-h-[48px] px-5 sm:px-6 sm:w-auto"
        >
          <span>Review & Launch</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </form>
  );
};