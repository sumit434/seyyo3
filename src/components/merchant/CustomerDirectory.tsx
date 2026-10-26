import React, { useState } from 'react';
import { MessageSquare, Flame } from 'lucide-react';
import { Customer } from '../../types';
import { computeCustomerRanks, CustomerRankProfile } from '../../utils/loyaltyRanking';
import { WhatsAppOutreachModal } from './WhatsAppOutreachModal';

export interface CustomerRowProps {
  customer: CustomerRankProfile;
  showWhatsApp: boolean;
  onOpenModal: () => void;
}

export const CustomerRow: React.FC<CustomerRowProps> = ({
  customer,
  showWhatsApp,
  onOpenModal,
}) => {
  const vipDisplay = typeof customer.vipRank === 'number' && customer.vipRank > 0
    ? `#${customer.vipRank}`
    : 'Unranked';

  const streakerDisplay = typeof customer.streakerRank === 'number' && customer.streakerRank > 0
    ? `Streaker #${customer.streakerRank}`
    : 'Unranked';

  return (
    <div className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="w-auto min-w-[32px] px-2 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700">
          {vipDisplay}
        </span>
        <div>
          <h4 className="font-bold text-sm text-gray-900">{customer.name}</h4>
          {(customer.phone || customer.mobile) && (
            <p className="text-xs text-gray-500 font-mono">
              {(customer.phone || customer.mobile).startsWith('+')
                ? (customer.phone || customer.mobile)
                : `+${customer.phone || customer.mobile}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right text-xs">
          <div className="flex items-center justify-end gap-1 font-bold text-emerald-700">
            <Flame className="w-3.5 h-3.5" />
            <span>{customer.lifetimeVisits} visits</span>
          </div>
          <span className="text-gray-500">
            {streakerDisplay}
          </span>
        </div>

        {showWhatsApp && (
          <button
            type="button"
            onClick={onOpenModal}
            className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
            aria-label="Open WhatsApp outreach"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export interface CustomerDirectoryProps {
  allCustomers?: any[];
  merchant?: {
    id?: string;
    name?: string;
    whatsappNumber?: string;
    [key: string]: any;
  };
  business?: any;
  activeOffer?: any;
  offer?: any;
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({
  allCustomers = [],
  merchant,
  business,
  activeOffer,
  offer,
}) => {
  const activeMerchant = merchant || business || { name: 'Store' };
  const currentOffer = activeOffer || offer || null;
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Compute storewide ranks across all store customers in database, never using screen index
  const rankedCustomers = computeCustomerRanks(allCustomers, currentOffer?.id, currentOffer?.status);
  const top100VipCustomers = rankedCustomers
    .sort((a, b) => a.vipRank - b.vipRank)
    .slice(0, 100);

  const handleOpenWhatsAppModal = (customer: CustomerRankProfile) => {
    setSelectedCustomer(customer as any);
    setIsModalOpen(true);
  };

  return (
    <div className="customer-sheet bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4 text-left">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Top 100 VIP Guests</h3>
          <p className="text-xs text-gray-500">
            Ranked strictly from #1 to #100 by lifetime loyalty visits
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          {top100VipCustomers.length} VIPs
        </span>
      </div>

      <div className="divide-y divide-gray-100 overflow-hidden">
        {top100VipCustomers.map(customer => (
          <CustomerRow
            key={customer.id}
            customer={customer}
            showWhatsApp={Boolean(customer.phone || customer.mobile || activeMerchant?.whatsappNumber?.trim())}
            onOpenModal={() => handleOpenWhatsAppModal(customer)}
          />
        ))}
      </div>

      <WhatsAppOutreachModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        business={activeMerchant}
        offer={currentOffer}
        source="customer_directory"
      />
    </div>
  );
};
