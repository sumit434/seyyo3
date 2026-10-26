import React, { useEffect, useState } from 'react';
import { customerService } from '../services/customerService';
import { CustomerStatusResponse } from '../../shared/types/qr';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { NoOfferScreen } from '../components/customer/NoOfferScreen';
import { CustomerAuthFlow } from '../components/customer/CustomerAuthFlow';
import { CustomerJourney } from '../components/customer/CustomerJourney';
import { CustomerFooter } from '../components/customer/CustomerFooter';
import { safeSessionStorage } from '../utils/safeStorage';

interface CustomerEntryPageProps {
  slug: string;
  entryMode?: 'combined' | 'spin' | 'loyalty' | 'review';
  initialSessionKey?: string;
}

export const CustomerEntryPage: React.FC<CustomerEntryPageProps> = ({ slug, entryMode = 'combined', initialSessionKey }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<CustomerStatusResponse | null>(null);
  const [isActiveOffer, setIsActiveOffer] = useState(true);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const getUrlSessionKey = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('sk') || params.get('key') || params.get('token') || params.get('sessionKey') || null;
  };

  const [sessionKey, setSessionKey] = useState<string | null>(() => {
    return initialSessionKey || getUrlSessionKey();
  });
  const [userStepOverride, setUserStepOverride] = useState<'LOYALTY' | null>(null);

  const loadCustomerJourney = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeKey = getUrlSessionKey() || sessionKey || initialSessionKey;
      const urlSessionKey = getUrlSessionKey();

      // On a fresh tag re-scan, clear stale pending stamp keys while strictly preserving any won spin reward voucher
      if (urlSessionKey) {
        setUserStepOverride(null);
        safeSessionStorage.removeItem(`seyo_pending_stamp_${slug}`);
        safeSessionStorage.removeItem(`seyo_pending_claim_${slug}`);
        // If the URL has a fresh session key, do not retain stale customer session token from a prior visit
        safeSessionStorage.removeItem(`seyo_customer_session_${slug}`);
      }

      // 1. Resolve merchant entry with unique session key
      const resolveRes = await customerService.resolveEntry(
        slug,
        activeKey ? 'qr' : (entryMode === 'loyalty' ? 'nfc' : 'qr'),
        activeKey || undefined,
        entryMode === 'loyalty' && activeKey ? 'loyalty_express' : entryMode
      );

      if (resolveRes.sessionKey) {
        setSessionKey(resolveRes.sessionKey);
      } else if (!activeKey) {
        setSessionKey(null);
        setSessionToken(null);
      }

      const isExpiredSub = Boolean((resolveRes as any).isSubscriptionExpired);
      if (isExpiredSub) {
        setIsSubscriptionExpired(true);
      }

      if (!resolveRes.isActive || isExpiredSub) {
        setIsActiveOffer(false);
        setStatusData({
          business: resolveRes.business as any,
          offer: null,
          customer: null,
          status: {
            spinAvailable: false,
            spinCompletedToday: false,
            loyaltyAvailable: false,
            loyaltyCompletedToday: false,
            loyaltyMilestoneReached: false,
            activeReward: null,
            reviewJourneyCompleted: false,
            currentStage: 'auth',
            isCooldown: false,
          },
        });
        setLoading(false);
        return;
      }

      setIsActiveOffer(true);

      // Clean merchant URL without ?sk= -> View-Only Mode
      if (!activeKey || (resolveRes as any).isViewOnly) {
        setSessionToken(null);
        setStatusData({
          business: resolveRes.business as any,
          offer: resolveRes.offer as any,
          customer: null,
          status: {
            ...((resolveRes.status as any) || {}),
            claimAvailable: false,
            isViewOnly: true,
            currentStage: 'auth',
          },
        });
        setLoading(false);
        return;
      }

      const token = resolveRes.sessionToken || safeSessionStorage.getItem(`seyo_customer_session_${slug}`) || activeKey;
      if (token) {
        setSessionToken(token);
        safeSessionStorage.setItem(`seyo_customer_session_${slug}`, token);
      }

      // 2. Fetch current session status from the backend to resume at server-recorded stage
      const effectiveEntryMode =
        (resolveRes.business as any)?.tier === 'loyalty'
          ? 'loyalty'
          : (resolveRes.entryType as any) || entryMode;

      const storedCustomerId = safeSessionStorage.getItem(`seyo_customer_id_${slug}`);
      if (token) {
        try {
          const fullStatus = await customerService.getStatus(slug, token, storedCustomerId || undefined, effectiveEntryMode);
          if (fullStatus && fullStatus.customer) {
            safeSessionStorage.setItem(`seyo_customer_id_${slug}`, fullStatus.customer.id);
            setStatusData(fullStatus);
            setLoading(false);
            return;
          }
        } catch (statusErr: any) {
          const isStatus403 =
            statusErr.status === 403 ||
            statusErr.code === 'SESSION_ALREADY_USED' ||
            statusErr.code === 'SESSION_EXPIRED' ||
            statusErr.message?.toLowerCase().includes('already used') ||
            statusErr.message?.toLowerCase().includes('expired') ||
            statusErr.message?.includes('403');

          if (isStatus403) {
            // An abandoned loyalty stamp from yesterday or stale session should not lock out today's scan!
            safeSessionStorage.removeItem(`seyo_customer_session_${slug}`);
            safeSessionStorage.removeItem(`seyo_pending_stamp_${slug}`);
            setSessionToken(null);
            try {
              const freshFallback = await customerService.getStatus(slug, undefined, storedCustomerId || undefined, effectiveEntryMode);
              if (freshFallback && freshFallback.business) {
                setStatusData(freshFallback);
                setLoading(false);
                return;
              }
            } catch {
              // Fallback to resolveRes payload below
            }
          } else {
            throw statusErr;
          }
        }
      }

      setStatusData({
        business: resolveRes.business as any,
        offer: resolveRes.offer as any,
        customer: null,
        status: resolveRes.status as any,
      });
    } catch (err: any) {
      const is403 =
        err.status === 403 ||
        err.code === 'SESSION_ALREADY_USED' ||
        err.data?.error === 'SESSION_ALREADY_USED' ||
        err.message?.toLowerCase().includes('already used') ||
        err.message?.toLowerCase().includes('expired') ||
        err.message?.includes('403');

      if (is403) {
        setError('Token already used or expired');
      } else {
        setError(err.message || 'Could not load rewards experience.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSessionKey) {
      setSessionKey(initialSessionKey);
    }
    loadCustomerJourney();
  }, [slug, initialSessionKey, entryMode]);

  // When user returns to tab after completing Google Review form or backgrounding browser
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const storedToken = safeSessionStorage.getItem(`seyo_customer_session_${slug}`);
        const storedCustomerId = safeSessionStorage.getItem(`seyo_customer_id_${slug}`);
        if (storedToken && storedCustomerId) {
          try {
            const updated = await customerService.getStatus(slug, storedToken, storedCustomerId);
            setStatusData(updated);
          } catch {
            // silent fail on visibility refresh
          }
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [slug]);

  // Once the backend confirms cooldown or terminal completion:
  // Clean the session key parameter from the URL using window.history.replaceState without reloading,
  // and prevent Back navigation from reviving the consumed state.
  useEffect(() => {
    const isCombinedNextLoyalty =
      (statusData as any)?.nextStep === 'LOYALTY' ||
      (statusData?.status as any)?.nextStep === 'LOYALTY' ||
      (statusData?.business?.tier === 'combined' && !(statusData?.status as any)?.canSpin && (statusData?.status as any)?.canStamp);

    if (isCombinedNextLoyalty) {
      return;
    }

    if (statusData?.status?.isCooldown || statusData?.status?.currentStage === 'cooldown') {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (
          url.searchParams.has('sk') ||
          url.searchParams.has('key') ||
          url.searchParams.has('token') ||
          url.searchParams.has('sessionKey')
        ) {
          url.searchParams.delete('sk');
          url.searchParams.delete('key');
          url.searchParams.delete('token');
          url.searchParams.delete('sessionKey');
          window.history.replaceState({ locked: true }, '', url.pathname + (url.search ? url.search : ''));
        }
        setSessionKey(null);
        safeSessionStorage.removeItem(`seyo_customer_session_${slug}`);
      }
    }
  }, [statusData?.status?.isCooldown, statusData?.status?.currentStage, (statusData as any)?.nextStep, (statusData?.status as any)?.nextStep, statusData?.business?.tier, slug]);

  // Prevent Back navigation from reviving consumed state
  useEffect(() => {
    const handlePopState = () => {
      const isCombinedNextLoyalty =
        (statusData as any)?.nextStep === 'LOYALTY' ||
        (statusData?.status as any)?.nextStep === 'LOYALTY' ||
        (statusData?.business?.tier === 'combined' && !(statusData?.status as any)?.canSpin && (statusData?.status as any)?.canStamp);

      if (isCombinedNextLoyalty) return;

      if (statusData?.status?.isCooldown || statusData?.status?.currentStage === 'cooldown') {
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [statusData?.status?.isCooldown, statusData?.status?.currentStage, (statusData as any)?.nextStep, (statusData?.status as any)?.nextStep, statusData?.business?.tier]);

  if (loading) {
    return <LoadingScreen message="Connecting to rewards station..." />;
  }

  if (error) {
    const isSession403 =
      error === 'Token already used or expired' ||
      error.toLowerCase().includes('already used') ||
      error.toLowerCase().includes('expired') ||
      error.includes('403');

    return (
      <ErrorMessage
        title={isSession403 ? "Token already used or expired" : "Unable to Connect"}
        message={isSession403 ? "Token already used or expired" : error}
        onRetry={isSession403 ? undefined : loadCustomerJourney}
      />
    );
  }

  if (!statusData || !statusData.business) {
    return (
      <ErrorMessage
        title="Business Not Found"
        message="The merchant QR or NFC identifier could not be verified."
      />
    );
  }

  // Fallback screen if offer is inactive or subscription is expired
  if (!isActiveOffer || !statusData.offer || isSubscriptionExpired) {
    return (
      <div className="min-h-screen bg-[#f1f3f2] flex flex-col items-center justify-center p-4">
        <NoOfferScreen
          businessName={statusData.business.name}
          logoEmoji={statusData.business.logoEmoji}
          accentColor={statusData.business.accentColor}
          message={
            isSubscriptionExpired
              ? 'Campaign Currently Paused — Please check back soon.'
              : undefined
          }
        />
      </div>
    );
  }

  const { business, offer, customer, status } = statusData;

  const isViewOnly = !sessionKey || (statusData as any)?.isViewOnly || (statusData?.status as any)?.isViewOnly;

  // If customer is not authenticated yet -> show CustomerAuthFlow
  if (!customer) {
    return (
      <div className="min-h-screen bg-[#f1f3f2] flex flex-col items-center justify-between py-6 px-4">
        <div className="w-full max-w-sm my-auto">
          <CustomerAuthFlow
            businessId={business.id}
            businessName={business.name}
            logoEmoji={business.logoEmoji}
            accentColor={business.accentColor}
            sessionKey={sessionKey || undefined}
            isViewOnly={Boolean(isViewOnly)}
            merchantCountry={business.country}
            onAuthenticated={payload => {
              safeSessionStorage.setItem(`seyo_customer_session_${slug}`, payload.sessionToken);
              setSessionToken(payload.sessionToken);
              if (payload.sessionKey) {
                setSessionKey(payload.sessionKey);
              }
              if (payload.customer) {
                safeSessionStorage.setItem(`seyo_customer_id_${slug}`, payload.customer.id);
              }
              setStatusData(payload);
            }}
          />
        </div>
        <CustomerFooter />
      </div>
    );
  }

  // Skip & Complete handler: routes user through authoritative stage transition (e.g. Review Accelerator or Cooldown)
  const handleSkipOrComplete = async () => {
    try {
      const updated = await customerService.getStatus(
        slug,
        sessionToken || undefined,
        customer?.id,
        entryMode
      );
      setStatusData(updated);
    } catch {
      if (statusData) {
        setStatusData({
          ...statusData,
          status: {
            ...statusData.status,
            isCooldown: true,
            currentStage: 'cooldown',
          },
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f3f2] flex flex-col items-center justify-between py-6 px-4">
      {/* Customer Header Branding */}
      <div className="w-full max-w-sm flex items-center justify-between mb-4 mt-3 pt-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-xs border border-[#e2e7e6]"
            style={{ backgroundColor: `${business.accentColor}15` }}
          >
            <span>{business.logoEmoji}</span>
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-[#10181c] leading-tight">{business.name}</h1>
            <p className="text-[11px] text-[#6a787e]">
              Hello, <strong className="text-[#0e7c66]">{customer.name}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Customer Journey flow with tier-aware stage progression */}
      <CustomerJourney
        business={business}
        offer={offer}
        customer={customer}
        status={status}
        sessionToken={sessionToken}
        entryMode={entryMode}
        slug={slug}
        onStatusUpdate={updated => setStatusData(updated)}
        onSkip={handleSkipOrComplete}
        onComplete={handleSkipOrComplete}
        onRefresh={loadCustomerJourney}
      />

      {/* Standard Customer Footer */}
      <CustomerFooter />
    </div>
  );
};
