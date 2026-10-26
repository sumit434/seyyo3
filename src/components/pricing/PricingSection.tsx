import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';
import { PRODUCT_TIERS, ProductTier } from '../../../shared/constants/tiers';

export const TIER_PRICING_RATES: Record<ProductTier, { INR: string; USD: string; name: string }> = {
  spin: { INR: '₹999', USD: '$12', name: 'Spin and Win' },
  loyalty: { INR: '₹1,299', USD: '$18', name: 'Loyalty Log' },
  review: { INR: '₹499', USD: '$6', name: 'Review Pro' },
  combined: { INR: '₹1,999', USD: '$25', name: 'Seyyo Combo' },
};

interface PricingSectionProps {
  currency: 'INR' | 'USD';
  onCurrencyChange: (currency: 'INR' | 'USD') => void;
  onSelectTier: (tier: ProductTier) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  currency,
  onCurrencyChange,
  onSelectTier,
}) => {
  return (
    <section className="py-16 bg-white border-t border-[#e2e7e6]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto mb-8">
          <h2 className="text-3xl font-black text-[#10181c] tracking-tight">
            Transparent, Predictable Annual Pricing
          </h2>
          <p className="text-sm text-[#6a787e] mt-2">
            No transaction cuts, no patron limits, no hidden hosting fees. Choose the tier that matches your counter workflow.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="inline-flex items-center p-1 bg-[#f1f3f2] rounded-2xl border border-[#e2e7e6]">
            <button
              type="button"
              onClick={() => onCurrencyChange('INR')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currency === 'INR'
                  ? 'bg-[#0e7c66] text-white shadow-sm'
                  : 'text-[#6a787e] hover:text-[#10181c]'
              }`}
            >
              INR (₹)
            </button>
            <button
              type="button"
              onClick={() => onCurrencyChange('USD')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-[#0e7c66] text-white shadow-sm'
                  : 'text-[#6a787e] hover:text-[#10181c]'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {(Object.keys(PRODUCT_TIERS) as ProductTier[]).map(tierKey => {
            const tier = PRODUCT_TIERS[tierKey];
            const isPopular = tierKey === 'combined';
            const pricingInfo = TIER_PRICING_RATES[tierKey];
            const displayRate = currency === 'INR' ? pricingInfo.INR : pricingInfo.USD;

            return (
              <div
                key={tier.id}
                className={`rounded-3xl p-6 flex flex-col justify-between transition-all ${
                  isPopular
                    ? 'bg-[#0e7c66] text-white shadow-xl ring-2 ring-[#0e7c66] scale-[1.02]'
                    : 'bg-white border border-[#e2e7e6] text-[#10181c]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        isPopular ? 'bg-white/20 text-white' : 'bg-[#e2f1ec] text-[#0e7c66]'
                      }`}
                    >
                      {pricingInfo.name}
                    </span>
                    {isPopular && (
                      <span className="text-[11px] font-bold text-amber-300">MOST POPULAR</span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 my-4">
                    <span className="text-3xl font-black">{displayRate}</span>
                    <span className={`text-xs ${isPopular ? 'text-white/80' : 'text-[#6a787e]'}`}>
                      /year
                    </span>
                  </div>

                  <p className={`text-xs mb-6 ${isPopular ? 'text-white/90' : 'text-[#6a787e]'}`}>
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
                  </div>
                </div>

                <Button
                  variant={isPopular ? 'secondary' : 'primary'}
                  fullWidth
                  onClick={() => onSelectTier(tier.id)}
                  className="gap-1.5"
                >
                  <span>Buy {pricingInfo.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
