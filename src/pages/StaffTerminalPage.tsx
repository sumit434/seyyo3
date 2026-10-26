import React, { useEffect, useState } from 'react';
import { staffApi, TerminalDataResponse } from '../services/staffApi';
import { paymentApi } from '../services/paymentApi';
import { SubscriptionMeta } from '../../shared/types/business';
import { CombinedTierTerminal } from '../components/staff/CombinedTierTerminal';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { safeSessionStorage } from '../utils/safeStorage';

export const StaffTerminalPage: React.FC = () => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [terminalData, setTerminalData] = useState<TerminalDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);

  const fetchTerminalData = async (token: string) => {
    try {
      const res = await staffApi.getTerminalData(token);
      setTerminalData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff terminal');
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
    fetchTerminalData(token);
  }, []);

  const handleLogout = () => {
    safeSessionStorage.removeItem('seyo_staff_session');
    window.location.href = '/staff/login';
  };

  const handleRenewCheckout = async () => {
    if (!sessionToken) return;
    setIsRenewing(true);
    setRenewError(null);

    try {
      const tier = terminalData?.business?.tier || 'combined';
      const email = terminalData?.business?.email || 'merchant@seyyo.com';

      // Load Razorpay checkout script if not present
      if (typeof window !== 'undefined' && !(window as any).Razorpay) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      }

      // Try creating official order via paymentApi
      let order: any = null;
      try {
        order = await paymentApi.createOrder(tier, email, 'INR');
      } catch {
        // Fallback for demo or non-gateway modes
      }

      if (order && order.keyId && order.keyId !== 'rzp_test_placeholder' && (window as any).Razorpay) {
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'seyyo Technologies',
          description: `${tier.toUpperCase()} Subscription Annual Renewal`,
          order_id: order.orderId,
          prefill: { email },
          theme: { color: '#0e7c66' },
          modal: {
            ondismiss: () => {
              setIsRenewing(false);
            },
          },
          handler: async (resp: any) => {
            try {
              await paymentApi.verifyPayment({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              });
            } catch {
              // Ignore verify error
            }
            await staffApi.renewSubscription(sessionToken);
            await fetchTerminalData(sessionToken);
            setIsRenewing(false);
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      // Direct reactive renewal fallback
      await staffApi.renewSubscription(sessionToken);
      await fetchTerminalData(sessionToken);
    } catch (err: any) {
      setRenewError(err.message || 'Renewal failed. Please try again.');
    } finally {
      setIsRenewing(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading staff terminal..." />;
  }

  if (error || !terminalData) {
    return (
      <ErrorMessage
        title="Session Expired or Unauthorized"
        message={error || 'Please log in again with your staff credentials.'}
        actionText="Staff Login"
        onRetry={handleLogout}
      />
    );
  }

  const subscription: SubscriptionMeta | undefined = terminalData.subscription;

  // Branch 1 (Expired Lockout): Full-screen centered card gating dashboard interactivity
  if (subscription?.isExpired) {
    const tierName =
      terminalData.business?.tier === 'spin'
        ? 'Spin Tier'
        : terminalData.business?.tier === 'loyalty'
        ? 'Loyalty Tier'
        : terminalData.business?.tier === 'review'
        ? 'Review Booster Tier'
        : 'Combined Tier';

    return (
      <div className="min-h-screen bg-[#f1f3f2] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e7e6] max-w-md w-full p-6 text-center space-y-5">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold">
            🔒
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-[#10181c]">
              {tierName} Annual Renewal
            </h2>
            <p className="text-sm text-[#6a787e] leading-relaxed">
              Subscription Expired. Active customer campaigns and NFC/QR links are paused. Your customer data and records are safely saved.
            </p>
          </div>

          {renewError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {renewError}
            </div>
          )}

          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={handleRenewCheckout}
              disabled={isRenewing}
              className="w-full py-3.5 px-6 bg-[#0e7c66] hover:bg-[#0a6252] text-white font-bold rounded-xl shadow-sm transition-colors text-sm disabled:opacity-50 cursor-pointer"
            >
              {isRenewing ? 'Processing Renewal...' : 'Pay & Reactivate'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-medium text-[#6a787e] hover:text-[#10181c] underline transition-colors cursor-pointer block mx-auto"
            >
              Log out / Switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Scoped cumulative stats (reset only when offer is deleted/null)
  const trackerMetrics = terminalData.trackerMetrics || terminalData.metrics || {
    totalGuests: 0,
    claimedRewards: 0,
    pendingVouchers: 0,
    reviewsCount: 0,
  };

  // Attach scoped metrics to offer object
  const offerWithScopedMetrics = terminalData.offer
    ? {
        ...terminalData.offer,
        metrics: {
          ...terminalData.offer.metrics,
          totalGuests: trackerMetrics.totalGuests,
          claimedRewards: trackerMetrics.claimedRewards,
          pendingVouchers: trackerMetrics.pendingVouchers,
          reviewsCount: trackerMetrics.reviewsCount,
        },
      }
    : null;

  // Clean active offer determination for loyalty rankings and leaderboard visibility
  const hasActiveOffer = Boolean(
    terminalData.offer &&
    (terminalData.offer.status === 'active' || (!terminalData.offer.status && Boolean(terminalData.offer.id))) &&
    terminalData.offer.status !== 'cancelled' &&
    terminalData.offer.status !== 'completed' &&
    terminalData.offer.status !== 'expired' &&
    terminalData.offer.status !== 'no_offer'
  );

  return (
    <div className="min-h-screen bg-[#f1f3f2] p-3 sm:p-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Branch 2 (Expiring Soon Banner): 15-day warning and Day 0 "Last Day" banner */}
        {subscription && subscription.status === 'expiring_soon' && !subscription.isExpired && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span>
                {subscription.isLastDay || subscription.daysRemaining === 0
                  ? '⚠️ Last day of your subscription. Renew today to avoid interruption to your customer campaigns.'
                  : `⚠️ Your subscription expires in ${subscription.daysRemaining} days. Renew to maintain uninterrupted campaigns.`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRenewCheckout}
              disabled={isRenewing}
              className="px-4 py-2 bg-[#0e7c66] hover:bg-[#0a6252] text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isRenewing ? 'Processing...' : 'Renew Now'}
            </button>
          </div>
        )}

        <CombinedTierTerminal
          sessionToken={sessionToken!}
          business={terminalData.business}
          offer={offerWithScopedMetrics}
          hasActiveOffer={hasActiveOffer}
          trackerMetrics={trackerMetrics}
          entries={terminalData.entries || []}
          loyaltyRecords={terminalData.loyaltyRecords || []}
          rewards={terminalData.rewards || []}
          reviews={terminalData.reviews || []}
          offerHistory={terminalData.offerHistory || []}
          onRefresh={() => fetchTerminalData(sessionToken!)}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
};