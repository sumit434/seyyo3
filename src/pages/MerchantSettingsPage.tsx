import React, { useEffect, useState } from 'react';
import { ALLOWED_COUNTRIES } from '../../shared/constants/countries';
import { staffApi } from '../services/staffApi';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { safeSessionStorage } from '../utils/safeStorage';
import {
  ArrowLeft,
  SlidersHorizontal,
  KeyRound,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  MessageSquare,
  Building2,
  Save,
} from 'lucide-react';

export const MerchantSettingsPage: React.FC = () => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Business state (country locked from onboarding)
  const [business, setBusiness] = useState<{
    id?: string;
    name: string;
    country: string;
    [key: string]: any;
  }>({
    name: '',
    country: 'India',
  });

  const countryConfig =
    ALLOWED_COUNTRIES.find(c => c.name === business.country) ||
    ALLOWED_COUNTRIES.find(c => c.code === business.country) ||
    ALLOWED_COUNTRIES[0];
  const dialDigits = countryConfig.dialCode.replace(/\D/g, '');

  // Settings state
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [skipRedemptionPin, setSkipRedemptionPin] = useState(false);
  const [configuredStaffPin, setConfiguredStaffPin] = useState('••••');
  const [businessName, setBusinessName] = useState('');

  // UI state
  const [showConfiguredPin, setShowConfiguredPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSettings = async (token: string) => {
    try {
      const res = await staffApi.getMerchantSettings(token);
      const bData = res.business || {};
      const bCountry = bData.country || 'India';
      setBusiness({
        ...bData,
        name: bData.name || '',
        country: bCountry,
      });

      const cfg =
        ALLOWED_COUNTRIES.find(c => c.name === bCountry) ||
        ALLOWED_COUNTRIES.find(c => c.code === bCountry) ||
        ALLOWED_COUNTRIES[0];
      const cfgDialDigits = cfg.dialCode.replace(/\D/g, '');

      const rawNumber = res.settings?.whatsappNumber || res.business?.whatsappNumber || '';
      const digitsOnly = rawNumber.replace(/\D/g, '');
      const localDigits = digitsOnly.startsWith(cfgDialDigits)
        ? digitsOnly.slice(cfgDialDigits.length)
        : digitsOnly;

      setWhatsappNumber(localDigits.slice(0, cfg.phoneLength));
      setSkipRedemptionPin(Boolean(res.settings?.skipRedemptionPin ?? res.business?.skipRedemptionPin));
      setConfiguredStaffPin(res.settings?.configuredStaffPin || res.business?.configuredStaffPin || '••••');
      setBusinessName(res.business?.name || '');
      setError(null);
    } catch (err: any) {
      // Fallback to getTerminalData
      try {
        const termData = await staffApi.getTerminalData(token);
        const bData = termData.business || {};
        const bCountry = bData.country || 'India';
        setBusiness({
          ...bData,
          name: bData.name || '',
          country: bCountry,
        });

        const cfg =
          ALLOWED_COUNTRIES.find(c => c.name === bCountry) ||
          ALLOWED_COUNTRIES.find(c => c.code === bCountry) ||
          ALLOWED_COUNTRIES[0];
        const cfgDialDigits = cfg.dialCode.replace(/\D/g, '');

        const rawNumber = termData.business?.whatsappNumber || '';
        const digitsOnly = rawNumber.replace(/\D/g, '');
        const localDigits = digitsOnly.startsWith(cfgDialDigits)
          ? digitsOnly.slice(cfgDialDigits.length)
          : digitsOnly;

        setWhatsappNumber(localDigits.slice(0, cfg.phoneLength));
        setSkipRedemptionPin(Boolean(termData.business?.skipRedemptionPin));
        setConfiguredStaffPin(termData.business?.configuredStaffPin || '••••');
        setBusinessName(termData.business?.name || '');
        setError(null);
      } catch (termErr: any) {
        setError(err.message || termErr.message || 'Failed to load merchant settings');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = safeSessionStorage.getItem('seyo_staff_session');
    if (!token) {
      window.location.href = '/staff/login';
      return;
    }
    setSessionToken(token);
    fetchSettings(token);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;

    if (newStaffPin.trim() && !/^\d{4}$/.test(newStaffPin.trim())) {
      setErrorMessage('Staff PIN must be exactly 4 digits');
      return;
    }

    const cleanDigits = whatsappNumber.replace(/\D/g, '');
    if (cleanDigits && cleanDigits.length !== countryConfig.phoneLength) {
      setErrorMessage(`Enter exactly ${countryConfig.phoneLength} digits for ${business.country}`);
      return;
    }

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const formattedWhatsApp = cleanDigits ? `${dialDigits}${cleanDigits}` : '';
      await staffApi.updateMerchantSettings(sessionToken, {
        whatsappNumber: formattedWhatsApp,
        skipRedemptionPin,
        newStaffPin: newStaffPin.trim() || undefined,
      });

      setSuccessMessage('Settings saved successfully!');
      if (newStaffPin.trim()) {
        setConfiguredStaffPin(newStaffPin.trim());
        setNewStaffPin('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading merchant settings..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Session Expired or Unauthorized"
        message={error}
        actionText="Staff Login"
        onRetry={() => {
          safeSessionStorage.removeItem('seyo_staff_session');
          window.location.href = '/staff/login';
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f3f2] p-3 sm:p-8 text-left">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Top Bar */}
        <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 sm:p-6 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/staff/terminal"
              className="w-10 h-10 rounded-2xl border border-[#e2e7e6] flex items-center justify-center text-[#10181c] hover:bg-[#f1f3f2] transition-colors"
              title="Return to Staff Terminal"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div>
              <h1 className="text-xl font-black text-[#10181c]">Merchant Settings</h1>
              <p className="text-xs text-[#6a787e] mt-0.5">
                {businessName} • Configure WhatsApp Business number, verification PIN & terminal modes
              </p>
            </div>
          </div>

          <a
            href="/merchant/customers"
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-2xl border border-[#e2e7e6] bg-[#f8faf9] hover:bg-[#e2e7e6]/60 text-xs font-bold text-[#10181c] transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Customers</span>
          </a>
        </div>

        {/* Feedback Messages */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-[#e2f1ec] border border-[#0e7c66]/30 text-[#0e7c66] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-[#e2e7e6] p-6 sm:p-8 shadow-sm space-y-6">
          {/* Section 1: WhatsApp Business Phone Input */}
          <div className="space-y-3 pb-6 border-b border-[#e2e7e6]/70">
            <div className="flex items-center gap-2 text-[#10181c]">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">WhatsApp Business Number</h3>
                <p className="text-xs text-[#6a787e]">
                  Official merchant WhatsApp contact number used for customer outreach and support
                </p>
              </div>
            </div>

            <div>
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
          </div>

          {/* Section 2: Rush Hour Mode (Glance Redemption) */}
          <div className="space-y-3 pb-6 border-b border-[#e2e7e6]/70">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[#10181c]">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Rush Hour Fast Mode</h3>
                  <p className="text-xs text-[#6a787e]">
                    Allow cashiers to glance-verify vouchers without entering a 4-digit staff PIN
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSkipRedemptionPin(!skipRedemptionPin)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  skipRedemptionPin ? 'bg-amber-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    skipRedemptionPin ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-[#6a787e] bg-[#f8faf9] p-3 rounded-xl border border-[#e2e7e6]/60">
              {skipRedemptionPin
                ? '⚡ Active: Staff can click "Glance Verify & Redeem" with 0 typing required during peak rush hours.'
                : '🔒 Standard: Staff must enter the 4-digit verification PIN to authorize each voucher redemption.'}
            </p>
          </div>

          {/* Section 3: 4-Digit Staff PIN */}
          <div className="space-y-4 pb-4">
            <div className="flex items-center gap-2 text-[#10181c]">
              <div className="w-8 h-8 rounded-xl bg-[#e2f1ec] text-[#0e7c66] flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Voucher Verification PIN</h3>
                <p className="text-xs text-[#6a787e]">
                  4-digit numeric code required by cashiers to redeem rewards
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e7e6] text-xs">
              <span className="font-semibold text-[#6a787e]">Current Configured PIN:</span>
              <div className="flex items-center gap-2 font-mono font-bold text-sm text-[#10181c]">
                <span>{showConfiguredPin ? configuredStaffPin : '••••'}</span>
                <button
                  type="button"
                  onClick={() => setShowConfiguredPin(!showConfiguredPin)}
                  className="text-[#6a787e] hover:text-[#0e7c66] p-1 cursor-pointer"
                  title={showConfiguredPin ? 'Hide PIN' : 'Reveal PIN'}
                >
                  {showConfiguredPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Input
                label="Set New 4-Digit PIN (Optional)"
                type="password"
                maxLength={4}
                value={newStaffPin}
                onChange={e => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Leave blank to keep existing PIN"
                helperText="Enter 4 numeric digits if you want to update the staff redemption PIN."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSaving}
              className="gap-2 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Merchant Settings</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
