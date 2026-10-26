import React, { useState, useEffect } from 'react';
import { PRODUCT_TIERS, ProductTier } from '../../shared/constants/tiers';
import { Button } from '../components/common/Button';
import { PaymentModal } from '../components/payment/PaymentModal';
import { SeyyoLogo } from '../components/common/SeyyoLogo';
import { Navbar } from '../components/marketing/Navbar';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  ExternalLink,
  Store,
} from 'lucide-react';

interface FloatingBadgeItem {
  id: string;
  icon: string;
  text: string;
  positionClasses: string;
}

// Exactly 8 badges, hidden on mobile screens, organically scattered on tablet/desktop viewports
const FLOATING_BADGES: FloatingBadgeItem[] = [
  {
    id: 'badge-1',
    icon: '⭐',
    text: 'Organic Google Ratings',
    positionClasses: 'top-[28%] sm:left-[16%]',
  },
  {
    id: 'badge-2',
    icon: '🔥',
    text: '124 VIPs Retained this week',
    positionClasses: 'top-[9%] sm:right-[12%]',
  },
  {
    id: 'badge-3',
    icon: '⚡',
    text: 'Zero App Download',
    positionClasses: 'top-[60%] sm:left-[9%]',
  },
  {
    id: 'badge-4',
    icon: '💎',
    text: 'Build Customer Loyalty',
    positionClasses: 'top-[35%] sm:right-[25%]',
  },
  {
    id: 'badge-5',
    icon: '🎯',
    text: 'Bring Customers Back',
    positionClasses: 'top-[74%] sm:left-[25%] -translate-x-full',
  },
  {
    id: 'badge-6',
    icon: '🔔',
    text: 'Re-engage Regulars',
    positionClasses: 'top-[57%] sm:right-[8%]',
  },
  {
    id: 'badge-7',
    icon: '🏆',
    text: 'Reward Top Customers',
    positionClasses: 'top-[6%] sm:left-[8%]',
  },
  {
    id: 'badge-8',
    icon: '🎁',
    text: 'Milestone Stamp Rewards',
    positionClasses: 'top-[78%] sm:right-[24%] translate-x-full',
  },
];

