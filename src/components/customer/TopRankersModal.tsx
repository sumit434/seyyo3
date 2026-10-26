import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { TopRanker } from '../../../shared/types/qr';
import { customerService } from '../../services/customerService';
import { Trophy, Medal, Flame, Loader2 } from 'lucide-react';
import { getStreakerRank } from '../../utils/loyaltyRanking';

interface TopRankersModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessSlug: string;
  currentStreak?: number;
}

export const TopRankersModal: React.FC<TopRankersModalProps> = ({
  isOpen,
  onClose,
  businessSlug,
  currentStreak,
}) => {
  const [rankers, setRankers] = useState<TopRanker[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && businessSlug) {
      setIsLoading(true);
      customerService
        .getTopRankers(businessSlug)
        .then(res => {
          setRankers(res.topRankers || []);
          setBusinessName(res.businessName || '');
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, businessSlug]);

  const getRankBadge = (rank: number | null | undefined) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-sm shadow-sm shrink-0">
          🥇
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center font-black text-sm shadow-sm shrink-0">
          🥈
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center font-black text-sm shadow-sm shrink-0">
          🥉
        </div>
      );
    }
    if (typeof rank === 'number' && rank > 0) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#f1f3f2] text-[#6a787e] flex items-center justify-center font-bold text-sm shrink-0">
          #{rank}
        </div>
      );
    }
    return (
      <div className="w-auto px-2 h-8 rounded-full bg-[#f1f3f2] text-[#6a787e] flex items-center justify-center font-bold text-xs shrink-0">
        Unranked
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Top 5 Loyal Legends"
      description={`Hall of Fame for ${businessName}`}
      maxWidth="md"
    >
      <div className="space-y-4 text-left">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#6a787e]">
            <Loader2 className="w-6 h-6 animate-spin text-[#0e7c66]" />
            <span className="text-xs font-semibold">Calculating rankings...</span>
          </div>
        ) : rankers.length === 0 ? (
          <div className="py-8 text-center text-[#6a787e]">
            <Trophy className="w-10 h-10 mx-auto text-[#e2e7e6] mb-2" />
            <p className="text-sm font-semibold text-[#10181c]">No rankers yet</p>
            <p className="text-xs mt-1">Be the first to stamp visits and claim the #1 spot!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rankers.map(r => {
              const streak = typeof r.currentStreak === 'number'
                ? r.currentStreak
                : ((r as any).streak ?? 0);
              const displayRank = typeof r.rank === 'number' && r.rank > 0
                ? r.rank
                : (typeof (r as any).vipRank === 'number' && (r as any).vipRank > 0 ? (r as any).vipRank : null);
              const streakerRank = getStreakerRank({
                ...r,
                currentStreak: streak,
              });

              return (
                <div
                  key={(r as any).id || `${r.name}-${displayRank}`}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    displayRank === 1
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-white border-[#e2e7e6]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getRankBadge(displayRank)}
                    <div>
                      <h4 className="text-sm font-bold text-[#10181c]">{r.name}</h4>
                      <p className="text-xs text-[#6a787e] font-mono">{r.maskedMobile}</p>
                      {streakerRank ? (
                        <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                          Streaker #{streakerRank} {streak > 1 ? `(${streak} streak)` : ''}
                        </span>
                      ) : streak > 0 ? (
                        <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                          {streak} day streak
                        </span>
                      ) : (
                        <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-[#f1f3f2] text-[#6a787e] font-medium">
                          Unranked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[#0e7c66] font-black text-base font-mono">
                      <Flame className="w-4 h-4 fill-[#0e7c66]" />
                      <span>{r.totalVisits}</span>
                    </div>
                    <p className="text-[10px] text-[#6a787e] uppercase font-bold tracking-wider">
                      Lifetime Visits
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-[#e2e7e6] flex items-center justify-between text-[11px] text-[#6a787e]">
          <span>Rankings update after every verified customer visit.</span>
          <span className="font-semibold text-[#0e7c66]">Top 5 Legends</span>
        </div>
      </div>
    </Modal>
  );
};
