import React, { useState, useRef } from 'react';
import { staffApi } from '../../services/staffApi';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import {
  Building2,
  Smile,
  Star,
  Globe,
  Instagram,
  Facebook,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Upload,
  Trash2,
  Zap,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Business } from '../../../shared/types/business';
import { ALLOWED_COUNTRIES } from '../../../shared/constants/countries';
import { updateStaffTerminalSettings } from '../../services/staffService';

interface MerchantProfileTabProps {
  business: Business;
  sessionToken: string;
  onUpdated: () => Promise<void>;
}

const COMMON_EMOJIS = ['🏪', '🍕', '☕', '🍔', '💇', '🌮', '🍣', '🍦', '🍷', '🏋️', '🧁', '🥗'];

export const MerchantProfileTab: React.FC<MerchantProfileTabProps> = ({
  business,
  sessionToken,
  onUpdated,
}) => {
  const businessCountry = business.country || 'India';
  const countryConfig =
    ALLOWED_COUNTRIES.find(c => c.name === businessCountry) ||
    ALLOWED_COUNTRIES.find(c => c.code === businessCountry) ||
    ALLOWED_COUNTRIES[0];
  const dialDigits = countryConfig.dialCode.replace(/\D/g, '');

  const initialWaDigits = (business.whatsappNumber || '').replace(/\D/g, '');
  const strippedWa = initialWaDigits.startsWith(dialDigits)
    ? initialWaDigits.slice(dialDigits.length)
    : initialWaDigits;

  const [name, setName] = useState(business.name || '');
  const [logoEmoji, setLogoEmoji] = useState(business.logoEmoji || '🏪');
  const [logoUrl, setLogoUrl] = useState(business.logoUrl || '');
  const [googleReviewUrl, setGoogleReviewUrl] = useState(business.googleReviewUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(business.instagramUrl || '');
  const [websiteUrl, setWebsiteUrl] = useState((business as any).websiteUrl || '');
  const [facebookUrl, setFacebookUrl] = useState((business as any).facebookUrl || '');
  const [zomatoUrl, setZomatoUrl] = useState(business.zomatoUrl || '');
  const [swiggyUrl, setSwiggyUrl] = useState(business.swiggyUrl || '');
  const [whatsappNumber, setWhatsappNumber] = useState(strippedWa.slice(0, countryConfig.phoneLength));

  // Fast Redemption Switch State & Staff PIN
  const [skipRedemptionPin, setSkipRedemptionPin] = useState(Boolean(business.skipRedemptionPin));
  const [isUpdatingFastMode, setIsUpdatingFastMode] = useState(false);
  const [newStaffPin, setNewStaffPin] = useState('');
  const [showConfiguredPin, setShowConfiguredPin] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleFastMode = async () => {
    const nextState = !skipRedemptionPin;
    setIsUpdatingFastMode(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await updateStaffTerminalSettings({
        skipRedemptionPin: nextState,
      });
      if (res.success) {
        setSkipRedemptionPin(nextState);
        setSuccessMessage(
          nextState
            ? 'Rush Hour Mode activated! Cashiers can now glance-verify vouchers without typing PIN.'
            : 'Standard PIN mode activated. 4-digit PIN is now required for all redemptions.'
        );
        await onUpdated();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update fast redemption mode');
    } finally {
      setIsUpdatingFastMode(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = newStaffPin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      setErrorMessage('Staff PIN must be exactly 4 digits');
      return;
    }

    setIsUpdatingPin(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await updateStaffTerminalSettings({
        newStaffPin: cleanPin,
      });
      if (res.success) {
        setNewStaffPin('');
        setSuccessMessage('4-digit Voucher Redemption PIN updated successfully!');
        await onUpdated();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update PIN');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type: .jpg, .jpeg, .png
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    const hasValidMime = validMimes.includes(file.type.toLowerCase());

    if (!hasValidExt && !hasValidMime) {
      setErrorMessage('Invalid file type. Only .jpg, .jpeg, and .png images are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage('Logo image must be under 3MB in size.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read selected image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogoImage = () => {
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Business name cannot be empty');
      return;
    }

    const cleanDigits = whatsappNumber.replace(/\D/g, '');
    if (cleanDigits && cleanDigits.length !== countryConfig.phoneLength) {
      setErrorMessage(`Enter exactly ${countryConfig.phoneLength} digits for ${business.country}`);
      return;
    }

    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await staffApi.updateProfile(sessionToken, {
        name: name.trim(),
        logoEmoji: logoEmoji.trim() || '🏪',
        logoUrl: logoUrl.trim(),
        accentColor: business.accentColor || '#0e7c66',
        googleReviewUrl: googleReviewUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        websiteUrl: websiteUrl.trim(),
        facebookUrl: facebookUrl.trim(),
        zomatoUrl: zomatoUrl.trim(),
        swiggyUrl: swiggyUrl.trim(),
        whatsappNumber: cleanDigits ? `${dialDigits}${cleanDigits}` : '',
      });

      if (res.success) {
        setSuccessMessage('Merchant profile and branding updated successfully!');
        await onUpdated();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-lg font-bold text-[#10181c] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0e7c66]" />
            <span>Merchant Profile & Branding</span>
          </h3>
          <p className="text-xs text-[#6a787e] mt-0.5">
            Configure your business details, branding logo, Google review link, and social profiles.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-[#e2f1ec] border border-[#0e7c66]/30 text-[#0a6252] text-sm font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-[#0e7c66] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* First Card: Store Name & Display Information */}
        <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e7e6]">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0e7c66]" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#10181c]">
                Store Name & Display Information
              </h4>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0e7c66] bg-[#e2f1ec] px-2.5 py-0.5 rounded-full">
              {business.tier} Plan
            </span>
          </div>

          {/* Row 1: Store Name and WhatsApp Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Business / Merchant Name"
              type="text"
              required
              placeholder="e.g. Bella Napoli Pizzeria"
              value={name}
              onChange={e => setName(e.target.value)}
              helperText="Displayed across customer mobile screens, terminal, and receipts"
            />

            <Input
              label="WhatsApp Business Number"
              placeholder={`Enter ${countryConfig.phoneLength} digits`}
              value={whatsappNumber}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, countryConfig.phoneLength);
                setWhatsappNumber(digits);
              }}
              // Fixed, non-changeable dial code derived from onboarding profile
              leftAddon={
                <span className="text-sm font-semibold text-emerald-700 select-none">
                  {countryConfig.dialCode}
                </span>
              }
              helperText={`Fixed to account country: ${business.country} (${countryConfig.phoneLength} digits)`}
            />
          </div>

          {/* Row 2: Logo & Profile Image upload sub-card */}
          <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6a787e] flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-[#0e7c66]" />
                Logo & Avatar
              </span>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogoImage}
                  className="text-[11px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="w-full flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl border border-[#e2e7e6] bg-white flex items-center justify-center text-3xl overflow-hidden shrink-0 shadow-xs">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span>{logoEmoji}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 h-14 px-4 bg-white hover:bg-[#e2e7e6]/50 border border-[#e2e7e6] text-[#10181c] rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-[#0e7c66]" />
                <span>{logoUrl ? 'Change Image' : 'Upload Image'}</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoFileUpload}
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                className="hidden"
              />
              <span className="shrink-0 text-xs text-[#6a787e] font-medium">Max 3MB PNG / JPG</span>
            </div>

            {/* Emoji Presets */}
            <div className="pt-2 border-t border-[#e2e7e6]/70 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#6a787e] font-semibold shrink-0">Preset Emojis:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {COMMON_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setLogoEmoji(emoji)}
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
        </div>

        {/* Second Card: Terminal & Brand Settings */}
        <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 sm:p-6 shadow-xs space-y-4">
          <div className="pb-2 border-b border-[#e2e7e6]">
            <h3 className="text-base font-bold text-[#10181c]">Terminal & Brand Settings</h3>
            <p className="text-xs text-[#6a787e]">Configure redemption PIN and fast voucher verification preferences</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Voucher Redemption PIN */}
            <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6a787e] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#0e7c66]" />
                  Voucher Redemption PIN
                </span>
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#10181c]">
                  <span>{showConfiguredPin ? (business.configuredStaffPin || '7788') : '••••'}</span>
                  <button
                    type="button"
                    onClick={() => setShowConfiguredPin(!showConfiguredPin)}
                    className="text-[#6a787e] hover:text-[#0e7c66] p-0.5 cursor-pointer"
                  >
                    {showConfiguredPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
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
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleUpdatePin}
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
              </div>
            </div>

            {/* Fast Voucher Redemption (Rush Mode toggle) */}
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
                    : 'PIN verification required: Cashiers must input the store PIN on the customer device.'}
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
          </div>
        </div>

        {/* Section 2: Google Review Link */}
        <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#e2e7e6]">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#10181c]">
              Google Review Link
            </h4>
          </div>
          <p className="text-xs text-[#6a787e]">
            Customers who give high ratings during the feedback stage will be invited to leave a public review on your Google Business profile.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1 w-full">
              <Input
                label="Google Review URL"
                type="url"
                placeholder="https://g.page/r/your-business/review"
                value={googleReviewUrl}
                onChange={e => setGoogleReviewUrl(e.target.value)}
                leftAddon={<Star className="w-4 h-4 text-amber-500" />}
              />
            </div>
            {googleReviewUrl && (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:mt-6 flex items-center justify-center gap-1.5 text-xs font-bold text-[#0e7c66] hover:underline px-4 py-3 min-h-[44px] rounded-xl bg-[#f8faf9] border border-[#e2e7e6]"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Section 3: Social & Web Profiles */}
        <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#e2e7e6]">
            <Globe className="w-4 h-4 text-[#0e7c66]" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#10181c]">
              Social & Web Links
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Instagram Profile"
              type="url"
              placeholder="https://instagram.com/yourbusiness"
              value={instagramUrl}
              onChange={e => setInstagramUrl(e.target.value)}
              leftAddon={<Instagram className="w-4 h-4 text-pink-600" />}
            />

            <Input
              label="Official Website"
              type="url"
              placeholder="https://yourbusiness.com"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              leftAddon={<Globe className="w-4 h-4 text-[#0e7c66]" />}
            />

            <Input
              label="Facebook Page"
              type="url"
              placeholder="https://facebook.com/yourbusiness"
              value={facebookUrl}
              onChange={e => setFacebookUrl(e.target.value)}
              leftAddon={<Facebook className="w-4 h-4 text-blue-600" />}
            />

            <Input
              label="Zomato Page (Optional)"
              type="url"
              placeholder="https://zomato.com/..."
              value={zomatoUrl}
              onChange={e => setZomatoUrl(e.target.value)}
              leftAddon={<Globe className="w-4 h-4 text-red-500" />}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full sm:w-auto px-8 shadow-sm flex items-center justify-center gap-2 min-h-[48px]"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Save Profile & Branding</span>
          </Button>
        </div>
      </form>
    </div>
  );
};