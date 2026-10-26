import React from 'react';
import { History, Award, Sparkles, CheckCircle2, XCircle, Calendar, Tag } from 'lucide-react';
import { Offer } from '../../../shared/types/offer';

interface OfferHistoryListProps {
  offers: Offer[];
}

export const OfferHistoryList: React.FC<OfferHistoryListProps> = ({ offers }) => {
  if (offers.length === 0) {
    return (
      <div className="py-12 bg-white rounded-3xl border border-[#e2e7e6] text-center text-[#6a787e] p-6">
        <History className="w-10 h-10 mx-auto text-[#e2e7e6] mb-3" />
        <h4 className="font-bold text-[#10181c] text-base">No Offer History Available</h4>
        <p className="text-xs mt-1">Previous and inactive campaigns will be archived here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-base font-bold text-[#10181c] flex items-center gap-2">
          <History className="w-5 h-5 text-[#0e7c66]" />
          <span>Offer History ({offers.length})</span>
        </h3>
      </div>

      <div className="bg-white rounded-3xl border border-[#e2e7e6] overflow-hidden shadow-xs divide-y divide-[#e2e7e6]">
        {offers.map(offer => {
          const isActive = offer.status === 'active';
          const isCancelled = offer.status === 'cancelled';
          const isCompleted = offer.status === 'completed';

          return (
            <div
              key={offer.id}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1f3f2]/30 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#10181c] text-sm sm:text-base">
                    {offer.title}
                  </span>
                  <span className="text-xs uppercase font-bold text-[#6a787e] bg-[#f1f3f2] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                    <Tag className="w-3 h-3 text-[#0e7c66]" />
                    {offer.tier.toUpperCase()} TIER
                  </span>

                  {isActive && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  )}
                  {isCancelled && (
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Deleted / Inactive
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-xs font-bold text-[#6a787e] bg-[#e2e7e6] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#6a787e]" />
                      Completed
                    </span>
                  )}
                </div>

                {offer.description && (
                  <p className="text-xs text-[#6a787e]">{offer.description}</p>
                )}

                {/* Configuration summary */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#6a787e] pt-1">
                  {offer.spinWheelConfiguration && offer.spinWheelConfiguration.length > 0 && (
                    <span className="flex items-center gap-1 bg-[#f8faf9] px-2.5 py-1 rounded-lg border border-[#e2e7e6]">
                      <Sparkles className="w-3.5 h-3.5 text-[#0e7c66]" />
                      {offer.spinWheelConfiguration.length} Spin Slices
                    </span>
                  )}
                  {offer.loyaltyTarget && (
                    <span className="flex items-center gap-1 bg-[#f8faf9] px-2.5 py-1 rounded-lg border border-[#e2e7e6]">
                      <Award className="w-3.5 h-3.5 text-[#0e7c66]" />
                      Target: {offer.loyaltyTarget} Stamps ({offer.loyaltyReward || 'Reward'})
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#6a787e]" />
                    Created: {new Date(offer.createdAt).toLocaleDateString()}
                  </span>
                  {offer.cancelledAt && (
                    <span className="text-rose-600 font-medium">
                      Deleted: {new Date(offer.cancelledAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Metrics summary */}
              <div className="flex items-center gap-4 bg-[#f8faf9] p-3 rounded-2xl border border-[#e2e7e6] shrink-0 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#6a787e] block">Scans</span>
                  <span className="text-sm font-mono font-bold text-[#10181c]">
                    {offer.metrics?.scans || 0}
                  </span>
                </div>
                <div className="w-px h-6 bg-[#e2e7e6]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#6a787e] block">Issued</span>
                  <span className="text-sm font-mono font-bold text-[#10181c]">
                    {offer.metrics?.rewardsIssued || 0}
                  </span>
                </div>
                <div className="w-px h-6 bg-[#e2e7e6]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#6a787e] block">Redeemed</span>
                  <span className="text-sm font-mono font-bold text-[#10181c]">
                    {offer.metrics?.rewardsRedeemed || 0}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
