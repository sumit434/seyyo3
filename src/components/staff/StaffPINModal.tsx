import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { staffApi } from '../../services/staffApi';
import { KeyRound, Tag, CheckCircle2, Gift, ShieldCheck } from 'lucide-react';

interface StaffPINModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToken: string;
  initialCode?: string;
  configuredPin?: string;
  skipRedemptionPin?: boolean;
  onSuccess: () => void;
}

export const StaffPINModal: React.FC<StaffPINModalProps> = ({
  isOpen,
  onClose,
  sessionToken,
  initialCode = '',
  configuredPin,
  skipRedemptionPin = false,
  onSuccess,
}) => {
  const [voucherCode, setVoucherCode] = useState(initialCode);
  const [staffPin, setStaffPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVoucherCode(initialCode);
      setStaffPin(configuredPin && /^\d{4}$/.test(configuredPin) ? configuredPin : '');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialCode, configuredPin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      setError('Customer voucher code is required');
      return;
    }
    if (!skipRedemptionPin && !/^\d{4}$/.test(staffPin)) {
      setError('Staff verification PIN must be exactly 4 digits');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await staffApi.redeemVoucher(
        sessionToken,
        voucherCode.trim(),
        skipRedemptionPin ? (staffPin.trim() || '0000') : staffPin.trim()
      );
      setSuccessMsg(res.message || 'Voucher redeemed successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the voucher code and staff PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseConfiguredPin = () => {
    if (configuredPin && /^\d{4}$/.test(configuredPin)) {
      setStaffPin(configuredPin);
      if (error) setError(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Voucher Redemption"
      description="Enter the customer voucher code and the configured Staff PIN to authorize redemption"
      maxWidth="sm"
    >
      {successMsg ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#0e7c66] text-white mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-[#10181c]">{successMsg}</h4>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Configured Staff PIN Reference Card */}
          {configuredPin && (
            <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e7e6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0e7c66]" />
                <div className="text-xs">
                  <span className="text-[#6a787e] font-medium">Configured PIN: </span>
                  <strong className="font-mono text-[#10181c] font-bold">{configuredPin}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseConfiguredPin}
                className="text-xs font-bold text-[#0e7c66] hover:underline cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-[#e2e7e6] shadow-2xs"
              >
                Auto-fill
              </button>
            </div>
          )}

          <Input
            label="Customer Voucher Code"
            placeholder="e.g. SY-7X9K"
            value={voucherCode}
            onChange={e => setVoucherCode(e.target.value.toUpperCase())}
            leftAddon={<Tag className="w-5 h-5 text-[#0e7c66]" />}
            autoFocus
          />

          <Input
            label="Staff PIN"
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={staffPin}
            onChange={e => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            leftAddon={<KeyRound className="w-5 h-5 text-[#0e7c66]" />}
            helperText="Enter your 4-digit merchant staff PIN to verify"
          />

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              disabled={!voucherCode || staffPin.length !== 4}
              className="gap-2"
            >
              <Gift className="w-4 h-4" />
              <span>Redeem Voucher</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
