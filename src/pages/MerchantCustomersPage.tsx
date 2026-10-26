import React, { useEffect, useState } from 'react';
import { staffApi } from '../services/staffApi';
import { Customer } from '../types';
import { WhatsAppOutreachModal } from '../components/merchant/WhatsAppOutreachModal';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { safeSessionStorage } from '../utils/safeStorage';
import { computeCustomerRanks } from '../utils/loyaltyRanking';
import {
  Users,
  MessageSquare,
  Search,
  Award,
  Flame,
  ArrowLeft,
  SlidersHorizontal,
  Phone,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const MerchantCustomersPage: React.FC = () => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [business, setBusiness] = useState<any | null>(null);
  const [offer, setOffer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // WhatsApp Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Merchant WhatsApp Visibility Guard: show icon ONLY if merchant.whatsappNumber is saved and non-empty
  const merchant = business;
  const hasMerchantWhatsApp = Boolean((merchant?.whatsappNumber || business?.whatsappNumber || '')?.trim());

  const fetchCustomerData = async (token: string) => {
    try {
      const res = await staffApi.getMerchantCustomers(token);
      const allCustomers = res.customers || [];
      const rankedCustomers = computeCustomerRanks(allCustomers, res.offer?.id);

      // Strictly slice Top 100 VIP rankers (#1 to #100)
      const top100VipCustomers = rankedCustomers
        .sort((a, b) => a.vipRank - b.vipRank)
        .slice(0, 100)
        .map(c => ({
          ...c,
          rank: c.vipRank,
          lifetimeRank: c.vipRank,
          activeOfferRank: c.streakerRank,
        }));

      setCustomers(top100VipCustomers);
      setBusiness(res.business);
      setOffer(res.offer);
      setError(null);
    } catch (err: any) {
      // Fallback to getTerminalData
      try {
        const termData = await staffApi.getTerminalData(token);
        const rawRecs = termData.loyaltyRecords || [];
        const rankedCustomers = computeCustomerRanks(rawRecs, termData.offer?.id);

        const top100VipCustomers = rankedCustomers
          .sort((a, b) => a.vipRank - b.vipRank)
          .slice(0, 100)
          .map(c => ({
            ...c,
            rank: c.vipRank,
            lifetimeRank: c.vipRank,
            activeOfferRank: c.streakerRank,
          }));

        setCustomers(top100VipCustomers);
        setBusiness(termData.business);
        setOffer(termData.offer);
        setError(null);
      } catch (termErr: any) {
        setError(err.message || termErr.message || 'Failed to load customers');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = safeSessionStorage.getItem('seyo_staff_session');
    if (!token) {
      window.location.href = '/staff/login';
      return;
    }
    setSessionToken(token);
    fetchCustomerData(token);
  }, []);

  const handleOpenOutreach = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  // Strictly cap customer outreach directory to the Top 100 entries
  const top100Customers = customers.slice(0, 100);

  const filteredCustomers = top100Customers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (c.name || '').toLowerCase().includes(q);
    const phoneMatch = (c.phone || c.mobile || '').includes(q);
    return nameMatch || phoneMatch;
  });

  if (loading) {
    return <LoadingScreen message="Loading merchant customers..." />;
  }

  if (error || !business) {
    return (
      <ErrorMessage
        title="Session Expired or Unauthorized"
        message={error || 'Please log in again with your merchant credentials.'}
        actionText="Staff Login"
        onRetry={() => {
          safeSessionStorage.removeItem('seyo_staff_session');
          window.location.href = '/staff/login';
        }}
      />
    );
  }

  const targetStamps = offer?.loyaltyTarget || business?.loyaltyTarget || 6;

  return (
    <div className="min-h-screen bg-[#f1f3f2] p-3 sm:p-8 text-left">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Top Bar */}
        <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/staff/terminal"
              className="w-10 h-10 rounded-2xl border border-[#e2e7e6] flex items-center justify-center text-[#10181c] hover:bg-[#f1f3f2] transition-colors"
              title="Return to Staff Terminal"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#10181c]">Customer Outreach & WhatsApp</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                  1-Click Marketing
                </span>
              </div>
              <p className="text-xs text-[#6a787e] mt-0.5">
                {business.name} • Send personalized stamp balances & promotion offers via wa.me links
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="/merchant/settings"
              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-2xl border border-[#e2e7e6] bg-[#f8faf9] hover:bg-[#e2e7e6]/60 text-xs font-bold text-[#10181c] transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#0e7c66]" />
              <span>Merchant Settings</span>
            </a>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e7e6] shadow-sm">
            <div className="flex items-center justify-between text-[#6a787e] mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Customers</span>
              <Users className="w-4 h-4 text-[#0e7c66]" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-[#10181c] font-mono">
              {customers.length}
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e7e6] shadow-sm">
            <div className="flex items-center justify-between text-[#6a787e] mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Top 10 VIPs</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-[#10181c] font-mono">
              {Math.min(10, customers.length)}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e7e6] shadow-sm">
            <div className="flex items-center justify-between text-[#6a787e] mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">WhatsApp Ready</span>
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
              {customers.filter(c => Boolean(c.phone || c.mobile)).length}
            </span>
          </div>
        </div>

        {/* Customer Directory Table */}
        <div className="bg-white rounded-3xl border border-[#e2e7e6] shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#e2e7e6]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#10181c]">Top 100 VIP Guests</h3>
              <p className="text-xs text-[#6a787e]">
                {hasMerchantWhatsApp
                  ? 'Click the WhatsApp icon to open pre-filled outreach chats for any customer (Top 100)'
                  : 'Displaying the Top 100 VIP rankers ordered from #1 to #100'}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6a787e]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] text-[#10181c] placeholder-[#6a787e] focus:outline-none focus:border-[#0e7c66]"
              />
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="py-16 text-center text-[#6a787e] space-y-2">
              <Users className="w-10 h-10 mx-auto text-[#e2e7e6]" />
              <p className="font-bold text-sm text-[#10181c]">No customers found</p>
              <p className="text-xs">
                {searchQuery ? 'Try clearing your search query.' : 'Customers will appear here once they scan and collect stamps.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8faf9] text-[#6a787e] uppercase tracking-wider font-bold border-b border-[#e2e7e6]/70">
                    <th className="py-3 px-4 sm:px-6">Rank</th>
                    <th className="py-3 px-4 sm:px-6">Customer</th>
                    <th className="py-3 px-4 sm:px-6">Phone Number</th>
                    <th className="py-3 px-4 sm:px-6">Stamp Cycle</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Lifetime Visits</th>
                    {hasMerchantWhatsApp && (
                      <th className="py-3 px-4 sm:px-6 text-right">WhatsApp Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e7e6]/60 font-medium text-[#10181c]">
                  {filteredCustomers.map(customer => {
                    const isTopTen = Boolean(customer.rank && customer.rank <= 10);
                    const phone = customer.phone || customer.mobile || '—';
                    const progressPercent = Math.min(100, Math.round(((customer.visitCount || 0) / targetStamps) * 100));

                    return (
                      <tr key={customer.id} className="hover:bg-[#f8faf9]/80 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                              isTopTen
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-[#f1f3f2] text-[#6a787e]'
                            }`}
                          >
                            #{customer.rank || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="font-bold text-[#10181c] text-sm">
                            {customer.name || 'Valued Guest'}
                          </div>
                          {customer.lastVisitAt && (
                            <span className="text-[11px] text-[#6a787e]">
                              Last: {new Date(customer.lastVisitAt).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                          {phone}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 min-w-[160px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-[#6a787e]">Progress</span>
                              <span className="text-[#0e7c66] font-mono">
                                {customer.visitCount || 0} / {targetStamps}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-[#e2e7e6] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#0e7c66] rounded-full"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-center font-mono font-bold text-[#0e7c66]">
                          <div className="inline-flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 fill-[#0e7c66]" />
                            <span>{customer.totalVisits || customer.lifetimeVisits || 0}</span>
                          </div>
                        </td>
                        {hasMerchantWhatsApp && (
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenOutreach(customer)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                              title={`Send WhatsApp message to ${customer.name || 'customer'}`}
                              aria-label="Open WhatsApp outreach"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Outreach Modal */}
      <WhatsAppOutreachModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        business={business}
        offer={offer}
        source="customer_directory"
      />
    </div>
  );
};
