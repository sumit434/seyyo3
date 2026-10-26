import React from 'react';
import { FIXED_SPIN_EMOJIS, MAX_SPIN_SLICES, MIN_SPIN_SLICES } from '../../../shared/constants/limits';
import { SpinSliceConfig } from '../../../shared/types/business';
import { Button } from '../common/Button';
import { Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react';

interface SpinConfigurationProps {
  slices: SpinSliceConfig[];
  onChange: (slices: SpinSliceConfig[]) => void;
  error?: string;
}

export const SpinConfiguration: React.FC<SpinConfigurationProps> = ({ slices, onChange, error }) => {
  const totalWeight = slices.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
  const isWeightValid = Math.round(totalWeight) === 100;

  const handleSliceChange = (index: number, field: keyof SpinSliceConfig, value: any) => {
    const updated = [...slices];
    updated[index] = {
      ...updated[index],
      [field]: field === 'weight' ? Number(value) : value,
    };
    onChange(updated);
  };

  const handleAddSlice = () => {
    if (slices.length >= MAX_SPIN_SLICES) return;
    const nextEmoji = FIXED_SPIN_EMOJIS[slices.length % FIXED_SPIN_EMOJIS.length];
    const newSlice: SpinSliceConfig = {
      id: `s_${Date.now()}`,
      rewardLabel: 'Special Treat Voucher',
      emoji: nextEmoji,
      weight: 10,
    };
    onChange([...slices, newSlice]);
  };

  const handleRemoveSlice = (index: number) => {
    if (slices.length <= MIN_SPIN_SLICES) return;
    const updated = slices.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleAutoBalance = () => {
    const count = slices.length;
    const base = Math.floor(100 / count);
    const remainder = 100 % count;
    const balanced = slices.map((s, idx) => ({
      ...s,
      weight: idx === 0 ? base + remainder : base,
    }));
    onChange(balanced);
  };

  return (
    <div className="space-y-4 bg-white p-6 rounded-3xl border border-[#e2e7e6] text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e2e7e6]">
        <div>
          <h3 className="text-lg font-bold text-[#10181c] flex items-center gap-2">
            <span>Spin & Win Wheel (2–7 Slices)</span>
          </h3>
          <p className="text-xs text-[#6a787e]">
            100% all-win guaranteed rewards. Weights must equal 100%.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              isWeightValid ? 'bg-[#e2f1ec] text-[#0e7c66]' : 'bg-red-50 text-red-600'
            }`}
          >
            <span>Total Weight: {totalWeight}%</span>
            {isWeightValid ? '✓' : '!'}
          </div>

          <button
            type="button"
            onClick={handleAutoBalance}
            className="text-xs font-semibold text-[#0e7c66] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Balance</span>
          </button>
        </div>
      </div>

      {/* Slices list */}
      <div className="space-y-3">
        {slices.map((slice, index) => (
          <div
            key={slice.id || index}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 sm:p-3 rounded-2xl border border-[#e2e7e6] bg-[#f8faf9] sm:bg-[#f1f3f2]/40"
          >
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-white border border-[#e2e7e6] flex items-center justify-center text-xl shrink-0 shadow-2xs">
                {slice.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Reward Prize (e.g. 15% Off, Free Drink)"
                  value={slice.rewardLabel}
                  onChange={e => handleSliceChange(index, 'rewardLabel', e.target.value)}
                  className="w-full text-sm font-semibold text-[#10181c] bg-white sm:bg-transparent border border-[#e2e7e6] sm:border-0 sm:border-b sm:border-transparent rounded-xl sm:rounded-none px-3 py-2 sm:px-0 sm:py-1 focus:border-[#0e7c66] focus:outline-none min-h-[44px] sm:min-h-0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#e2e7e6]/60">
              <span className="text-xs font-bold text-[#6a787e] sm:hidden">Odds Probability:</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-[#e2e7e6] px-3 py-1.5 sm:px-2 sm:py-1.5 rounded-xl min-h-[40px]">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={slice.weight}
                    onChange={e => handleSliceChange(index, 'weight', e.target.value)}
                    className="w-12 text-sm font-bold text-center text-[#10181c] focus:outline-none"
                  />
                  <span className="text-xs text-[#6a787e] font-semibold">%</span>
                </div>

                {slices.length > MIN_SPIN_SLICES && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSlice(index)}
                    className="p-2.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                    title="Remove slice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <p className="text-xs text-[#6a787e]">
          {slices.length} of max {MAX_SPIN_SLICES} slices configured
        </p>

        {slices.length < MAX_SPIN_SLICES && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSlice}
            className="gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Slice</span>
          </Button>
        )}
      </div>

      {(!isWeightValid || error) && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error || 'Slice weights must add up to exactly 100% before continuing.'}</span>
        </div>
      )}
    </div>
  );
};
