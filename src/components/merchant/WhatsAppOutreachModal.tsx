import React from 'react';
import { Modal } from '../common/Modal';
import { Customer } from '../../types';
import { Phone } from 'lucide-react';
import { generateUserCheckMessage } from '../../utils/whatsapp';
import { isValidWhatsAppNumber, formatWhatsAppPhone } from '../../../shared/validation/phoneValidation';

export interface WhatsAppOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  business: {
    id?: string;
    name: string;
    tier?: string;
    country?: string;
    whatsappNumber?: string;
    loyaltyTarget?: number;
    [key: string]: any;
  };
  offer?: {
    id?: string;
    title?: string;
    loyaltyTarget?: number;
    loyaltyReward?: string;
    expiresAt?: string;
    [key: string]: any;
  } | null;
  source?: 'loyalty_log' | 'customer_directory';
}

export const WhatsAppOutreachModal: React.FC<WhatsAppOutreachModalProps> = ({
  isOpen,
  onClose,
  customer,
  business,
  offer,
  source = 'customer_directory',
}) => {
  if (!customer) return null;

  // 1. Phone Normalization: check all possible unmasked customer property aliases first
  const candidates = [
    (customer as any).rawMobile,
    (customer as any).rawPhone,
    (customer as any).phoneNumber,
    (customer as any).fullMobile,
    customer.phone,
    customer.mobile,
    (customer as any).mobileMasked,
  ];

  // Select first non-empty candidate that does NOT contain mask characters (* or x)
  const unmaskedCandidate = candidates.find(
    c => c && !String(c).includes('*') && !/x/i.test(String(c))
  );
  const customerPhone = (unmaskedCandidate || candidates.find(Boolean) || '').toString().trim();

  const countryCode =
    (customer as any).countryCode ||
    (customer as any).dialCode ||
    business?.country;

  const isValid = isValidWhatsAppNumber(customerPhone, countryCode);
  const formattedPhone = formatWhatsAppPhone(customerPhone, countryCode);

  // 2. Active Offer & Title Resolution
  const activeOffer = customer.activeOffer
    ? customer.activeOffer
    : offer && (offer.title || offer.loyaltyReward)
    ? {
        ...offer,
        title: offer.title || offer.loyaltyReward || 'Offer Promo',
      }
    : null;

  const activeOfferTitle = activeOffer?.title || offer?.title || offer?.loyaltyReward || 'Active Offer';

  // 3. Dual-Ranks resolution (VIP Rank & Streaker Rank)
  const vipRank = (customer as any).vipRank ?? customer.lifetimeRank ?? customer.rank ?? 1;
  const streakerRank =
    (customer as any).streakerRank !== undefined
      ? (customer as any).streakerRank
      : customer.activeOfferRank !== undefined
      ? customer.activeOfferRank
      : null;

  // 4. "User Check" Message Template via centralized builder
  const targetStamps = offer?.loyaltyTarget || business?.loyaltyTarget || 6;
  const totalVisits = customer.lifetimeVisits ?? customer.totalVisits ?? 1;
  const currentStamps = customer.activeOfferVisits ?? customer.visitCount ?? 0;
  const customerName = customer.name || 'Valued Guest';
  const businessName = business.name || 'Store';

  const userCheckMessage = generateUserCheckMessage({
    customerName,
    businessName,
    vipRank,
    totalVisits,
    streakerRank,
    currentStamps,
    maxStamps: targetStamps,
  });

  // 5. Preset 2: Offer Promo (Tier Specific)
  const validUntilText =
    activeOffer?.validUntil ||
    (offer?.expiresAt ? new Date(offer.expiresAt).toLocaleDateString() : 'this Sunday');

  const promoMessage = activeOffer
    ? `Hi ${customerName}! Special treat from ${businessName}: Enjoy ${activeOffer.title} as part of this active offer the moment you unlock your milestone target! Show this at the counter to redeem.\n\n(Reply STOP to unsubscribe)`
    : '';

  const handleSendWhatsApp = (type: 'USER_CHECK' | 'OFFER_PROMO') => {
    if (!isValid || !formattedPhone) return;
    const message = type === 'USER_CHECK' ? userCheckMessage : promoMessage;
    if (!message) return;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="1-Click WhatsApp Outreach"
      maxWidth="md"
    >
      <div className="space-y-4 text-left">
        {/* Customer Profile / Ledger Summary Info */}
        <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e7e6] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e2f1ec] text-[#0e7c66] flex items-center justify-center font-bold text-base">
              {customer.name ? customer.name[0].toUpperCase() : 'G'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-[#10181c]">{customer.name || 'Valued Guest'}</h4>
              </div>

              {/* Ranks Surface */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0e7c66]/10 text-[#0e7c66] border border-[#0e7c66]/20">
                  VIP: #{vipRank || '—'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    typeof streakerRank === 'number' && streakerRank > 0
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}
                >
                  {typeof streakerRank === 'number' && streakerRank > 0
                    ? `Streaker: #${streakerRank}`
                    : 'Unranked'}
                </span>
              </div>

              <p className="text-xs text-[#6a787e] font-mono flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3 text-[#0e7c66]" />
                <span>+{formattedPhone || customerPhone.replace(/\D/g, '') || customerPhone}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-[#0e7c66] block">
              {currentStamps} / {targetStamps} Stamps
            </span>
            <span className="text-[11px] text-[#6a787e]">
              {totalVisits} total visits
            </span>
          </div>
        </div>

        {/* Direct Actions */}
        <div className="flex flex-col gap-3 pt-2">
          {!isValid && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-center font-semibold">
              Please provide a valid, active phone number.
            </p>
          )}

          {/* Emerald Green: User Check */}
          <button
            type="button"
            onClick={() => handleSendWhatsApp('USER_CHECK')}
            disabled={!isValid}
            className={`w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors text-center shadow-sm ${
              !isValid ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            User Check
          </button>

          {/* Brand Yellow #fe9a00: Offer Promo with White Text */}
          <button
            type="button"
            onClick={() => handleSendWhatsApp('OFFER_PROMO')}
            disabled={!isValid || !activeOffer}
            className={`w-full py-3 px-4 rounded-xl bg-[#fe9a00] hover:bg-[#e08800] text-white font-semibold text-sm transition-colors text-center shadow-sm ${
              !isValid || !activeOffer ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            {activeOffer ? activeOffer.title : 'Offer Promo'}
          </button>
        </div>
      </div>
    </Modal>
  );
};