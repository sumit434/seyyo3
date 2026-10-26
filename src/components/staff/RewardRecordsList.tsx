import React from 'react';
import { Gift, CheckCircle, Clock } from 'lucide-react';
import { Reward } from '../../../shared/types/reward';

interface RewardRecordsListProps {
  rewards: Reward[];
  onOpenRedeemModal: (code?: string) => void;
}

export const RewardRecordsList: React.FC<RewardRecordsListProps> = ({ rewards, onOpenRedeemModal }) => {
  // Enforce frontend 500-record display limit for Reward History (most recent 500 records)
  const displayedRewards = rewards.slice(0, 500);

  if (displayedRewards.length === 0) {
    return (
      <div className="py-12 bg-white rounded-3xl border border-[#e2e7e6] text-center text-[#6a787e] p-6">
        <Gift className="w-10 h-10 mx-auto text-[#e2e7e6] mb-3" />
        <h4 className="font-bold text-[#10181c] text-base">No Vouchers Issued Yet</h4>
        <p className="text-xs mt-1">Spin and loyalty rewards will show up here as guests claim them.</p>
      </div>
    );
  }

  const getVoucherBadgeClass = (voucher: Reward) => {
    // 🔴 Red: voucher.status !== 'redeemed' (pending/issued, both spin and loyalty)
    if (voucher.status !== 'redeemed') {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    // 🟢 Green: voucher.status === 'redeemed' && voucher.type === 'spin'
    if (voucher.type === 'spin') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    // 🟡 Yellow: voucher.status === 'redeemed' && voucher.type === 'loyalty'
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-base font-bold text-[#10181c] flex items-center gap-2">
          <Gift className="w-5 h-5 text-[#0e7c66]" />
          <span>Reward & Voucher History ({displayedRewards.length})</span>
        </h3>
        {rewards.length > 500 && (
          <span className="text-xs text-[#6a787e]">
            Showing latest 500 of {rewards.length} records
          </span>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-[#e2e7e6] overflow-hidden shadow-xs divide-y divide-[#e2e7e6]">
        {displayedRewards.map(rew => {
          const isRedeemed = rew.status === 'redeemed';

          return (
            <div key={rew.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f1f3f2]/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm font-black px-2.5 py-0.5 rounded-lg border ${getVoucherBadgeClass(rew)}`}>
                    {rew.code}
                  </span>
                  <span className="text-xs uppercase font-bold text-[#6a787e] bg-[#f1f3f2] px-2 py-0.5 rounded-md">
                    {rew.type === 'spin' ? 'Spin Reward' : 'Loyalty Milestone'}
                  </span>
                </div>
                <h4 className="font-bold text-[#10181c] text-sm">{rew.title}</h4>
                <p className="text-xs text-[#6a787e]">
                  Issued to: <span className="font-semibold text-[#10181c]">{rew.customerName || 'Guest'}</span> ({rew.customerMobileMasked || (rew as any).customerMobile || 'Mobile'})
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                {isRedeemed ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0e7c66] bg-[#e2f1ec] px-3 py-1.5 rounded-xl border border-[#0e7c66]/20">
                    <CheckCircle className="w-4 h-4" />
                    <span>Redeemed</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenRedeemModal(rew.code)}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Redeem Voucher</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const RewardHistoryTable = RewardRecordsList;
