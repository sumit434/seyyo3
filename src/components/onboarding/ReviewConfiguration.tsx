import React from 'react';
import { Input } from '../common/Input';
import { Star, Link as LinkIcon, MapPin } from 'lucide-react';

interface ReviewConfigurationProps {
  googleReviewUrl: string;
  googlePlaceId?: string;
  isAddon?: boolean;
  onChange: (fields: { googleReviewUrl?: string; googlePlaceId?: string }) => void;
  errors?: { [key: string]: string };
}

export const ReviewConfiguration: React.FC<ReviewConfigurationProps> = ({
  googleReviewUrl,
  googlePlaceId,
  isAddon = false,
  onChange,
  errors = {},
}) => {
  return (
    <div className="space-y-4 bg-white p-6 rounded-3xl border border-[#e2e7e6] text-left">
      <div className="pb-3 border-b border-[#e2e7e6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#10181c] flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>Google Review Handoff Accelerator</span>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-[#0e7c66] text-white px-2.5 py-0.5 rounded-full">
              {isAddon ? 'Included Add-On' : 'Core Feature'}
            </span>
          </h3>
          <p className="text-xs text-[#6a787e] mt-0.5 leading-relaxed">
            Customers craft verified review prompts with 1-tap clipboard copying, persisted before redirection to your Google Business Profile.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1">
        <Input
          label="Google Business Review Direct URL"
          placeholder="https://maps.google.com/?q=Your+Business+Name or https://g.page/r/..."
          value={googleReviewUrl}
          onChange={e => onChange({ googleReviewUrl: e.target.value })}
          error={errors.googleReviewUrl}
          helperText="Direct Google Maps Review link provided by Google Business Profile."
          leftAddon={<LinkIcon className="w-5 h-5 text-[#0e7c66]" />}
        />

        <Input
          label="Google Place ID (Optional)"
          placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
          value={googlePlaceId || ''}
          onChange={e => onChange({ googlePlaceId: e.target.value })}
          helperText="Optional place ID for deep integration and verified reviews."
          leftAddon={<MapPin className="w-5 h-5 text-[#6a787e]" />}
        />
      </div>
    </div>
  );
};
