import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { SpinSliceConfig } from '../../../shared/types/business';
import { Reward } from '../../../shared/types/reward';
import { customerService } from '../../services/customerService';
import { Button } from '../common/Button';
import { Sparkles, Trophy } from 'lucide-react';

export const WHEEL_SLICES = [
  { id: 1, color: '#e76484', emoji: '🎁' }, // Coral / Pink
  { id: 2, color: '#c442d8', emoji: '🏆' }, // Magenta / Purple
  { id: 3, color: '#6862f6', emoji: '🥇' }, // Indigo / Blue
  { id: 4, color: '#49aed8', emoji: '👑' }, // Sky Blue
  { id: 5, color: '#7eb557', emoji: '💎' }, // Green
  { id: 6, color: '#f2d634', emoji: '🎟️' }, // Yellow
  { id: 7, color: '#f48e3a', emoji: '🌟' }, // Orange
];

interface SpinWheelProps {
  businessId: string;
  customerId: string;
  sessionToken?: string;
  slices: SpinSliceConfig[];
  accentColor?: string;
  onSpinCompleted: (reward: Reward) => void;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  businessId,
  customerId,
  sessionToken,
  slices,
  accentColor = '#0e7c66',
  onSpinCompleted,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [error, setError] = useState<string | null>(null);

  const numSlices = slices.length > 0 ? slices.length : WHEEL_SLICES.length;
  const sliceDeg = 360 / numSlices;

