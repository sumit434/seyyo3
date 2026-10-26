import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { updateStaffTerminalSettings } from '../../services/staffService';
import { staffApi } from '../../services/staffApi';
import {
  Zap,
  KeyRound,
  Building2,
  Lock,
  Smile,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { BusinessProfile } from '../../../shared/types/business';

interface StaffProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: any;
  sessionToken: string;
  onUpdated?: () => Promise<void> | void;
}

const COMMON_EMOJIS = ['🏪', '🍕', '☕', '🍔', '💇', '🌮', '🍣', '🍦', '🍷', '🏋️', '🧁', '🥗'];

export const StaffProfileModal: React.FC<StaffProfileModalProps> = ({
  isOpen,
  onClose,
  business,
  sessionToken,
  onUpdated,
}) => {
  // 1. Logo / Avatar State
  const [logoEmoji, setLogoEmoji] = useState(business?.logoEmoji || '🏪');
  const [logoUrl, setLogoUrl] = useState(business?.logoUrl || '');
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Fast Redemption Switch State ("Rush Hour Mode")
  const [skipRedemptionPin, setSkipRedemptionPin] = useState<boolean>(
    Boolean(business?.skipRedemptionPin)
  );
  const [isUpdatingFastMode, setIsUpdatingFastMode] = useState(false);

  // 3. 4-Digit Voucher Redemption PIN State
  const [newStaffPin, setNewStaffPin] = useState('');
  const [showConfiguredPin, setShowConfiguredPin] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Feedback Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keep state updated when business changes
  React.useEffect(() => {
    if (business) {
      setLogoEmoji(business.logoEmoji || '🏪');
      setLogoUrl(business.logoUrl || '');
      setSkipRedemptionPin(Boolean(business.skipRedemptionPin));
    }
  }, [business]);

  // Handlers
  const handleToggleFastMode = async () => {
    const nextState = !skipRedemptionPin;
    setIsUpdatingFastMode(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await updateStaffTerminalSettings({
        skipRedemptionPin: nextState,
      });
      if (res.success) {
        setSkipRedemptionPin(nextState);
        setSuccessMsg(
          nextState
            ? 'Rush Hour Mode activated! Cashiers can now glance-verify vouchers without typing PIN.'
            : 'Standard PIN mode activated. 4-digit PIN is now required for all redemptions.'
        );
        if (onUpdated) await onUpdated();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update fast redemption mode');
    } finally {
      setIsUpdatingFastMode(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = newStaffPin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      setErrorMsg('Staff PIN must be exactly 4 digits');
      return;
    }

    setIsUpdatingPin(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await updateStaffTerminalSettings({
        newStaffPin: cleanPin,
      });
      if (res.success) {
        setNewStaffPin('');
        setSuccessMsg('4-digit Voucher Redemption PIN updated successfully!');
        if (onUpdated) await onUpdated();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update PIN');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Logo file must be under 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const uploadedUrl = reader.result;
        setLogoUrl(uploadedUrl);
        await saveBranding(logoEmoji, uploadedUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveBranding = async (emoji: string, url: string) => {
    setIsUpdatingLogo(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await staffApi.updateProfile(sessionToken, {
        logoEmoji: emoji,
        logoUrl: url,
      });
      setSuccessMsg('Logo updated successfully!');
      if (onUpdated) await onUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save logo');
    } finally {
      setIsUpdatingLogo(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terminal & Brand Settings"
      description="Configure cash register rush mode, voucher PINs, and terminal identity."
      maxWidth="xl"
    >
      <div className="space-y-4 text-left">
        {/* Alerts */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* First Card: Core Settings & Identity */}
        <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#10181c]">Terminal & Brand Settings</h3>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0e7c66] bg-[#e2f1ec] px-2.5 py-0.5 rounded-full">
              {business?.tier} Plan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* 1. Item 1 (Top-Left): Business Logo / Avatar Selector */}
            <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6a787e] flex items-center gap-1.5">
                  <Smile className="w-3.5 h-3.5 text-[#0e7c66]" />
                  Logo & Avatar
                </span>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      setLogoUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      await saveBranding(logoEmoji, '');
                    }}
                    className="text-[11px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl border border-[#e2e7e6] bg-white flex items-center justify-center text-3xl overflow-hidden shrink-0 shadow-xs">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span>{logoEmoji}</span>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUpdatingLogo}
                    className="w-full py-2 px-3 bg-white hover:bg-[#e2e7e6]/50 border border-[#e2e7e6] text-[#10181c] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#0e7c66]" />
                    <span>{logoUrl ? 'Change Image' : 'Upload Image'}</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    className="hidden"
                  />
                  <p className="text-[10px] text-[#6a787e]">Max 3MB PNG / JPG</p>
                </div>
              </div>

              {/* Emoji Presets */}
              <div className="pt-2 border-t border-[#e2e7e6]/70">
                <p className="text-[10px] text-[#6a787e] font-semibold mb-1.5">Preset Emojis:</p>
                <div className="flex flex-wrap gap-1">
                  {COMMON_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={async () => {
                        setLogoEmoji(emoji);
                        await saveBranding(emoji, logoUrl);
                      }}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-colors cursor-pointer border ${
                        logoEmoji === emoji && !logoUrl
                          ? 'border-[#0e7c66] bg-[#e2f1ec]'
                          : 'border-transparent hover:bg-white bg-white/50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Item 2 (Top-Right): Fast Redemption Toggle Switch ("Rush Hour Mode") */}
            <div
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                skipRedemptionPin
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-[#f8faf9] border-[#e2e7e6]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6a787e] flex items-center gap-1.5">
                  <Zap className={`w-3.5 h-3.5 ${skipRedemptionPin ? 'text-amber-600' : 'text-[#0e7c66]'}`} />
                  Rush Hour Mode
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    skipRedemptionPin
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-gray-200 text-[#6a787e]'
                  }`}
                >
                  {skipRedemptionPin ? 'ON (Fast Glance)' : 'OFF (PIN Mode)'}
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#10181c]">Fast Voucher Redemption</h4>
                <p className="text-xs text-[#6a787e] leading-relaxed">
                  {skipRedemptionPin
                    ? 'Glance Mode active: Cashiers visually verify coupons without typing the 4-digit PIN on customer phones.'
                    : 'PIN verification required: Cashiers must input the store PIN on the customer device to mark rewards as redeemed.'}
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="pt-2 flex items-center justify-between border-t border-[#e2e7e6]/70">
                <span className="text-xs font-semibold text-[#10181c]">
                  {skipRedemptionPin ? 'Bypass 4-digit PIN' : 'Require 4-digit PIN'}
                </span>

                <button
                  type="button"
                  onClick={handleToggleFastMode}
                  disabled={isUpdatingFastMode}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                    skipRedemptionPin ? 'bg-[#0e7c66]' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={skipRedemptionPin}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      skipRedemptionPin ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 3. Item 3 (Bottom-Left): Update 4-Digit Voucher Redemption PIN */}
            <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6a787e] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#0e7c66]" />
                  Voucher Redemption PIN
                </span>
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#10181c]">
                  <span>{showConfiguredPin ? (business?.configuredStaffPin || '7788') : '••••'}</span>
                  <button
                    type="button"
                    onClick={() => setShowConfiguredPin(!showConfiguredPin)}
                    className="text-[#6a787e] hover:text-[#0e7c66] p-0.5 cursor-pointer"
                  >
                    {showConfiguredPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdatePin} className="space-y-2">
                <label className="text-[11px] font-semibold text-[#10181c] block">
                  Set New 4-Digit PIN:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 5566"
                    value={newStaffPin}
                    onChange={e => setNewStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full text-center text-sm font-mono tracking-widest py-2 px-3 rounded-xl border border-[#e2e7e6] bg-white focus:outline-none focus:ring-2 focus:ring-[#0e7c66]"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={newStaffPin.length !== 4 || isUpdatingPin}
                    isLoading={isUpdatingPin}
                    className="shrink-0 px-3"
                  >
                    Save PIN
                  </Button>
                </div>
                <p className="text-[10px] text-[#6a787e]">
                  Salted & hashed with PBKDF2. Never shown in customer plaintext.
                </p>
              </form>
            </div>

            {/* 4. Item 4 (Bottom-Right): Staff Portal Password (or Category / Branch Label) */}
            <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6a787e] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#0e7c66]" />
                Store Branch & Category
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#e2e7e6]/70">
                  <span className="text-[#6a787e]">Category</span>
                  <span className="font-bold text-[#10181c]">{business?.category || 'General Store'}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-[#e2e7e6]/70">
                  <span className="text-[#6a787e]">Location</span>
                  <span className="font-bold text-[#10181c]">
                    {business?.city}, {business?.country}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6a787e]">Login Slug</span>
                  <span className="font-mono font-bold text-[#0e7c66]">{business?.slug}</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white border border-[#e2e7e6] flex items-center gap-2 text-[11px] text-[#6a787e]">
                <Lock className="w-3.5 h-3.5 text-[#0e7c66] shrink-0" />
                <span>Staff Portal Password configured during merchant onboarding</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#e2e7e6]/70">
          <div className="flex items-center gap-2">
            <a
              href="/merchant/customers"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              Customer Directory (WhatsApp) →
            </a>
            <a
              href="/merchant/settings"
              className="text-xs font-bold text-[#0e7c66] hover:text-[#0a6252] bg-[#f8faf9] hover:bg-[#e2e7e6]/60 border border-[#e2e7e6] px-3 py-1.5 rounded-xl transition-colors"
            >
              Full Settings →
            </a>
          </div>
          <Button onClick={onClose} variant="primary" size="md" className="px-6 w-full sm:w-auto">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
