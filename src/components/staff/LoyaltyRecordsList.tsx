import React, { useState } from 'react';
import { Award, Flame, Users, MessageSquare, ArrowRight } from 'lucide-react';
import { WhatsAppOutreachModal } from '../merchant/WhatsAppOutreachModal';
import { Customer } from '../../types';
import { isValidWhatsAppNumber } from '../../../shared/validation/phoneValidation';

export interface LoyaltyRecord {
  id: string;
  name: string;
  mobile?: string;
  phone?: string;
  rawMobile?: string;
  rawPhone?: string;
  phoneNumber?: string;
  fullMobile?: string;
  mobileMasked?: string;
  countryCode?: string;
  visitCount: number;
  target?: number;
  totalVisits: number;
  lastVisitAt?: string;
  [key: string]: any;
}

export interface LoyaltyRecordsListProps {
  records?: LoyaltyRecord[];
  target?: number;
  business?: any;
  merchant?: any;
  offer?: any;
  activeOffer?: any;
  hasActiveOffer?: boolean;
  onOpenTop100?: () => void;
}

export const LoyaltyRecordsList: React.FC<LoyaltyRecordsListProps> = ({
  records = [],
  target,
  business = { name: 'Store' },
  merchant,
  offer = null,
  activeOffer,
  hasActiveOffer,
  onOpenTop100,
}) => {
  const activeMerchant = merchant || business || { name: 'Store' };
  const currentOffer = activeOffer || offer || null;
  const targetVisits = target || currentOffer?.loyaltyTarget || activeMerchant?.loyaltyTarget || 6;
  const isActiveOffer =
    typeof hasActiveOffer === 'boolean'
      ? hasActiveOffer
      : Boolean(
          currentOffer &&
          (currentOffer.status === 'active' || (!currentOffer.status && Boolean(currentOffer.id))) &&
          currentOffer.status !== 'cancelled' &&
          currentOffer.status !== 'completed' &&
          currentOffer.status !== 'expired' &&
          currentOffer.status !== 'no_offer'
        );

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Storewide pre-computed rank resolution: read directly from record
  const getRecordRanks = (rec: LoyaltyRecord) => {
    const vipRank =
      typeof rec.vipRank === 'number' && rec.vipRank > 0
        ? rec.vipRank
        : typeof rec.rank === 'number' && rec.rank > 0
        ? rec.rank
        : null;
    const streakerRank =
      typeof rec.streakerRank === 'number' && rec.streakerRank > 0
        ? rec.streakerRank
        : typeof rec.activeOfferRank === 'number' && rec.activeOfferRank > 0
        ? rec.activeOfferRank
        : null;
    return { vipRank, streakerRank };
  };

  // Resolves the best available unmasked phone representation
  const resolveCustomerPhone = (rec: LoyaltyRecord): string => {
    const candidates = [
      rec.rawMobile,
      rec.rawPhone,
      rec.phoneNumber,
      rec.fullMobile,
      rec.mobile,
      rec.phone,
      rec.mobileMasked,
    ];
    const unmasked = candidates.find(
      c => c && !String(c).includes('*') && !/x/i.test(String(c))
    );
    return (unmasked || candidates.find(Boolean) || '').toString().trim();
  };

  const handleOpenWhatsApp = (rec: LoyaltyRecord) => {
    const { vipRank, streakerRank } = getRecordRanks(rec);
    const phoneToUse = resolveCustomerPhone(rec);
    const countryToUse = rec.countryCode || activeMerchant?.country;

    const cust: Customer = {
      id: rec.id,
      businessId: activeMerchant?.id || '',
      name: rec.name || 'Valued Guest',
      mobile: phoneToUse,
      phone: phoneToUse,
      rawMobile: rec.rawMobile || phoneToUse,
      phoneNumber: rec.phoneNumber || phoneToUse,
      fullMobile: rec.fullMobile || phoneToUse,
      countryCode: countryToUse,
      rank: vipRank || 1,
      vipRank: vipRank || 1,
      streakerRank: streakerRank ?? null,
      lifetimeRank: vipRank || 1,
      activeOfferRank: streakerRank ?? null,
      visitCount: rec.visitCount || 0,
      activeOfferVisits: rec.visitCount || 0,
      totalVisits: rec.totalVisits || 0,
      lifetimeVisits: rec.totalVisits || 0,
      lastVisitAt: rec.lastVisitAt,
      activeOffer: currentOffer
        ? {
            title: currentOffer.loyaltyReward || currentOffer.title,
            validUntil: currentOffer.expiresAt,
          }
        : undefined,
      createdAt: rec.lastVisitAt || new Date().toISOString(),
      updatedAt: rec.lastVisitAt || new Date().toISOString(),
    } as any;

    setSelectedCustomer(cust);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-base font-bold text-[#10181c] flex items-center gap-2">
          <Award className="w-5 h-5 text-[#0e7c66]" />
          <span>Customer Loyalty Log ({records.length})</span>
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6a787e]">Target: {targetVisits} visits</span>
          {isActiveOffer && (
            onOpenTop100 ? (
              <button
                type="button"
                onClick={onOpenTop100}
                className="px-3.5 py-1.5 bg-[#0e7c66] hover:bg-[#0c6b58] text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="View Top 100 VIP Directory"
              >
                <span>Top 100</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            ) : (
              <a
                href="/merchant/customers"
                className="px-3.5 py-1.5 bg-[#0e7c66] hover:bg-[#0c6b58] text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                title="View Top 100 VIP Directory"
              >
                <span>Top 100</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </a>
            )
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="py-12 bg-white rounded-3xl border border-[#e2e7e6] text-center text-[#6a787e] p-6 shadow-xs">
          <Users className="w-10 h-10 mx-auto text-[#e2e7e6] mb-3" />
          <h4 className="font-bold text-[#10181c] text-base">No Loyalty Activity Recorded Yet</h4>
          <p className="text-xs mt-1">Customer visit stamps will appear here in real time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#e2e7e6] overflow-hidden shadow-xs divide-y divide-[#e2e7e6]">
        {records.map((rec) => {
          const { vipRank, streakerRank } = getRecordRanks(rec);
          const maxTarget = rec.target || targetVisits;
          const progressPercent = Math.min(
            100,
            Math.round(((rec.visitCount || 0) / maxTarget) * 100)
          );

          const customerPhone = resolveCustomerPhone(rec);
          const customerCountryCode = rec.countryCode || activeMerchant?.country;
          const isValidPhone = isValidWhatsAppNumber(customerPhone, customerCountryCode);
          const displayMobile =
            rec.mobile || rec.phone || rec.fullMobile || rec.mobileMasked || customerPhone;

          return (
            <div
              key={rec.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f1f3f2]/30 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-[#10181c] text-sm">{rec.name || 'Valued Guest'}</h4>
                  {displayMobile && (
                    <span className="font-mono text-xs text-[#10181c] font-semibold bg-[#f1f3f2] px-2.5 py-0.5 rounded-md border border-[#e2e7e6]">
                      {displayMobile}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0e7c66]/10 text-[#0e7c66] font-bold border border-[#0e7c66]/20">
                    VIP: {vipRank ? `#${vipRank}` : 'Unranked'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                    {streakerRank ? `Streaker: #${streakerRank}` : 'Unranked'}
                  </span>
                </div>
                <p className="text-xs text-[#6a787e]">
                  Last visit: {rec.lastVisitAt ? new Date(rec.lastVisitAt).toLocaleDateString() : 'Today'}
                </p>
              </div>

              {/* Progress, lifetime visits & WhatsApp outreach trigger */}
              <div className="flex items-center gap-3 sm:min-w-[280px]">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#6a787e]">Current Cycle</span>
                    <span className="text-[#0e7c66] font-mono">
                      {rec.visitCount || 0} / {maxTarget}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#e2e7e6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0e7c66] rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-[#0e7c66] font-bold text-sm font-mono">
                    <Flame className="w-3.5 h-3.5 fill-[#0e7c66]" />
                    <span>{rec.totalVisits || 0}</span>
                  </div>
                  <span className="text-[10px] text-[#6a787e] uppercase font-semibold">Total</span>
                </div>

                {/* 1-Click WhatsApp Button */}
                <button
                  type="button"
                  onClick={() => isValidPhone && handleOpenWhatsApp(rec)}
                  disabled={!isValidPhone}
                  className={`p-2 rounded-xl border transition-colors shrink-0 ${
                    isValidPhone
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 cursor-pointer shadow-xs'
                      : 'bg-gray-100 text-gray-400 border-gray-200 opacity-40 pointer-events-none cursor-not-allowed'
                  }`}
                  title={
                    isValidPhone
                      ? `1-Click WhatsApp message to ${rec.name || 'Valued Guest'}`
                      : 'Please provide a valid, active phone number'
                  }
                  aria-label="Open WhatsApp outreach"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}

      <WhatsAppOutreachModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        business={activeMerchant}
        offer={currentOffer}
        source="loyalty_log"
      />
    </div>
  );
};

export const LoyaltyLog = LoyaltyRecordsList;