  // ViewBox & responsive rim coordinate constants
  const viewBoxSize = 400;
  const centerX = viewBoxSize / 2; // 200
  const centerY = viewBoxSize / 2; // 200
  const rimStrokeWidth = 24;
  const rimRadius = 188; // Center midline of the 24px white border stroke

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0e7c66', '#f59e0b', '#10b981', '#ffffff'],
    });
  };

  const handleSpinClick = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setError(null);

    try {
      // 1. Call server to execute authoritative spin selection
      const result = await customerService.executeSpin(businessId, customerId, sessionToken);
      const targetIndex = result.sliceIndex;

      // 2. Calculate final angle so targetIndex aligns with the top pointer (at 0 deg / top)
      const sliceCenter = (targetIndex + 0.5) * sliceDeg;
      const extraFullSpins = 360 * 5; // 5 full rotations for dramatic suspense
      const targetRotation = extraFullSpins + (360 - sliceCenter);

      // Current base rotation
      const baseOffset = Math.floor(rotationAngle / 360) * 360;
      const finalRotation = baseOffset + targetRotation;

      setRotationAngle(finalRotation);

      // 3. Wait for CSS transition to finish (3.8 seconds)
      setTimeout(() => {
        setIsSpinning(false);
        setSelectedReward(result.reward);
        triggerConfetti();
        onSpinCompleted(result.reward);
      }, 3800);
    } catch (err: any) {
      setIsSpinning(false);
      setError(err.message || 'Spin failed. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl border border-[#e2e7e6] shadow-xl p-6 sm:p-8 flex flex-col items-center text-center">
      {/* Header */}
      <div className="mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2f1ec] text-[#0e7c66] text-xs font-bold uppercase tracking-wider mb-2">
          <Trophy className="w-3.5 h-3.5" />
          <span>100% Guaranteed Win</span>
        </div>
        <h2 className="text-2xl font-black text-[#10181c] tracking-tight">Spin & Win Treat!</h2>
        <p className="text-xs text-[#6a787e] mt-1">Tap the button to reveal today&apos;s lucky reward</p>
      </div>

      {error && (
        <div className="mb-4 w-full p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Wheel Container with Pointer */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 my-2 flex items-center justify-center">
        {/* Top Pointer Indicator */}
        <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20 w-8 h-10 flex items-center justify-center filter drop-shadow-md">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-[#f59e0b]" />
        </div>

        {/* Outer Circular Wheel Base */}
        <div className="absolute inset-0 rounded-full shadow-2xl bg-white overflow-hidden transform-gpu">
          {/* Wheel Disc */}
          <div
            className="w-full h-full rounded-full relative transform-gpu"
            style={{
              transform: `rotate(${rotationAngle}deg)`,
              WebkitTransform: `rotate(${rotationAngle}deg)`,
              transition: isSpinning ? 'transform 3.8s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
              WebkitTransition: isSpinning ? '-webkit-transform 3.8s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
            }}
          >
            {/* SVG Pie Slices */}
            <svg viewBox="-100 -100 200 200" className="w-full h-full transform -rotate-90">
              {slices.map((slice, i) => {
                const startAngle = (i * sliceDeg * Math.PI) / 180;
                const endAngle = (((i + 1) * sliceDeg) * Math.PI) / 180;

                const x1 = 100 * Math.cos(startAngle);
                const y1 = 100 * Math.sin(startAngle);
                const x2 = 100 * Math.cos(endAngle);
                const y2 = 100 * Math.sin(endAngle);

                const largeArc = sliceDeg > 180 ? 1 : 0;
                const pathData = `M 0 0 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`;

                const bgColor = WHEEL_SLICES[i % WHEEL_SLICES.length].color;

                return (
                  <path
                    key={slice.id || i}
                    d={pathData}
                    fill={bgColor}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>

            {/* Slices Emojis Only (No Text, nudged outward toward outer edge) */}
            {slices.map((slice, i) => {
              const angle = i * sliceDeg + sliceDeg / 2;
              const emoji = WHEEL_SLICES[i % WHEEL_SLICES.length].emoji;

              return (
                <div
                  key={slice.id || i}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                  style={{
                    transform: `rotate(${angle}deg)`,
                  }}
                >
                  <div
                    className="flex flex-col items-center justify-center font-bold text-center"
                    style={{
                      transform: 'translateY(-100px)',
                    }}
                  >
                    <span className="text-3xl drop-shadow-md filter">{emoji}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outer Crisp White Border & 7 Responsive Dots Locked Inside SVG Coordinate Space */}
        <svg
          viewBox="0 0 400 400"
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        >
          {/* White Outer Border Rim */}
          <circle
            cx={centerX}
            cy={centerY}
            r={rimRadius}
            fill="none"
            stroke="#ffffff"
            strokeWidth={rimStrokeWidth}
          />

          {/* Thin subtle outer contour ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={199}
            fill="none"
            stroke="#e2e7e6"
            strokeWidth="1.5"
          />

          {/* 7 Evenly Spaced Yellow Dots Locked Inside SVG Coordinate Space */}
          {Array.from({ length: 7 }).map((_, index) => {
            const angle = (index * 360) / 7;
            const radians = (angle * Math.PI) / 180;
            // Center is viewBox width / 2 (e.g., 200 for a 400x400 viewBox)
            // rimRadius is set to the exact middle radius of the white border stroke
            const dotX = centerX + rimRadius * Math.cos(radians);
            const dotY = centerY + rimRadius * Math.sin(radians);

            return (
              <circle
                key={index}
                cx={dotX}
                cy={dotY}
                r={5} /* Scales automatically with viewBox */
                fill="#f2d634"
              />
            );
          })}
        </svg>

        {/* Center Hub with SVG Logo (no text) */}
        <div className="absolute z-20 w-16 h-16 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center ring-1 ring-[#e2e7e6] p-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] overflow-hidden p-2 shrink-0">
  <img
    src="/logo.svg"
    alt="Seyyo"
    className="w-full h-full object-contain select-none pointer-events-none"
    draggable={false}
  />
</div>
        </div>
      </div>

      {/* Action Area */}
      <div className="w-full mt-4">
        <Button
          onClick={handleSpinClick}
          variant="primary"
          size="lg"
          fullWidth
          disabled={isSpinning || !!selectedReward}
          isLoading={isSpinning}
          className="gap-2 shadow-lg text-lg py-4"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span>{isSpinning ? 'Selecting Your Prize...' : 'TAP TO SPIN!'}</span>
        </Button>
      </div>
    </div>
  );
};
