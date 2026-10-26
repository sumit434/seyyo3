import React from 'react';
import { Coffee, ShieldCheck } from 'lucide-react';

interface NoOfferScreenProps {
  businessName: string;
  logoEmoji?: string;
  accentColor?: string;
  message?: string;
}

export const NoOfferScreen: React.FC<NoOfferScreenProps> = ({
  businessName,
  logoEmoji = '🏪',
  accentColor = '#0e7c66',
  message,
}) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl border border-[#e2e7e6] shadow-xl p-8 text-center space-y-6">
      <div className="flex flex-col items-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm mb-4 border border-[#e2e7e6]"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <span>{logoEmoji}</span>
        </div>

        <h2 className="text-xl font-bold text-[#10181c]">Welcome to {businessName}</h2>

        <div className="mt-4 p-5 rounded-2xl bg-[#f1f3f2]/80 border border-[#e2e7e6] text-center space-y-2">
          <Coffee className="w-8 h-8 text-[#0e7c66] mx-auto opacity-70" />
          <p className="text-sm text-[#10181c] font-medium leading-relaxed">
            {message ||
              'Our rewards and loyalty program is currently taking a short break. Please check back soon for exciting offers and rewards.'}
          </p>
        </div>
      </div>

      <div className="pt-2 text-center">
        <p className="text-xs text-[#6a787e] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#0e7c66]" />
          <span>seyyo Customer Engagement Platform</span>
        </p>
      </div>
    </div>
  );
};
