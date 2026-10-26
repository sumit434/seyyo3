import React, { useState } from 'react';
import { LoyaltyRecordsList } from './LoyaltyRecordsList';
import { RewardRecordsList } from './RewardRecordsList';
import { QRGenerator } from './QRGenerator';
import { StaffPINModal } from './StaffPINModal';
import { OfferHistoryList } from './OfferHistoryList';
import { ActivateOfferModal } from './ActivateOfferModal';
import { MerchantProfileTab } from './MerchantProfileTab';
import { StaffProfileModal } from './StaffProfileModal';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { staffApi } from '../../services/staffApi';
import { updateStaffTerminalSettings } from '../../services/staffService';
import {
  Users,
  Gift,
  Award,
  Star,
  KeyRound,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CheckCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  History,
  Trash2,
  Plus,
  QrCode,
  Building2,
  Zap,
  SlidersHorizontal,
} from 'lucide-react';

interface CombinedTierTerminalProps {
  sessionToken: string;
  business: any;
  offer: any;
  hasActiveOffer?: boolean;
  trackerMetrics?: {
    totalGuests: number;
    claimedRewards: number;
    pendingVouchers: number;
    reviewsCount: number;
  };
  entries: any[];
  loyaltyRecords: any[];
  rewards: any[];
  reviews: any[];
  offerHistory?: any[];
  onRefresh: () => void;
  onLogout: () => void;
}

export const CombinedTierTerminal: React.FC<CombinedTierTerminalProps> = ({
  sessionToken,
  business,
  offer,
  hasActiveOffer: propHasActiveOffer,
  trackerMetrics,
  entries,
  loyaltyRecords,
  rewards,
  reviews,
  offerHistory = [],
  onRefresh,
  onLogout,
}) => {
  const isCombined = business.tier === 'combined';
  const hasLoyalty = business.tier === 'loyalty' || isCombined;
  const hasRewards = business.tier === 'spin' || isCombined;
  const hasReview = business.tier === 'review' || isCombined;

  const isOfferActive =
    typeof propHasActiveOffer === 'boolean'
      ? propHasActiveOffer
      : Boolean(
          offer &&
          (offer.status === 'active' || (!offer.status && Boolean(offer.id))) &&
          offer.status !== 'cancelled' &&
          offer.status !== 'completed' &&
          offer.status !== 'expired' &&
          offer.status !== 'no_offer'
        );

  // Active view toggle: QR & NFC Tags is the default active panel (first position)
  const [activeTab, setActiveTab] = useState<'qr' | 'loyalty' | 'rewards' | 'reviews' | 'history' | 'profile'>('qr');

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [targetVoucherCode, setTargetVoucherCode] = useState<string | undefined>(undefined);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingOffer, setIsDeletingOffer] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showStaffPin, setShowStaffPin] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTogglingRushMode, setIsTogglingRushMode] = useState(false);

  const handleQuickToggleRushMode = async () => {
    const nextState = !Boolean(business.skipRedemptionPin);
    setIsTogglingRushMode(true);
    try {
      await updateStaffTerminalSettings({ skipRedemptionPin: nextState });
      await onRefresh();
    } catch (err) {
      console.error('Failed to toggle rush mode', err);
    } finally {
      setIsTogglingRushMode(false);
    }
  };

  const metrics = offer?.metrics || {
    scans: 0,
    identifiedGuests: 0,
    rewardsIssued: 0,
    rewardsRedeemed: 0,
    loyaltyStampsIssued: 0,
  };

  // Pending rewards waiting to be redeemed
 // Offer-scoped metrics: persists through midnight, resets to 0 only when offer is deleted
