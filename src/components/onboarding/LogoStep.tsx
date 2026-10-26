import React, { useState, useRef } from 'react';
import { OnboardingDraftData } from '../../../shared/types/onboarding';
import { Button } from '../common/Button';
import { ArrowLeft, ArrowRight, Upload, Sparkles, Check } from 'lucide-react';

interface LogoStepProps {
  initialData: OnboardingDraftData;
  onNext: (data: Partial<OnboardingDraftData>) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const PRESET_EMOJIS = ['🏪', '🍕', '☕', '🍜', '🍔', '🍸', '🍰', '💈', '💅', '🛍️', '🏋️', '🍞', '🍦', '🍣', '🥩', '🌮'];

const ACCENT_COLORS = [
  { name: 'SEYO Emerald', hex: '#0e7c66' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Rose Coral', hex: '#e11d48' },
  { name: 'Deep Indigo', hex: '#4f46e5' },
  { name: 'Teal Blue', hex: '#0284c7' },
];

export const LogoStep: React.FC<LogoStepProps> = ({ initialData, onNext, onBack, isLoading }) => {
  const [logoEmoji, setLogoEmoji] = useState(initialData.logoEmoji || '🏪');
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl || '');
  const [accentColor, setAccentColor] = useState(initialData.accentColor || '#0e7c66');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Image must be under 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setLogoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({
      logoEmoji,
      logoUrl: logoUrl || undefined,
      accentColor,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left pb-6 sm:pb-0">
      <div>
        <h2 className="text-2xl font-bold text-[#10181c]">Brand your customer experience</h2>
        <p className="text-sm text-[#6a787e] mt-1">
          Your logo or avatar will appear on the customer entry screen, spin wheel center, and staff terminal.
        </p>
      </div>

      {/* Preview Card */}
      <div className="bg-[#f1f3f2] p-6 rounded-3xl border border-[#e2e7e6] flex flex-col items-center justify-center text-center">
        <span className="text-xs uppercase tracking-wider font-bold text-[#6a787e] mb-3">Live Header Preview</span>
        <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-2xl border border-[#e2e7e6] shadow-sm">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border border-[#e2e7e6] shadow-inner text-2xl"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span>{logoEmoji}</span>
            )}
          </div>
          <div className="text-left">
            <h4 className="font-bold text-[#10181c] text-lg leading-tight">
              {initialData.businessName || 'Your Business Name'}
            </h4>
            <p className="text-xs text-[#6a787e]">{initialData.category || 'Local Business'}</p>
          </div>
        </div>
      </div>

      {/* Upload Option */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-[#10181c] flex items-center justify-between">
          <span>Option A: Upload 1:1 Square Logo</span>
          {logoUrl && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="text-xs text-red-600 hover:underline cursor-pointer"
            >
              Clear Image
            </button>
          )}
        </label>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#e2e7e6] hover:border-[#0e7c66] bg-white rounded-2xl p-6 text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#e2f1ec] text-[#0e7c66] flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-[#10181c]">Click to select a logo image</p>
            <p className="text-xs text-[#6a787e]">Supports WebP, PNG, JPG (normalized to 512×512)</p>
          </div>
        </div>
      </div>

      {/* Preset Emoji Picker */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-[#10181c] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0e7c66]" />
          <span>Option B: Choose Brand Icon / Avatar</span>
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-white p-3 rounded-2xl border border-[#e2e7e6]">
          {PRESET_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setLogoEmoji(emoji);
                setLogoUrl('');
              }}
              className={`w-full h-11 sm:h-10 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                logoEmoji === emoji && !logoUrl
                  ? 'bg-[#0e7c66] text-white shadow-sm scale-105'
                  : 'hover:bg-[#f1f3f2] bg-[#f8faf9]/50'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Accent Color */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-[#10181c]">Brand Accent Color</label>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 sm:gap-3">
          {ACCENT_COLORS.map(col => (
            <button
              key={col.hex}
              type="button"
              onClick={() => setAccentColor(col.hex)}
              className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl border border-[#e2e7e6] bg-white hover:border-[#10181c] transition-all cursor-pointer text-xs font-semibold justify-center sm:justify-start"
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: col.hex }}>
                {accentColor === col.hex && <Check className="w-3 h-3 text-white stroke-[3]" />}
              </span>
              <span className="truncate">{col.name}</span>
            </button>
          ))}
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
          <span>Configure Tier</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </form>
  );
};