import React, { useState } from 'react';
import { customerService } from '../../services/customerService';
import { Button } from '../common/Button';
import { Stamp, Check, Award, Flame, ArrowRight, Clock, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getStreakerRank } from '../../utils/loyaltyRanking';
import { TopRankersModal } from './TopRankersModal';

export interface LoyaltyLogProps {
  businessId: string;
  customerId: string;
  sessionToken?: string;
  visitCount: number;
  loyaltyTarget: number;
  totalVisits: number;
  currentStreak?: number;
  longestStreak?: number;
  streakerRank?: number | null;
  loyaltyRewardTitle: string;
  isStampedToday: boolean;
  cycleStartedAt?: string;
  validationDays?: number;
  activeOfferId?: string;
  offerStatus?: string;
  offer?: any;
  hasActiveOffer?: boolean;
  businessSlug?: string;
  records?: any[];
  onOpenTop100?: () => void;
  entryMode?: string;
  isRushMode?: boolean;
  skipStaffVerification?: boolean;
  onStampSuccess: (data: { milestoneReached: boolean; reward?: any }) => void;
  onContinue: () => void;
}

export type LoyaltyTrackerProps = LoyaltyLogProps;

export const LoyaltyLog: React.FC<LoyaltyLogProps> = ({
  businessId,
  customerId,
  sessionToken,
  visitCount,
  loyaltyTarget,
  totalVisits,
  currentStreak = 0,
  longestStreak = 0,
  streakerRank,
  loyaltyRewardTitle,
  isStampedToday,
  cycleStartedAt,
  validationDays = 60,
  activeOfferId,
  offerStatus,
  offer,
  hasActiveOffer,
  businessSlug,
  records,
  onOpenTop100,
  entryMode,
  isRushMode = false,
  skipStaffVerification = false,
  onStampSuccess,
  onContinue,
}) => {
  const [isStamping, setIsStamping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRankersOpen, setIsRankersOpen] = useState(false);

  const isActiveOffer =
    typeof hasActiveOffer === 'boolean'
      ? hasActiveOffer
      : offer
      ? (offer.status === 'active' || (!offer.status && Boolean(offer.id))) &&
        offer.status !== 'expired' &&
        offer.status !== 'cancelled' &&
        offer.status !== 'completed' &&
        offer.status !== 'no_offer'
      : offerStatus
      ? offerStatus === 'active'
      : Boolean(activeOfferId);

  const resolvedStreakerRank = getStreakerRank({
    streakerRank,
    currentStreak,
    visitCount,
    totalVisits,
  });

  const stampsNeeded = Math.max(0, loyaltyTarget - visitCount);
  const progressPercent = Math.min(100, Math.round((visitCount / loyaltyTarget) * 100));

  // Use customer.cycleStartedAt (falls back to now if cycle not yet started)
  const cycleStart = cycleStartedAt ? new Date(cycleStartedAt) : new Date();
  const windowDays = validationDays || 60;
  const expiryDate = new Date(cycleStart.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const msRemaining = expiryDate.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  const handleStamp = async () => {
    if (isStampedToday || isStamping) return;

    setIsStamping(true);
    setError(null);
    try {
      const res = await customerService.stampLoyalty(
        businessId,
        customerId,
        sessionToken,
        undefined,
        false, // requiresStaffVerification = false
        entryMode
      );
      if (res.milestoneReached) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#0e7c66', '#f59e0b', '#10b981'],
        });
      }
      onStampSuccess({ milestoneReached: res.milestoneReached, reward: res.reward });
    } catch (err: any) {
      setError(err.message || 'Stamp failed. Please try again.');
    } finally {
      setIsStamping(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl border border-[#e2e7e6] shadow-xl p-6 sm:p-8 text-left space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2f1ec] text-[#0e7c66] text-xs font-bold uppercase tracking-wider mb-2">
          <Award className="w-3.5 h-3.5" />
          <span>Loyalty Log</span>
        </div>
        <h2 className="text-2xl font-black text-[#10181c] tracking-tight">Collect Your Stamps</h2>
        {stampsNeeded > 0 ? (
          <div className="mt-2 text-center">
            <p className="text-sm font-extrabold text-[#10181c]">
              {stampsNeeded} more {stampsNeeded === 1 ? 'stamp' : 'stamps'} to unlock:
            </p>
            <p className="text-sm font-black text-[#0e7c66] mt-0.5">
              {loyaltyRewardTitle}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[#0e7c66] font-bold mt-1 text-center">
            Milestone target achieved! Claim your reward below.
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Progress Bar & Counter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-[#6a787e] uppercase tracking-wider">Cycle Progress</span>
          <span className="text-[#0e7c66] text-sm">
            {visitCount} / {loyaltyTarget} Stamps
          </span>
        </div>
        <div className="w-full h-3 bg-[#e2e7e6] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0e7c66] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Personal Validation Window Display */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#f1f3f2] border border-[#e2e7e6] text-xs">
        <div className="flex items-center gap-1.5 text-[#6a787e]">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-semibold">Validation Window:</span>
        </div>
        <span className="font-bold text-[#10181c]">
          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
        </span>
      </div>

      {/* Stamp Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-[#f1f3f2]/60 border border-[#e2e7e6]">
        {Array.from({ length: loyaltyTarget }).map((_, index) => {
          const isStamped = index < visitCount;
          const isNext = index === visitCount;

          return (
            <div
              key={index}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all ${
                isStamped
                  ? 'bg-[#0e7c66] text-white shadow-sm scale-100'
                  : isNext
                  ? 'bg-white border-2 border-dashed border-[#0e7c66] text-[#0e7c66] animate-pulse'
                  : 'bg-white/80 border border-[#e2e7e6] text-[#6a787e]/40'
              }`}
            >
              {isStamped ? (
                <Check className="w-6 h-6 stroke-[3]" />
              ) : (
                <span className="text-xs font-extrabold">{index + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Lifetime Stats Card */}
      <div className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#e2f1ec]/50 border border-[#0e7c66]/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#0e7c66] text-white flex items-center justify-center">
            <Flame className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#10181c]">Total Visits:</p>
            <p className="text-[11px] text-[#6a787e]">Never resets</p>
          </div>
        </div>
        <span className="text-lg font-black text-[#0e7c66] font-mono">{totalVisits}</span>
      </div>

      {/* Action Button & Top 100 Leaderboard */}
      <div className="space-y-3">
        {isStampedToday ? (
          <div className="space-y-3">
            <div className="p-3 bg-[#e2f1ec] rounded-2xl text-center">
              <p className="text-xs font-bold text-[#0e7c66]">
                ✓ Today&apos;s visit stamp collected!
              </p>
              <p className="text-[11px] text-[#0a6252] mt-0.5">
                Resets at midnight. Come back tomorrow for your next stamp!
              </p>
            </div>
            <Button onClick={onContinue} variant="primary" fullWidth className="gap-2">
              <span>Continue to Next Stage</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleStamp}
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isStamping}
            className="gap-2 shadow-lg cursor-pointer"
          >
            <Stamp className="w-5 h-5" />
            <span>Stamp Today&apos;s Visit</span>
          </Button>
        )}

        {/* Top 100 Leaderboard Trigger - Remains visible with 0 records, hides if offer is inactive/expired */}
        {isActiveOffer && (
          <Button
            type="button"
            onClick={onOpenTop100 || (() => setIsRankersOpen(true))}
            variant="outline"
            size="md"
            fullWidth
            className="gap-2 border-[#e2e7e6] text-[#10181c] hover:bg-[#f1f3f2] cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Top 100 Loyalty Rankers</span>
          </Button>
        )}
      </div>

      <TopRankersModal
        isOpen={isRankersOpen}
        onClose={() => setIsRankersOpen(false)}
        businessSlug={businessSlug || businessId}
        currentStreak={currentStreak}
      />
    </div>
  );
};

export const LoyaltyTracker = LoyaltyLog;