const totalGuestsCount = offer ? (trackerMetrics?.totalGuests ?? offer?.metrics?.totalGuests ?? 0) : 0;
const totalClaimedCount = offer ? (trackerMetrics?.claimedRewards ?? offer?.metrics?.claimedRewards ?? 0) : 0;
const pendingRewardsCount = offer ? (trackerMetrics?.pendingVouchers ?? offer?.metrics?.pendingVouchers ?? 0) : 0;
const totalReviewsCount = offer ? (trackerMetrics?.reviewsCount ?? offer?.metrics?.reviewsCount ?? 0) : 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleOpenRedeem = (code?: string) => {
    setTargetVoucherCode(code);
    setIsPinModalOpen(true);
  };

  const handleConfirmDeleteOffer = async () => {
    setIsDeletingOffer(true);
    setDeleteError(null);
    try {
      await staffApi.deleteOffer(sessionToken);
      setIsDeleteModalOpen(false);
      // Switch to offer history so the merchant immediately sees the archived offer
      setActiveTab('history');
      onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete offer');
    } finally {
      setIsDeletingOffer(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Merchant Info and Quick Redeem Button */}
      <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl border border-[#e2e7e6] shadow-inner shrink-0"
            style={{ backgroundColor: `${business.accentColor || '#0e7c66'}15` }}
          >
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span>{business.logoEmoji || '🏪'}</span>
            )}
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-[#10181c] truncate">{business.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-[#0e7c66] text-white">
                {business.tier}
              </span>
            </div>
            <p className="text-xs text-[#6a787e] mt-0.5 truncate">
              {business.city}, {business.country} • Timezone: <span className="font-semibold text-[#10181c]">{business.timezone}</span>
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#e2e7e6]/70 flex-wrap">
          {/* Combined Rush Mode & Staff PIN Toggle Button */}
          <button
            type="button"
            onClick={handleQuickToggleRushMode}
            disabled={isTogglingRushMode}
            className={`h-11 flex items-center gap-2 px-3.5 rounded-2xl border transition-all cursor-pointer text-left shrink-0 ${
              business.skipRedemptionPin
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-[#f8faf9] text-[#10181c] border-[#e2e7e6] hover:bg-[#e2e7e6]/50'
            }`}
            title="Toggle Rush Hour Fast Redemption Mode"
          >
            <Zap
              className={`w-4 h-4 shrink-0 ${
                business.skipRedemptionPin ? 'text-white' : 'text-[#6a787e]'
              }`}
            />
            <span className="font-mono font-bold text-sm tracking-wider">
              {showStaffPin ? (business.configuredStaffPin || '7788') : '••••'}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setShowStaffPin(!showStaffPin);
              }}
              className={`p-1 cursor-pointer flex items-center justify-center rounded-lg transition-colors ${
                business.skipRedemptionPin
                  ? 'text-white/80 hover:text-white hover:bg-white/10'
                  : 'text-[#6a787e] hover:text-[#0e7c66] hover:bg-black/5'
              }`}
              title={showStaffPin ? 'Hide PIN' : 'Reveal PIN'}
            >
              {showStaffPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </span>
          </button>

          <Button onClick={onLogout} variant="outline" size="md" className="h-11 flex items-center px-4 rounded-2xl shrink-0">
            Sign Out
          </Button>
        </div>
      </div>

      {/* MOBILE VERSION: All-in-One Panel Box enclosing the 2x2 grid and refresh button */}
      <div className="block md:hidden bg-white border border-[#e2e7e6] rounded-3xl p-5 text-left">
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div className="bg-[#f8faf9] p-3 rounded-2xl border border-[#e2e7e6]/70">
            <div className="flex items-center justify-between text-[#6a787e] mb-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Guests</span>
              <Users className="w-3.5 h-3.5 text-[#0e7c66]" />
            </div>
            <span className="text-xl font-black text-[#10181c] font-mono">{totalGuestsCount}</span>
          </div>

          <div className="bg-[#f8faf9] p-3 rounded-2xl border border-[#e2e7e6]/70">
            <div className="flex items-center justify-between text-[#6a787e] mb-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Claimed</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0e7c66]" />
            </div>
            <span className="text-xl font-black text-[#10181c] font-mono">{totalClaimedCount}</span>
          </div>

          <div className="bg-[#f8faf9] p-3 rounded-2xl border border-[#e2e7e6]/70">
            <div className="flex items-center justify-between text-[#6a787e] mb-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending</span>
              <Gift className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-xl font-black text-amber-600 font-mono">{pendingRewardsCount}</span>
          </div>

          <div className="bg-[#f8faf9] p-3 rounded-2xl border border-[#e2e7e6]/70">
            <div className="flex items-center justify-between text-[#6a787e] mb-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Reviews</span>
              <Star className="w-3.5 h-3.5 text-[#0e7c66]" />
            </div>
            <span className="text-xl font-black text-[#10181c] font-mono">{totalReviewsCount}</span>
          </div>
        </div>

        {/* Horizontal Rectangular Refresh Button Inside the Same Box */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full py-3 px-4 bg-[#0e7c66] hover:bg-[#0a6252] text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing Stats...' : 'Refresh Stats'}</span>
        </button>
      </div>

      {/* DESKTOP VERSION: Single Panel Box with Squeezed Grid on Left and Rounded Square Icon-Only Button on Right */}
      <div className="hidden md:flex bg-white border border-[#e2e7e6] rounded-3xl p-5 items-center justify-between gap-4 text-left">
        <div className="grid grid-cols-4 gap-3 flex-1">
          <div className="bg-[#f8faf9] p-3.5 rounded-2xl border border-[#e2e7e6]/70">
            <div className="flex items-center justify-between text-[#6a787e] mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Guests</span>
              <Users className="w-4 h-4 text-[#0e7c66]" />
            </div>
            <span className="text-2xl font-black text-[#10181c] font-mono">{totalGuestsCount}</span>
          </div>

          <div className="bg-[#f8faf9] p-3.5 rounded-2xl border border-[#e2e7e6]/70">
            <div className="flex items-center justify-between text-[#6a787e] mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Claimed</span>
              <CheckCircle2 className="w-4 h-4 text-[#0e7c66]" />
            </div>
            <span className="text-2xl font-black text-[#10181c] font-mono">{totalClaimedCount}</span>
          </div>

          <div className="bg-[#f8faf9] p-3.5 rounded-2xl border border-[#e2e7e6]/70">
            <div className="flex items-center justify-between text-[#6a787e] mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
              <Gift className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-black text-amber-600 font-mono">{pendingRewardsCount}</span>
          </div>

          <div className="bg-[#f8faf9] p-3.5 rounded-2xl border border-[#e2e7e6]/70">
            <div className="flex items-center justify-between text-[#6a787e] mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Reviews</span>
              <Star className="w-4 h-4 text-[#0e7c66]" />
            </div>
            <span className="text-2xl font-black text-[#10181c] font-mono">{totalReviewsCount}</span>
          </div>
        </div>

        {/* Rounded square icon-only button on the right */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh Stats"
          aria-label="Refresh Stats"
          className="shrink-0 w-16 h-16 bg-[#0e7c66] hover:bg-[#0a6252] text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-75 active:scale-95"
        >
          <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Active Offer Status Banner */}
      {offer ? (
        <div className="bg-white rounded-3xl border border-[#e2e7e6] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Offer Active & Immutable
              </span>
            </div>
            <h4 className="font-bold text-[#10181c] text-base">{offer.title}</h4>
            <p className="text-xs text-[#6a787e]">{offer.description}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setIsDeleteModalOpen(true);
              }}
              disabled={isDeletingOffer}
              className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors cursor-pointer border border-red-200 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Offer</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-[#0e7c66]/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                No Active Campaign Running
              </span>
            </div>
            <h4 className="font-bold text-[#10181c] text-sm">
              Activate {business.name}&apos;s {business.tier.toUpperCase()} Offer
            </h4>
            <p className="text-xs text-[#6a787e]">
              Launch a live offer tailored to your plan so in-store guests can spin, collect visit stamps, or share verified feedback.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="text-xs font-semibold text-[#6a787e] hover:text-[#10181c] hover:bg-[#f1f3f2] px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer border border-[#e2e7e6] flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              <span>Offer History</span>
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsActivateModalOpen(true)}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Activate Offer</span>
            </Button>
          </div>
        </div>
      )}

      {/* Navigation Tabs - Mobile Optimized Scrollable Container */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-[#e2e7e6] pb-2 overflow-x-auto no-scrollbar scroll-smooth">
        {/* 1. QR & NFC Tags - FIRST / LEFTMOST */}
        <button
          type="button"
          onClick={() => setActiveTab('qr')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 ${
            activeTab === 'qr'
              ? 'bg-[#0e7c66] text-white shadow-sm'
              : 'text-[#6a787e] hover:text-[#10181c] hover:bg-white bg-[#f8faf9]/50 sm:bg-transparent'
          }`}
        >
          <QrCode className="w-4 h-4 shrink-0" />
          <span>QR & NFC Tags</span>
        </button>

        {hasLoyalty && (
          <button
            type="button"
            onClick={() => setActiveTab('loyalty')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 ${
              activeTab === 'loyalty'
                ? 'bg-[#0e7c66] text-white shadow-sm'
                : 'text-[#6a787e] hover:text-[#10181c] hover:bg-white bg-[#f8faf9]/50 sm:bg-transparent'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>Loyalty Log</span>
          </button>
        )}

        {hasRewards && (
          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 ${
              activeTab === 'rewards'
                ? 'bg-[#0e7c66] text-white shadow-sm'
                : 'text-[#6a787e] hover:text-[#10181c] hover:bg-white bg-[#f8faf9]/50 sm:bg-transparent'
            }`}
          >
            <Gift className="w-4 h-4 shrink-0" />
            <span>Reward History</span>
          </button>
        )}

        {hasReview && (
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 ${
              activeTab === 'reviews'
                ? 'bg-[#0e7c66] text-white shadow-sm'
                : 'text-[#6a787e] hover:text-[#10181c] hover:bg-white bg-[#f8faf9]/50 sm:bg-transparent'
            }`}
          >
            <Star className="w-4 h-4 shrink-0" />
            <span>Customer Feedback</span>
          </button>
        )}

        {/* Offer History tab placed directly beside Customer Feedback */}
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 ${
            activeTab === 'history'
              ? 'bg-[#0e7c66] text-white shadow-sm'
              : 'text-[#6a787e] hover:text-[#10181c] hover:bg-white bg-[#f8faf9]/50 sm:bg-transparent'
          }`}
        >
          <History className="w-4 h-4 shrink-0" />
          <span>Offer History</span>
        </button>

        {/* 6. Merchant Profile / Branding - FAR RIGHT / END */}
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 ${
            activeTab === 'profile'
              ? 'bg-[#0e7c66] text-white shadow-sm'
              : 'text-[#6a787e] hover:text-[#10181c] hover:bg-white bg-[#f8faf9]/50 sm:bg-transparent'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Merchant Profile</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'loyalty' && hasLoyalty && (
        <LoyaltyRecordsList
          records={loyaltyRecords}
          target={offer?.loyaltyTarget || business.loyaltyTarget || 6}
          business={business}
          offer={offer}
          hasActiveOffer={isOfferActive}
        />
      )}

      {activeTab === 'rewards' && hasRewards && (
        <RewardRecordsList
          rewards={rewards}
          onOpenRedeemModal={code => handleOpenRedeem(code)}
        />
      )}

      {activeTab === 'qr' && (
        <QRGenerator
          entries={entries}
          businessName={business.name}
          businessSlug={business.slug}
          businessTier={business.tier}
          sessionToken={sessionToken}
          business={business}
          offer={offer}
          onRefresh={onRefresh}
        />
      )}

      {activeTab === 'reviews' && hasReview && (
        <div className="bg-white rounded-3xl border border-[#e2e7e6] p-6 text-left space-y-4">
          <h3 className="font-bold text-[#10181c] text-base flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>Persisted Review Logs</span>
          </h3>
          {reviews.length === 0 ? (
            <p className="text-xs text-[#6a787e] py-4 text-center">No customer reviews persisted yet.</p>
          ) : (
            <div className="divide-y divide-[#e2e7e6]">
              {reviews.map((r: any) => (
                <div key={r.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#10181c]">{r.customerName || 'Guest'}</span>
                    <span className="text-amber-500 font-bold">{'★'.repeat(r.rating || 5)}</span>
                  </div>
                  <p className="text-xs text-[#10181c]">{r.reviewText}</p>
                  <div className="flex gap-1">
                    {r.tags?.map((t: string) => (
                      <span key={t} className="text-[10px] bg-[#f1f3f2] px-2 py-0.5 rounded-md text-[#6a787e]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <OfferHistoryList offers={offerHistory} />
      )}

      {activeTab === 'profile' && (
        <MerchantProfileTab
          business={business}
          sessionToken={sessionToken}
          onUpdated={handleRefresh}
        />
      )}

      {/* Staff PIN Modal */}
      <StaffPINModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        sessionToken={sessionToken}
        initialCode={targetVoucherCode}
        configuredPin={business.configuredStaffPin}
        skipRedemptionPin={business.skipRedemptionPin}
        onSuccess={() => {
          onRefresh();
        }}
      />

      {/* Delete Offer Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeletingOffer && setIsDeleteModalOpen(false)}
        title="Delete Ongoing Offer"
        description="Are you sure you want to delete this ongoing campaign?"
        maxWidth="md"
      >
        <div className="space-y-4 text-left">
          {offer && (
            <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] space-y-1">
              <span className="text-xs uppercase font-bold text-[#6a787e]">Current Active Campaign</span>
              <h4 className="font-bold text-[#10181c] text-sm">{offer.title}</h4>
              <p className="text-xs text-[#6a787e]">{offer.description}</p>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Historical data will be preserved</span>
            </p>
            <p>
              Once deleted, this offer will no longer be visible to scanning customers. Its full historical records, scan metrics, and redemption logs will be archived in the <strong>Offer History</strong> tab.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingOffer}
              className="px-4 py-2.5 rounded-xl border border-[#e2e7e6] text-[#6a787e] hover:text-[#10181c] hover:bg-black/5 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDeleteOffer}
              isLoading={isDeletingOffer}
              className="flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirm Delete</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Activate Offer Funnel Modal for Specific Tier Plan */}
      <ActivateOfferModal
        isOpen={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        sessionToken={sessionToken}
        business={business}
        onSuccess={() => {
          onRefresh();
        }}
      />

      {/* Staff Profile / Terminal Settings Modal */}
      <StaffProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        business={business}
        sessionToken={sessionToken}
        onUpdated={onRefresh}
      />
    </div>
  );
};
