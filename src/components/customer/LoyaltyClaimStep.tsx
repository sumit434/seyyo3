import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { customerService } from '../../services/customerService';
import { safeSessionStorage } from '../../utils/safeStorage';
import { Award, CheckCircle2, KeyRound, Clock, ShieldCheck, ArrowRight, Lock, Zap } from 'lucide-react';

export interface LoyaltyClaimStepProps {
  businessId: string;
  businessName: string;
  customerId: string;
  sessionToken?: string;
  skipRedemptionPin?: boolean;
  voucher: {
    rewardId: string;
    code: string;
    title: string;
    type?: string;
    claimedAt?: string;
  };
  onRedeemed: () => void;
  onContinue: () => void;
}

export const LoyaltyClaimStep: React.FC<LoyaltyClaimStepProps> = ({
  businessId,
  businessName,
  customerId,
  voucher,
  skipRedemptionPin = false,
  onRedeemed,
  onContinue,
}) => {
  const [staffPin, setStaffPin] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [forcePinPad, setForcePinPad] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemedAt, setRedeemedAt] = useState<string | null>(null);

  const isGlanceMode = skipRedemptionPin && !forcePinPad;

  // Track transient in-flight claim attempt in sessionStorage rather than permanent localStorage
  useEffect(() => {
    if (!isRedeemed) {
      safeSessionStorage.setItem(
        `seyo_pending_claim_${voucher.code}`,
        JSON.stringify({ voucherCode: voucher.code, startedAt: new Date().toISOString() })
      );
    } else {
      safeSessionStorage.removeItem(`seyo_pending_claim_${voucher.code}`);
    }
  }, [voucher.code, isRedeemed]);

  const formattedClaimedAt = voucher.claimedAt
    ? new Date(voucher.claimedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleRedeem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = staffPin.trim();

    // 1. Client-Side PIN Validation: strictly 4 digits when not in glance mode
    if (!isGlanceMode && !/^\d{4}$/.test(cleanPin)) {
      setError('Staff PIN must be exactly 4 digits');
      return;
    }

    if (!businessId) {
      setError('Business context missing. Please ask staff for assistance.');
      return;
    }

    setIsRedeeming(true);
    setError(null);
    try {
      await customerService.redeemVoucher(businessId, voucher.code, isGlanceMode ? '' : cleanPin);
      safeSessionStorage.removeItem(`seyo_pending_claim_${voucher.code}`);
      setIsRedeemed(true);
      setRedeemedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setStaffPin('');
      onRedeemed();
    } catch (err: any) {
      const isPinRequired =
        err.status === 409 ||
        err.data?.error === 'PIN_REQUIRED' ||
        err.data?.requiresPin ||
        err.code === 'PIN_REQUIRED' ||
        err.message?.toLowerCase().includes('pin is required') ||
        err.message?.toLowerCase().includes('pin required');

      if (isPinRequired) {
        // Mode flipped midway or PIN required -> gracefully toggle back to 4-digit PIN numpad
        setForcePinPad(true);
        setError('Staff PIN is required for verification');
        return;
      }

      setError(err.message || 'Invalid Staff PIN. Please ask staff to re-enter.');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl border border-[#e2e7e6] shadow-xl overflow-hidden text-left animate-in fade-in duration-200">
      {/* Header / Step Indicator */}
      <div className="bg-[#0e7c66] text-white p-6 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider mb-3">
          <Award className="w-3.5 h-3.5" />
          <span>Step 5: Claim • Milestone Reward</span>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mb-2 text-3xl shadow-xs mx-auto">
          <span>🏆</span>
        </div>
        <h2 className="text-xl font-black leading-tight">{voucher.title}</h2>
        <p className="text-xs text-white/90 mt-0.5">
          {businessName} • Milestone Achieved!
        </p>

        {/* Decorative Scallop Circles */}
        <div className="absolute -left-3 bottom-[-14px] w-7 h-7 rounded-full bg-[#f1f3f2]" />
        <div className="absolute -right-3 bottom-[-14px] w-7 h-7 rounded-full bg-[#f1f3f2]" />
      </div>

      <div className="p-6 space-y-4">
        {/* Reward Card Display */}
        <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] text-center space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#6a787e]">
            Milestone Voucher Code
          </span>
          <div className="font-mono text-2xl font-black text-[#0e7c66] tracking-widest">
            {voucher.code}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6a787e] pt-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Earned today at {formattedClaimedAt}</span>
          </div>
        </div>

        {!isRedeemed ? (
          isGlanceMode ? (
            /* Fast Glance Mode (Rush Hour Mode Active) */
            <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50/70 space-y-3 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wider mx-auto shadow-xs animate-pulse">
                <Zap className="w-3.5 h-3.5" />
                <span>Fast Glance Mode Active</span>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#10181c]">Cashier Visual Verification</h4>
                <p className="text-xs text-[#6a787e] leading-relaxed">
                  Show this screen to your server. Once checked by glance, tap below to redeem immediately without entering a PIN.
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-600 font-semibold text-center">{error}</p>
              )}

              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={() => handleRedeem()}
                isLoading={isRedeeming}
                className="gap-2 bg-[#0e7c66] hover:bg-[#0a6252] text-sm py-3"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Instant Redeem (Glance Verified)</span>
              </Button>

              <button
                type="button"
                onClick={onContinue}
                className="w-full text-center text-xs text-[#6a787e] hover:text-[#10181c] py-1 cursor-pointer"
              >
                Redeem Later & Proceed to Review →
              </button>
            </div>
          ) : (
            /* Standard Staff Redemption Section */
            <form onSubmit={handleRedeem} className="space-y-3 pt-1">
              <div className="text-center">
                <span className="text-xs font-bold text-[#10181c] flex items-center justify-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#0e7c66]" />
                  Staff Redemption
                </span>
                <p className="text-[11px] text-[#6a787e] mt-0.5">
                  Present this screen to staff to redeem your reward.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={staffPin}
                  placeholder="••••"
                  onChange={e => {
                    setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                    if (error) setError(null);
                  }}
                  className="w-full text-center font-mono text-xl font-black tracking-widest py-3 px-4 rounded-xl border border-[#e2e7e6] bg-white focus:outline-none focus:ring-2 focus:ring-[#0e7c66]"
                />

                {error && (
                  <p className="text-xs text-red-600 font-semibold text-center">{error}</p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isRedeeming}
                  disabled={staffPin.length !== 4 || isRedeeming}
                  className="gap-2 bg-[#0e7c66] hover:bg-[#0a6252] text-sm py-3"
                >
                  <span>Verify & Redeem</span>
                  <CheckCircle2 className="w-4 h-4" />
                </Button>

                <button
                  type="button"
                  onClick={onContinue}
                  className="w-full text-center text-xs text-[#6a787e] hover:text-[#10181c] py-1 cursor-pointer"
                >
                  Redeem Later & Proceed to Review →
                </button>
              </div>
            </form>
          )
        ) : (
          /* Success State */
          <div className="space-y-4 text-center animate-in fade-in duration-200">
            <div className="p-3 bg-[#e2f1ec] text-[#0e7c66] rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Reward Redeemed Successfully</span>
              </div>
              {redeemedAt && (
                <span className="text-[11px] text-[#0a6252] font-normal">
                  Redeemed today at {redeemedAt}
                </span>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={onContinue}
              className="gap-2 bg-[#0e7c66] hover:bg-[#0a6252]"
            >
              <span>Continue to Google Review</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6a787e] pt-1">
          <ShieldCheck className="w-4 h-4 text-[#0e7c66]" />
          <span>Server-authoritative tamperproof voucher</span>
        </div>
      </div>
    </div>
  );
};