export const FloatingHeroBadges: React.FC = () => {
  const [activeBadgeId, setActiveBadgeId] = useState<string | null>(null);

  const handleBadgeClick = (id: string) => {
    setActiveBadgeId(id);
  };

  useEffect(() => {
    if (!activeBadgeId) return;
    const timer = setTimeout(() => {
      setActiveBadgeId(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeBadgeId]);

  return (
    <div className="hidden sm:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen pointer-events-none overflow-hidden select-none z-0">
      {FLOATING_BADGES.map((badge) => {
        const isExpanded = activeBadgeId === badge.id;

        return (
          <button
            key={badge.id}
            type="button"
            onClick={() => handleBadgeClick(badge.id)}
            className={`absolute ${badge.positionClasses} pointer-events-auto z-10 flex items-center ${
              badge.id === 'badge-5'
                ? 'flex-row-reverse justify-end origin-right'
                : badge.id === 'badge-8'
                ? 'flex-row justify-start origin-left'
                : 'flex-row'
            } gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#e2e7e6] hover:border-[#0e7c66]/50 shadow-none transition-all duration-300 text-xs font-medium text-[#10181c] cursor-pointer`}
          >
            <span className="text-sm select-none shrink-0">{badge.icon}</span>
            {isExpanded && (
              <span
                className={`text-[#0e7c66] font-semibold font-['Clarity_City',sans-serif] whitespace-nowrap ${
                  badge.id === 'badge-5'
                    ? 'animate-in fade-in slide-in-from-right-2 duration-200 pr-0.5'
                    : 'animate-in fade-in slide-in-from-left-2 duration-200 pl-0.5'
                }`}
              >
                {badge.text}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface RoiCalculatorProps {
  onSelectTier: (tier: ProductTier) => void;
}

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({ onSelectTier }) => {
  const [dailyVisitors, setDailyVisitors] = useState<number>(120);
  const [selectedPlan, setSelectedPlan] = useState<'spin' | 'loyalty' | 'combined'>('combined');

  const minVisitors = 30;
  const maxVisitors = 600;

  const progressPercent = ((dailyVisitors - minVisitors) / (maxVisitors - minVisitors)) * 100;

  const tierEstimatorConfig: Record<
    'spin' | 'loyalty' | 'combined',
    { rate: number; label: string; growthMultiplier: number }
  > = {
    spin: {
      rate: 0.04,
      label: 'Spin and Win',
      growthMultiplier: 4,
    },
    loyalty: {
      rate: 0.07,
      label: 'Loyalty Log',
      growthMultiplier: 7,
    },
    combined: {
      rate: 0.11,
      label: 'Seyyo Combo',
      growthMultiplier: 11,
    },
  };

  const currentConfig = tierEstimatorConfig[selectedPlan];
  const extraVisits = Math.round(dailyVisitors * 30 * currentConfig.rate);
  const isComboSelected = selectedPlan === 'combined';

  return (
    <div className="mt-8 p-6 sm:p-7 bg-white/95 backdrop-blur-md border border-[#e2e7e6] rounded-3xl shadow-none max-w-xl mx-auto text-left relative z-20 font-['Clarity_City',sans-serif]">
      {/* 1. Footfall Header & Modern Two-Tone Slider */}
      <div className="flex justify-between items-center mb-3">
        <label className="text-xs font-bold uppercase tracking-wider text-[#6a787e]">
          Daily Customer Footfall
        </label>
        <span className="text-sm font-bold font-['Clarity_City',sans-serif] px-3 py-1 rounded-full bg-[#e2f1ec] text-[#0e7c66]">
          {dailyVisitors} customers / day
        </span>
      </div>

      {/* Two-Tone Progressive Slider */}
      <div className="relative flex items-center py-2.5">
        <input
          type="range"
          min={minVisitors}
          max={maxVisitors}
          step={10}
          value={dailyVisitors}
          onChange={(e) => setDailyVisitors(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #0e7c66 0%, #0e7c66 ${progressPercent}%, #e5ece9 ${progressPercent}%, #e5ece9 100%)`,
          }}
          className="w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0e7c66] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#0e7c66] [&::-moz-range-thumb]:shadow-md"
        />
      </div>

      {/* 2. Three Plan Option Pills - Increased, Uniform Height & Balanced Font */}
      <div className="mt-6 mb-4">
        <p className="text-[11px] font-bold text-[#6a787e] uppercase tracking-wide mb-2">
          Select Plan to Estimate
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {(['spin', 'loyalty', 'combined'] as const).map((planKey) => {
            const isSelected = selectedPlan === planKey;
            const isCombo = planKey === 'combined';

            let activeStyles = 'bg-[#0e7c66] text-white border-[#0e7c66]';
            if (isCombo && isSelected) {
              activeStyles = 'bg-[#fe9a00] text-white border-[#fe9a00]';
            }

            return (
              <button
                key={planKey}
                type="button"
                onClick={() => setSelectedPlan(planKey)}
                className={`h-12 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center text-center cursor-pointer shadow-none ${
                  isSelected
                    ? activeStyles
                    : 'bg-[#f8faf9] text-[#2a383f] border-[#e2e7e6] hover:border-[#0e7c66]/40'
                }`}
              >
                <span className="leading-tight">{tierEstimatorConfig[planKey].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Output Figures */}
      <div className="mt-5 pt-4 border-t border-[#e2e7e6] grid grid-cols-2 gap-4 items-center">
        <div>
          <p className="text-[11px] font-bold text-[#6a787e] uppercase tracking-wide mb-1">
            Extra Return Visits
          </p>
          <p
            className={`text-xl sm:text-2xl font-black font-['Clarity_City',sans-serif] tracking-tight transition-colors duration-200 ${
              isComboSelected ? 'text-[#fe9a00]' : 'text-[#0e7c66]'
            }`}
          >
            +{extraVisits} / month
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-bold text-[#6a787e] uppercase tracking-wide mb-1">
            Estimated Growth
          </p>
          <p
            className={`text-xl sm:text-2xl font-black font-['Clarity_City',sans-serif] tracking-tight transition-colors duration-200 ${
              isComboSelected ? 'text-[#fe9a00]' : 'text-[#0e7c66]'
            }`}
          >
            +{currentConfig.growthMultiplier}%
          </p>
        </div>
      </div>

      {/* 4. Embedded Merchant CTA - Larger Uniform Container & Prominent Tier Typography */}
      <button
        type="button"
        onClick={() => onSelectTier(selectedPlan)}
        className="w-full mt-6 min-h-[58px] py-3.5 px-5 rounded-2xl bg-[#0e7c66] hover:bg-[#0b6352] text-white font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer shadow-none font-['Clarity_City',sans-serif] text-center"
      >
        <span className="text-sm sm:text-base leading-tight flex items-center justify-center gap-1.5 font-semibold">
          <span>Get started with</span>
          <ArrowRight className="w-4 h-4 sm:hidden" />
        </span>
        <span className="text-base sm:text-lg font-black opacity-100 leading-tight flex items-center gap-1.5">
          <span>{currentConfig.label}</span>
          <ArrowRight className="w-4 h-4 hidden sm:inline-block" />
        </span>
      </button>
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<ProductTier>('combined');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  const TIER_PRICING_RATES: Record<ProductTier, { INR: string; USD: string; name: string }> = {
    spin: { INR: '₹999', USD: '$12', name: 'Spin and Win' },
    loyalty: { INR: '₹1,299', USD: '$18', name: 'Loyalty Log' },
    review: { INR: '₹499', USD: '$6', name: 'Review Pro' },
    combined: { INR: '₹1,999', USD: '$25', name: 'Seyyo Combo' },
  };

  const handleOpenPurchase = (tier: ProductTier) => {
    setSelectedTier(tier);
    setIsPurchaseModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f1f3f2] text-[#10181c] flex flex-col font-['Inter',sans-serif]">
      {/* Navbar */}
      <Navbar onGetStarted={() => handleOpenPurchase('combined')} />

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-16 pb-16 px-4 text-center max-w-5xl mx-auto">
        {/* Full-bleed ambient floating icon constellation (Hidden on mobile) */}
        <FloatingHeroBadges />

        {/* Sub-header in Title Case */}
        <p className="text-xs sm:text-sm font-semibold tracking-normal text-[#0e7c66] mb-4 relative z-10 font-['Clarity_City',sans-serif]">
          Next-Gen QR &amp; NFC Customer Engagement
        </p>

        {/* Hero Title with Brand Green Period */}
        <h1 className="text-4xl sm:text-6xl font-black text-[#10181c] tracking-tight leading-[1.15] mb-5 relative z-10 font-['Clarity_City',sans-serif]">
          Give Every Visit a <br />
          <span className="text-[#0e7c66]">Reason to Return for More</span>
          <span className="text-[#0e7c66]">.</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-sm sm:text-base font-light text-[#6a787e] max-w-xl mx-auto leading-snug mb-8 relative z-10">
          One unified platform with 4 tiered engagement modes: 100% all-win spin wheels, digital milestone stamp cards, and verified Google reviews.
        </p>

        {/* Customer Demo Button */}
        <div className="flex justify-center max-w-xs mx-auto mb-2 relative z-20">
          <Button
            href="/demo"
            variant="outline"
            size="lg"
            fullWidth
            className="gap-2 bg-white/90 hover:bg-white text-sm sm:text-base font-semibold py-3.5 shadow-none border border-[#e2e7e6] font-['Clarity_City',sans-serif]"
          >
            <ExternalLink className="w-4 h-4 text-[#0e7c66]" />
            <span>Customer Demo</span>
          </Button>
        </div>

        {/* Interactive Estimator Card */}
        <RoiCalculator onSelectTier={handleOpenPurchase} />

        {/* Estimator Legal Notice - In Hero section outside card with low opacity */}
        <p className="mt-3 text-[11px] text-[#6a787e] opacity-60 text-center relative z-20">
          Estimates are illustrative approximations. <a href="/terms#growth-estimator" className="underline hover:text-[#0e7c66] transition-colors">T&amp;C Apply</a>.
        </p>
      </section>

      {/* Pricing & Tiers Section */}
      <section className="py-16 bg-white border-t border-[#e2e7e6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="max-w-2xl mx-auto mb-8">
            <h2 className="text-3xl sm:text-4xl font-black text-[#10181c] tracking-tight font-['Clarity_City',sans-serif]">
              Transparent Merchant Tiers
            </h2>
            <p className="text-sm font-light text-[#6a787e] mt-2">
              Select the perfect engagement model for your venue. Upgrade or expand anytime.
            </p>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center justify-center gap-2 mb-10">
            <div className="inline-flex items-center p-1 bg-[#f1f3f2] rounded-2xl border border-[#e2e7e6]">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-['Clarity_City',sans-serif] ${
                  currency === 'INR'
                    ? 'bg-[#0e7c66] text-white shadow-none'
                    : 'text-[#6a787e] hover:text-[#10181c]'
                }`}
              >
                INR (₹)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-['Clarity_City',sans-serif] ${
                  currency === 'USD'
                    ? 'bg-[#0e7c66] text-white shadow-none'
                    : 'text-[#6a787e] hover:text-[#10181c]'
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {(Object.keys(PRODUCT_TIERS) as ProductTier[]).map((tierKey) => {
              const tier = PRODUCT_TIERS[tierKey];
              const isPopular = tierKey === 'combined';
              const pricingInfo = TIER_PRICING_RATES[tierKey];
              const displayRate = currency === 'INR' ? pricingInfo.INR : pricingInfo.USD;

              return (
                <div
                  key={tier.id}
                  className={`rounded-3xl p-6 flex flex-col justify-between transition-all ${
                    isPopular
                      ? 'bg-[#0e7c66] text-white ring-2 ring-[#0e7c66] scale-[1.02] shadow-none'
                      : 'bg-white border border-[#e2e7e6] text-[#10181c]'
                  }`}
                >
                  <div>
                    {/* Header: kept in one single line with POPULAR badge */}
                    <div className="flex items-center justify-between mb-3 gap-2 flex-nowrap">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap font-['Clarity_City',sans-serif] ${
                          isPopular ? 'bg-white/20 text-white' : 'bg-[#e2f1ec] text-[#0e7c66]'
                        }`}
                      >
                        {pricingInfo.name}
                      </span>
                      {isPopular && (
                        <span className="text-[11px] font-bold text-amber-300 font-['Clarity_City',sans-serif] whitespace-nowrap">
                          POPULAR
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 my-4">
                      <span className="text-3xl font-black font-['Clarity_City',sans-serif]">{displayRate}</span>
                      <span className={`text-xs ${isPopular ? 'text-white/80' : 'text-[#6a787e]'}`}>
                        /year
                      </span>
                    </div>

                    <p className={`text-xs font-light mb-6 ${isPopular ? 'text-white/90' : 'text-[#6a787e]'}`}>
                      {tier.tagline}
                    </p>

                    <div className="space-y-2.5 mb-6">
                      {tier.features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isPopular ? 'text-amber-300' : 'text-[#0e7c66]'
                            }`}
                          />
                          <span className={isPopular ? 'text-white' : 'text-[#10181c]'}>{feat}</span>
                        </div>
                      ))}

                      {/* Loyalty milestone sharing feature */}
                      {(tierKey === 'loyalty' || tierKey === 'combined') && (
                        <div className="flex items-start gap-2 text-xs">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isPopular ? 'text-amber-300' : 'text-[#0e7c66]'
                            }`}
                          />
                          <span className={isPopular ? 'text-white' : 'text-[#10181c]'}>
                            Direct WhatsApp outreach &amp; loyalty milestone sharing
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={isPopular ? 'secondary' : 'primary'}
                    fullWidth
                    onClick={() => handleOpenPurchase(tier.id)}
                    className="flex-col py-3 gap-0.5 shadow-none font-bold font-['Clarity_City',sans-serif] text-center"
                  >
                    <span className="text-[13px] leading-tight">Get started with</span>
                    <span className="text-xs font-semibold opacity-95 leading-tight">
                      {pricingInfo.name}
                    </span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="py-16 px-4 max-w-5xl mx-auto text-left">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-3xl font-black text-[#10181c] tracking-tight font-['Clarity_City',sans-serif]">
            Industrial-Grade Architecture
          </h2>
          <p className="text-sm font-light text-[#6a787e] mt-2">
            Engineered for reliability, multi-tenant isolation, and zero-spoofing customer security.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-[#e2e7e6] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e2f1ec] text-[#0e7c66] flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#10181c] text-base font-['Clarity_City',sans-serif]">
              Permanent NFC &amp; Dynamic QR
            </h3>
            <p className="text-xs font-light text-[#6a787e] leading-relaxed">
              Physical tags never expire. Customers receive cryptographically secure short-lived journey tokens preventing replay attacks.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e2e7e6] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e2f1ec] text-[#0e7c66] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#10181c] text-base font-['Clarity_City',sans-serif]">
              Server-Authoritative Status
            </h3>
            <p className="text-xs font-light text-[#6a787e] leading-relaxed">
              The backend automatically computes the first incomplete stage (Spin → Loyalty → Review) and enforces merchant timezone midnight resets.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e2e7e6] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e2f1ec] text-[#0e7c66] flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#10181c] text-base font-['Clarity_City',sans-serif]">
              Multi-Outlet &amp; Staff Isolation
            </h3>
            <p className="text-xs font-light text-[#6a787e] leading-relaxed">
              Granular role-based controls, PIN verification for staff actions, and instant audit trails for every stamp and redemption.
            </p>
          </div>
        </div>
      </section>

      {/* Clean, Fully-Aligned Brand Footer */}
      <footer className="mt-auto py-10 bg-white border-t border-[#e2e7e6] text-xs text-[#6a787e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <SeyyoLogo className="w-8 h-8 shadow-none" />
              <span className="font-bold text-[#0e7c66] font-['Clarity_City',sans-serif] text-base block tracking-tight">
                seyyo
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium font-['Clarity_City',sans-serif]">
              <a href="/terms" className="text-[#0e7c66] hover:underline">
                Terms &amp; Conditions
              </a>
              <span className="text-[#e2e7e6]">•</span>
              <a href="/privacy" className="text-[#0e7c66] hover:underline">
                Privacy Policy
              </a>
              <span className="text-[#e2e7e6]">•</span>
              <a href="/refund-policy" className="text-[#0e7c66] hover:underline">
                Cancellation &amp; Refund
              </a>
              <span className="text-[#e2e7e6]">•</span>
              <a href="/staff/login" className="hover:text-[#10181c]">
                Staff Portal
              </a>
              <span className="text-[#e2e7e6]">•</span>
              <a href="/demo" className="hover:text-[#10181c]">
                Customer Demo
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-[#f1f3f2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#6a787e]">
            <p>
              © {new Date().getFullYear()}{' '}
              <span className="text-[#0e7c66] font-semibold font-['Clarity_City',sans-serif]">seyyo</span>
              . All rights reserved. Secure online payment processing by Razorpay.
            </p>
            <p>
              Support:{' '}
              <a href="mailto:team.seyyo@gmail.com" className="text-[#0e7c66] hover:underline font-medium">
                team.seyyo@gmail.com
              </a>{' '}
              | Hotline: +91 7021127377
            </p>
          </div>
        </div>
      </footer>

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        selectedTier={selectedTier}
        currency={currency}
      />
    </div>
  );
};