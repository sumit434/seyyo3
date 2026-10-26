import React, { useState } from 'react';
import { ALLOWED_COUNTRIES } from '../../../shared/constants/countries';
import { OnboardingDraftData } from '../../../shared/types/onboarding';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ArrowRight, Globe, MapPin, Building2, Tag, Share2, Instagram } from 'lucide-react';

export interface ProfileStepProps {
  initialData: OnboardingDraftData;
  onNext: (data: Partial<OnboardingDraftData>) => void;
  isLoading?: boolean;
}

const CATEGORIES = [
  'Restaurant & Dining',
  'Cafe & Specialty Coffee',
  'Pizzeria & Bakery',
  'Bar, Pub & Nightlife',
  'Salon & Beauty Studio',
  'Retail & Boutique',
  'Fitness, Gym & Wellness',
  'Entertainment & Gaming',
  'Fast Casual & Food Truck',
  'Other Local Business',
];

export const ProfileStep: React.FC<ProfileStepProps> = ({ initialData, onNext, isLoading }) => {
  const [businessName, setBusinessName] = useState(initialData.businessName || '');
  const [category, setCategory] = useState(initialData.category || CATEGORIES[0]);
  const [country, setCountry] = useState(initialData.country || ALLOWED_COUNTRIES[0].name);
  const [city, setCity] = useState(initialData.city || '');

  // Active country configuration from ALLOWED_COUNTRIES
  const selectedCountryConfig =
    ALLOWED_COUNTRIES.find(c => c.name === country) || ALLOWED_COUNTRIES[0];
  const dialDigits = selectedCountryConfig.dialCode.replace(/\D/g, '');
  const expectedPhoneLength = selectedCountryConfig.phoneLength;

  // Strip initial dial digits if passed with country code
  const initialPhoneDigits = (initialData.whatsappNumber || '').replace(/\D/g, '');
  const strippedPhone = initialPhoneDigits.startsWith(dialDigits)
    ? initialPhoneDigits.slice(dialDigits.length)
    : initialPhoneDigits;

  const [whatsappNumber, setWhatsappNumber] = useState(strippedPhone.slice(0, expectedPhoneLength));
  const [zomatoUrl, setZomatoUrl] = useState(initialData.zomatoUrl || '');
  const [swiggyUrl, setSwiggyUrl] = useState(initialData.swiggyUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(initialData.instagramUrl || '');
  const [timezone, setTimezone] = useState(
    initialData.timezone || selectedCountryConfig.defaultTimezone
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleCountryChange = (countryName: string) => {
    setCountry(countryName);
    const cfg = ALLOWED_COUNTRIES.find(c => c.name === countryName);
    if (cfg) {
      setTimezone(cfg.defaultTimezone);
      // Auto-slice phone if entered digits exceed the newly selected country length
      setWhatsappNumber((prev: string) => prev.slice(0, cfg.phoneLength));
    }
    // Clear error on country change
    if (errors.whatsappNumber) {
      setErrors((prev: { [key: string]: string }) => ({ ...prev, whatsappNumber: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (!city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!timezone.trim()) {
      newErrors.timezone = 'Timezone is required for midnight resets';
    }

    const cleanWaDigits = whatsappNumber.replace(/\D/g, '');
    // Simple numeric length check: No regex engine
    if (cleanWaDigits && cleanWaDigits.length !== expectedPhoneLength) {
      newErrors.whatsappNumber = `Enter exactly ${expectedPhoneLength} digits for ${country}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formattedWhatsApp = cleanWaDigits
      ? `${dialDigits}${cleanWaDigits}`
      : undefined;

    onNext({
      businessName: businessName.trim(),
      category,
      country,
      city: city.trim(),
      timezone,
      whatsappNumber: formattedWhatsApp,
      zomatoUrl: zomatoUrl.trim() || undefined,
      swiggyUrl: swiggyUrl.trim() || undefined,
      instagramUrl: instagramUrl.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      <div>
        <h2 className="text-2xl font-bold text-[#10181c]">Tell us about your business</h2>
        <p className="text-sm text-[#6a787e] mt-1">
          These details localize your campaigns, staff terminal, and customer engagement journey.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Business Name"
          placeholder="e.g. Bella Napoli Pizzeria"
          value={businessName}
          onChange={e => {
            setBusinessName(e.target.value);
            if (errors.businessName) setErrors({ ...errors, businessName: '' });
          }}
          error={errors.businessName}
          leftAddon={<Building2 className="w-5 h-5" />}
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#10181c] flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#6a787e]" />
            <span>Business Category</span>
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full rounded-2xl border border-[#e2e7e6] bg-white px-4 py-3.5 text-base text-[#10181c] focus:outline-none focus:ring-2 focus:ring-[#0e7c66]"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#10181c] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#6a787e]" />
              <span>Country (10 Allowed)</span>
            </label>
            <select
              value={country}
              onChange={e => handleCountryChange(e.target.value)}
              className="w-full rounded-2xl border border-[#e2e7e6] bg-white px-4 py-3.5 text-base text-[#10181c] focus:outline-none focus:ring-2 focus:ring-[#0e7c66]"
            >
              {ALLOWED_COUNTRIES.map(c => (
                <option key={c.code} value={c.name}>
                  {c.flagEmoji} {c.name} ({c.dialCode})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="City"
            placeholder="e.g. Mumbai, New York, Tokyo..."
            value={city}
            onChange={e => {
              setCity(e.target.value);
              if (errors.city) setErrors({ ...errors, city: '' });
            }}
            error={errors.city}
            leftAddon={<MapPin className="w-5 h-5" />}
          />
        </div>

        {/* WhatsApp Business Number: Plain input, No dial code beside field */}
        <div className="flex flex-col gap-1.5">
          <Input
            label="WhatsApp Business Number (Optional)"
            placeholder={`Enter ${expectedPhoneLength} digits`}
            value={whatsappNumber}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, expectedPhoneLength);
              setWhatsappNumber(digits);
              if (errors.whatsappNumber) setErrors({ ...errors, whatsappNumber: '' });
            }}
            error={errors.whatsappNumber}
            // No leftAddon displaying dialCode
            helperText={`Must be ${expectedPhoneLength} digits for ${country}.`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#10181c] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#6a787e]" />
              <span>Operational IANA Timezone</span>
            </span>
            <span className="text-xs text-[#0e7c66] font-medium">Controls midnight reset</span>
          </label>
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="w-full rounded-2xl border border-[#e2e7e6] bg-white px-4 py-3.5 text-base text-[#10181c] focus:outline-none focus:ring-2 focus:ring-[#0e7c66]"
          >
            {selectedCountryConfig.timezones.map(tz => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#6a787e] mt-1">
            All customer spin cooldowns and daily loyalty stamp limits calculate against this timezone.
          </p>
        </div>

        {/* Social & Delivery Hyperlinks (Optional) */}
        <div className="pt-2 border-t border-[#e2e7e6] space-y-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#0e7c66]" />
            <h3 className="text-sm font-bold text-[#10181c] uppercase tracking-wider">
              Social & Delivery Links (Optional)
            </h3>
          </div>
          <p className="text-xs text-[#6a787e]">
            If provided, verified brand icons will appear on your customer cooldown page for guests to follow and order. Leave blank if not applicable.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <Input
              label="Zomato Profile / Store Link"
              placeholder="https://www.zomato.com/your-restaurant"
              value={zomatoUrl}
              onChange={e => setZomatoUrl(e.target.value)}
              helperText="Displays a Zomato icon on customer cooldown screen"
            />

            <Input
              label="Swiggy Store Link"
              placeholder="https://www.swiggy.com/restaurants/your-restaurant"
              value={swiggyUrl}
              onChange={e => setSwiggyUrl(e.target.value)}
              helperText="Displays a Swiggy icon on customer cooldown screen"
            />

            <Input
              label="Instagram Profile Link"
              placeholder="https://instagram.com/yourbrand"
              value={instagramUrl}
              onChange={e => setInstagramUrl(e.target.value)}
              leftAddon={<Instagram className="w-4 h-4 text-pink-600" />}
              helperText="Displays an Instagram icon on customer cooldown screen"
            />
          </div>
        </div>
      </div>

      {/* Action Button Bar */}
      <div className="fixed sm:static bottom-0 inset-x-0 p-4 sm:p-0 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-t-0 border-[#e2e7e6] z-30 flex justify-end shadow-lg sm:shadow-none">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="gap-2 w-full sm:w-auto min-h-[48px]"
        >
          <span>Continue to Branding</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </form>
  );
};