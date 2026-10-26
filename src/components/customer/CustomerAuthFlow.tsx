import React, { useState, useEffect } from 'react';
import {
  ALLOWED_COUNTRIES,
  getCountryPhoneLength,
  detectDefaultCountryCode,
  getCountryPhoneConstraint,
} from '../../../shared/constants/countries';
import { isValidCountryPhoneNumber } from '../../../shared/validation/phoneValidation';
import { customerAuthService } from '../../services/customerAuthService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { User, ArrowRight, ShieldCheck, Sparkles, Radio, KeyRound, RotateCcw, Clock } from 'lucide-react';
import { CustomerStatusResponse } from '../../../shared/types/qr';

interface CustomerAuthFlowProps {
  businessId: string;
  businessName: string;
  logoEmoji: string;
  accentColor: string;
  sessionKey?: string;
  isViewOnly?: boolean;
  merchantCountry?: string;
  onAuthenticated: (payload: { sessionToken: string; sessionKey?: string } & CustomerStatusResponse) => void;
}

export const CustomerAuthFlow: React.FC<CustomerAuthFlowProps> = ({
  businessId,
  businessName,
  logoEmoji,
  accentColor,
  sessionKey,
  isViewOnly = false,
  merchantCountry,
  onAuthenticated,
}) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countryCode, setCountryCode] = useState(() => detectDefaultCountryCode(merchantCountry));
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (merchantCountry) {
      setCountryCode(detectDefaultCountryCode(merchantCountry));
    }
  }, [merchantCountry]);

  const selectedCountry = ALLOWED_COUNTRIES.find(c => c.dialCode === countryCode) || ALLOWED_COUNTRIES[0];
  const constraint = getCountryPhoneConstraint(countryCode);

  const handleCountryCodeChange = (newCode: string) => {
    setCountryCode(newCode);
    const newConstraint = getCountryPhoneConstraint(newCode);
    if (mobile.length > newConstraint.maxLength) {
      setMobile(mobile.slice(0, newConstraint.maxLength));
    }
    setError(null);
  };

  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, constraint.maxLength);
    setMobile(clean);
    setError(null);
  };

  // Trigger silent autofill lookup against GET /api/customers/lookup?phone=... when input reaches required digit length
  useEffect(() => {
    const cleanDigits = mobile.replace(/\D/g, '');
    if (cleanDigits.length === constraint.maxLength) {
      const fullPhone = `${countryCode}${cleanDigits}`;
      const lookupUrl = `/api/customers/lookup?phone=${encodeURIComponent(fullPhone)}&businessId=${encodeURIComponent(businessId)}`;

      fetch(lookupUrl)
        .then(res => res.json())
        .then(data => {
          if (data?.success && data?.found && data?.customer) {
            // Auto-populate customer's name if empty
            if (!name.trim() && data.customer.name) {
              setName(data.customer.name);
            }
          }
        })
        .catch(() => {
          // Silent ignore
        });
    }
  }, [mobile, countryCode, constraint.maxLength, businessId]);

  const handleAuthError = (err: any) => {
    if (
      err.status === 403 ||
      err.code === 'SESSION_ALREADY_USED' ||
      err.data?.error === 'SESSION_ALREADY_USED' ||
      err.message?.toLowerCase().includes('already used') ||
      err.message?.toLowerCase().includes('expired') ||
      err.message?.includes('403')
    ) {
      setError('Token already used or expired');
    } else {
      setError(err.message || 'Unable to start customer session. Please try again.');
    }
  };

  // Step 1: Submit Phone Number (Checks if OTP challenge is needed or bypassed)
  const handleSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly || !sessionKey) {
      setError('Tap the NFC tag at the counter to collect your stamp.');
      return;
    }

    const cleanDigits = mobile.replace(/\D/g, '');
    if (!isValidCountryPhoneNumber(cleanDigits, countryCode)) {
      setError(`Please enter a valid ${constraint.maxLength}-digit phone number for ${selectedCountry.name}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Send OTP challenge via MSG91
      const otpRes = await customerAuthService.sendOtp(businessId, cleanDigits, countryCode, sessionKey);

      // 2. Conditional Bypass Check:
      // If backend flags OTP as bypassed or muted (ENABLE_PHONE_OTP=false),
      // skip the 6-digit OTP input step and immediately auto-advance into customer experience!
      if (otpRes.bypass || otpRes.otpBypassed || otpRes.verified) {
        const directRes = await customerAuthService.identify(
          businessId,
          cleanDigits,
          name.trim() || undefined,
          countryCode,
          sessionKey
        );
        onAuthenticated(directRes);
        return;
      }

      // If OTP is actively enforced, transition to 6-digit OTP entry step
      setStep('otp');
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify 6-Digit OTP (Only reached when ENABLE_PHONE_OTP=true)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = otpCode.replace(/\D/g, '');
    if (cleanDigits.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await customerAuthService.verifyOtp(
        businessId,
        mobile.replace(/\D/g, ''),
        cleanDigits,
        name.trim() || undefined,
        countryCode,
        sessionKey
      );
      onAuthenticated(res);
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl border border-[#e2e7e6] shadow-lg p-6 sm:p-8 text-left">
      <div className="flex flex-col items-center text-center mb-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm mb-3 border border-[#e2e7e6]"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <span>{logoEmoji}</span>
        </div>
        <h2 className="text-xl font-bold text-[#10181c]">{businessName}</h2>
        <p className="text-xs text-[#6a787e] mt-1">
          {step === 'otp'
            ? `Enter the 6-digit code sent to ${countryCode} ${mobile}`
            : "Enter your mobile number to unlock today's rewards"}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {isViewOnly && (
        <div className="mb-5 p-4 rounded-2xl bg-[#e2f1ec] border border-[#0e7c66]/30 text-center space-y-1.5 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-[#0e7c66] text-white flex items-center justify-center mx-auto mb-1">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <h3 className="font-extrabold text-[#10181c] text-sm leading-snug">
            Tap the NFC tag at the counter to collect your stamp.
          </h3>
          <p className="text-xs text-[#6a787e]">
            This station is in view-only mode. Tap the physical NFC tag at the counter to unlock your rewards.
          </p>
        </div>
      )}

      {step === 'phone' ? (
        <form onSubmit={handleSubmitPhone} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#10181c]">Mobile Number</label>

            <div className="flex gap-2 w-full min-w-0">
              <select
                value={countryCode}
                disabled={isViewOnly}
                onChange={e => handleCountryCodeChange(e.target.value)}
                className="w-28 shrink-0 rounded-2xl border border-[#e2e7e6] bg-white px-2 py-3.5 text-base font-semibold text-[#10181c] focus:outline-none focus:ring-2 focus:ring-[#0e7c66] disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {ALLOWED_COUNTRIES.map(c => (
                  <option key={c.code} value={c.dialCode}>
                    {c.flagEmoji} {c.dialCode}
                  </option>
                ))}
              </select>

              <input
                type="tel"
                name="tel"
                id="mobile-input"
                autoComplete="tel"
                inputMode="tel"
                pattern="[0-9]*"
                maxLength={constraint.maxLength}
                placeholder={`Enter ${constraint.maxLength} digits`}
                value={mobile}
                disabled={isViewOnly}
                onChange={e => handleMobileChange(e.target.value)}
                className="w-full min-w-0 flex-1 truncate rounded-2xl border border-[#e2e7e6] bg-white px-4 py-3.5 text-base text-[#10181c] font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#0e7c66] disabled:bg-gray-100 disabled:cursor-not-allowed"
                autoFocus={!isViewOnly}
              />
            </div>
            <p className="text-[11px] text-[#6a787e] px-1">
              {selectedCountry.name} ({countryCode}) requires exactly {constraint.maxLength} digits
            </p>
          </div>

          <Input
            label="Your Name"
            type="text"
            placeholder="e.g. Alex Chen"
            value={name}
            disabled={isViewOnly}
            onChange={e => setName(e.target.value)}
            leftAddon={<User className="w-5 h-5 text-[#0e7c66]" />}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isViewOnly}
            isLoading={isLoading}
            className="gap-2 shadow-sm"
          >
            {isViewOnly ? (
              <span>Tap NFC Tag at Counter to Unlock</span>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>

          <p className="text-[11px] text-[#6a787e] text-center mt-3 leading-relaxed px-1">
            By continuing, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#0e7c66] underline font-medium hover:text-[#0a6252]">
              Terms
            </a>{' '}
            and consent to receive loyalty updates, stamp notifications, and vouchers on WhatsApp. Reply STOP to opt out anytime.
          </p>
        </form>
      ) : (
        /* OTP Step: Only reached when ENABLE_PHONE_OTP is true */
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#10181c]">6-Digit Verification Code</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-2xl font-mono tracking-[0.3em] font-bold py-3 px-4 rounded-2xl border border-[#e2e7e6] bg-white focus:outline-none focus:ring-2 focus:ring-[#0e7c66]"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-[#6a787e] px-1 text-center">
              Sent via WhatsApp / SMS to {countryCode} {mobile}
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={otpCode.length !== 6 || isLoading}
            isLoading={isLoading}
            className="gap-2 shadow-sm"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Verify & Continue</span>
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setError(null);
            }}
            className="w-full text-xs text-[#0e7c66] hover:underline font-semibold flex items-center justify-center gap-1 cursor-pointer pt-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Change phone number</span>
          </button>
        </form>
      )}
    </div>
  );
};
