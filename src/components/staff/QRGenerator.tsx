import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, RefreshCw, ExternalLink, Copy, Check, Radio, Zap, ArrowRight, Clock } from 'lucide-react';
import { Button } from '../common/Button';
import { staffApi } from '../../services/staffApi';
import { copyToClipboard } from '../../utils/clipboard';
import { safeSessionStorage } from '../../utils/safeStorage';

interface EntryItem {
  id: string;
  entryType: string;
  label: string;
  permanentCode: string;
  customerUrl: string;
  qrDataUrl: string;
  sessionKey?: string;
  expiresAt?: string;
}

interface QRGeneratorProps {
  entries: EntryItem[];
  businessName: string;
  businessSlug?: string;
  businessTier?: string;
  sessionToken?: string;
  business?: any;
  offer?: any;
  onRefresh?: () => void;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({
  entries,
  businessName,
  businessSlug,
  businessTier,
  sessionToken,
  business,
  offer,
  onRefresh,
}) => {
  // Enforce exact order and display labels for Combined tier:
  // 1. Dynamic QR
  // 2. Loyalty Dynamic QR
  // 3. NFC Tag
  // 4. Loyalty NFC Tag
  const normalizedEntries = React.useMemo(() => {
    if (businessTier !== 'combined') return entries;
    const labelMap: Record<string, string> = {
      merchant_qr: 'Dynamic QR',
      loyalty_express: 'Loyalty Dynamic QR',
      combined: 'NFC Tag',
      nfc_tag: 'NFC Tag',
      loyalty: 'Loyalty NFC Tag',
      instant_loyalty: 'Loyalty NFC Tag',
    };
    const orderMap: Record<string, number> = {
      merchant_qr: 1,
      loyalty_express: 2,
      combined: 3,
      nfc_tag: 3,
      loyalty: 4,
      instant_loyalty: 4,
    };
    return [...entries]
      .map(e => ({
        ...e,
        label: labelMap[e.entryType] || e.label,
      }))
      .sort((a, b) => (orderMap[a.entryType] || 99) - (orderMap[b.entryType] || 99));
  }, [entries, businessTier]);

  const [selectedEntryIndex, setSelectedEntryIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [clientQrDataUrl, setClientQrDataUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRefreshingRef = React.useRef(false);
  const [entryOverrides, setEntryOverrides] = useState<Record<string, { customerUrl: string; qrDataUrl: string; sessionKey: string; expiresAt?: string }>>({});
  const [countdownSeconds, setCountdownSeconds] = useState<number>(360); // 06:00 = 360 seconds

  if (normalizedEntries.length === 0) return null;
  const rawEntry = normalizedEntries[selectedEntryIndex] || normalizedEntries[0];
  const override = entryOverrides[rawEntry.id];
  const currentEntry: EntryItem = override
    ? {
        ...rawEntry,
        customerUrl: override.customerUrl,
        qrDataUrl: override.qrDataUrl,
        sessionKey: override.sessionKey,
        expiresAt: override.expiresAt,
      }
    : rawEntry;

  const isDynamicQr = currentEntry.entryType === 'merchant_qr';
  const isDynamicLoyaltyQr = currentEntry.entryType === 'loyalty_express';
  const isExpressLoyalty = currentEntry.entryType === 'loyalty' || currentEntry.entryType === 'instant_loyalty';
  const isPhysicalNfc = !isDynamicQr && !isDynamicLoyaltyQr && !isExpressLoyalty;
  const isAnyDynamicQr = isDynamicQr || isDynamicLoyaltyQr;

  // Resolve business slug
  const slug = businessSlug || (currentEntry as any).businessSlug || 'bella-napoli';

  // Compute effective path and full URL using current window.location.origin
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  
  let customerPath: string;
  const nfcKey = business?.nfcSecretKey || (currentEntry as any).nfcSecretKey || '';
  const keyParam = nfcKey ? `k=${encodeURIComponent(nfcKey)}` : '';

  if (isDynamicQr) {
    const queryStr = currentEntry.customerUrl?.includes('?')
      ? currentEntry.customerUrl.slice(currentEntry.customerUrl.indexOf('?'))
      : (currentEntry.sessionKey ? `?sk=${currentEntry.sessionKey}` : '');
    customerPath = `/c/${slug}/v${queryStr}`;
  } else if (isDynamicLoyaltyQr) {
    const queryStr = currentEntry.customerUrl?.includes('?')
      ? currentEntry.customerUrl.slice(currentEntry.customerUrl.indexOf('?'))
      : (currentEntry.sessionKey ? `?sk=${currentEntry.sessionKey}&entryType=loyalty_express` : '?entryType=loyalty_express');
    customerPath = `/c/${slug}/loyalty${queryStr}`;
  } else if (isExpressLoyalty) {
    if (currentEntry.customerUrl?.includes('?k=') || currentEntry.customerUrl?.includes('&k=')) {
      const q = currentEntry.customerUrl.slice(currentEntry.customerUrl.indexOf('?'));
      customerPath = `/api/entry/tap/${slug}${q}`;
    } else {
      customerPath = `/api/entry/tap/${slug}?${keyParam ? `${keyParam}&` : ''}mode=loyalty`;
    }
  } else {
    if (currentEntry.customerUrl?.includes('?k=') || currentEntry.customerUrl?.includes('&k=')) {
      const q = currentEntry.customerUrl.slice(currentEntry.customerUrl.indexOf('?'));
      customerPath = `/api/entry/tap/${slug}${q}`;
    } else {
      customerPath = `/api/entry/tap/${slug}${keyParam ? `?${keyParam}` : ''}`;
    }
  }

  const effectiveCustomerUrl = origin ? `${origin}${customerPath}` : currentEntry.customerUrl;

  // Generate clean client-side QR matching the real browser origin
  useEffect(() => {
    let isMounted = true;
    if (effectiveCustomerUrl) {
      QRCode.toDataURL(effectiveCustomerUrl, {
        margin: 1,
        width: 280,
        color: { dark: '#0e7c66', light: '#ffffff' },
      })
        .then(url => {
          if (isMounted) setClientQrDataUrl(url);
        })
        .catch(() => {
          if (isMounted) setClientQrDataUrl(currentEntry.qrDataUrl);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [effectiveCustomerUrl, currentEntry.qrDataUrl]);

  // Dynamic QR Refresh action
  const handleRefreshQr = React.useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const token = sessionToken || safeSessionStorage.getItem('seyo_staff_session') || '';
      const res = await staffApi.refreshQr(token, currentEntry.id, currentEntry.entryType);
      if (res.success) {
        const freshExpiresAt = res.expiresAt || new Date(Date.now() + 6 * 60 * 1000).toISOString();
        setEntryOverrides(prev => ({
          ...prev,
          [currentEntry.id]: {
            customerUrl: res.customerUrl,
            qrDataUrl: res.qrDataUrl,
            sessionKey: res.sessionKey,
            expiresAt: freshExpiresAt,
          },
        }));
        setCountdownSeconds(360);
        if (origin) {
          const newPath = isDynamicLoyaltyQr
            ? `/c/${slug}/loyalty?sk=${res.sessionKey}&entryType=loyalty_express`
            : `/c/${slug}/v?sk=${res.sessionKey}`;
          const newUrl = `${origin}${newPath}`;
          try {
            const newQr = await QRCode.toDataURL(newUrl, {
              margin: 1,
              width: 280,
              color: { dark: '#0e7c66', light: '#ffffff' },
            });
            setClientQrDataUrl(newQr);
          } catch {
            setClientQrDataUrl(res.qrDataUrl);
          }
        }
      }
    } catch (err) {
      console.error('Failed to refresh QR:', err);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [sessionToken, currentEntry.id, currentEntry.entryType, isDynamicLoyaltyQr, slug, origin]);

  // Countdown timer with zero-boundary auto-refresh and visibility detection
  useEffect(() => {
    if (!isAnyDynamicQr) return;

    const computeRemainingSeconds = () => {
      if (currentEntry.expiresAt) {
        const diff = Math.ceil((new Date(currentEntry.expiresAt).getTime() - Date.now()) / 1000);
        return Math.max(0, Math.min(360, diff));
      }
      return 360;
    };

    const initialSecs = computeRemainingSeconds();
    setCountdownSeconds(initialSecs);

    // If expired at mount or entry switch, automatically refresh immediately
    if (initialSecs <= 0 && !isRefreshingRef.current) {
      handleRefreshQr();
      return;
    }

    const timer = setInterval(() => {
      const rem = computeRemainingSeconds();
      setCountdownSeconds(rem);
      // Zero-boundary auto-refresh trigger
      if (rem <= 0) {
        if (!isRefreshingRef.current) {
          handleRefreshQr();
        }
      }
    }, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const rem = computeRemainingSeconds();
        setCountdownSeconds(rem);
        const isExpired = currentEntry.expiresAt ? Date.now() >= new Date(currentEntry.expiresAt).getTime() : false;
        if ((rem <= 0 || isExpired) && !isRefreshingRef.current) {
          handleRefreshQr();
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [currentEntry.id, currentEntry.sessionKey, currentEntry.expiresAt, isAnyDynamicQr, handleRefreshQr]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(effectiveCustomerUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Test Live Screen handler: directly opens the working endpoint in a new tab
  const handleTestLiveScreen = async () => {
    if (isAnyDynamicQr && !currentEntry.sessionKey) {
      await handleRefreshQr();
    }
    window.open(customerPath, '_blank', 'noopener,noreferrer');
  };

  const qrToDisplay = clientQrDataUrl || currentEntry.qrDataUrl;

  return (
    <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 sm:p-6 text-left space-y-5 overflow-x-hidden">
      {/* Header and Entry Option Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-[#e2e7e6]">
        <div>
          <h3 className="text-base font-bold text-[#10181c] flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#0e7c66] shrink-0" />
            <span>Hardware & Digital Entry Points</span>
          </h3>
        </div>

        {/* Entry Selector Tabs for Combined Tier */}
        {normalizedEntries.length > 1 && (
          <div className="flex items-center gap-1.5 bg-[#f1f3f2] p-1.5 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
            {normalizedEntries.map((ent, idx) => {
              const isEntQr = ent.entryType === 'merchant_qr';
              const isEntDynLoyalty = ent.entryType === 'loyalty_express';
              const isEntExpress = ent.entryType === 'loyalty' || ent.entryType === 'instant_loyalty';
              return (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => {
                    setSelectedEntryIndex(idx);
                    setCopied(false);
                  }}
                  className={`px-3 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                    selectedEntryIndex === idx
                      ? 'bg-white text-[#0e7c66] shadow-xs'
                      : 'text-[#6a787e] hover:text-[#10181c]'
                  }`}
                >
                  {isEntQr ? (
                    <QrCode className="w-3.5 h-3.5" />
                  ) : isEntDynLoyalty ? (
                    <QrCode className="w-3.5 h-3.5 text-amber-600" />
                  ) : isEntExpress ? (
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Radio className="w-3.5 h-3.5" />
                  )}
                  <span>{ent.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className={isAnyDynamicQr ? "flex flex-col items-stretch md:grid md:grid-cols-2 gap-4 md:gap-6 md:items-center" : "grid grid-cols-1 md:grid-cols-2 gap-6 items-center"}>
        {/* QR Visual Card */}
        <div className={`w-full flex flex-col items-center justify-center p-6 bg-[#f1f3f2]/60 rounded-3xl border border-[#e2e7e6] text-center ${isAnyDynamicQr ? 'order-2 md:order-none' : ''}`}>
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#e2e7e6] mb-3">
            {qrToDisplay ? (
              <img
                src={qrToDisplay}
                alt="QR Code"
                className="w-48 h-48 rounded-xl object-contain"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-[#6a787e] text-xs">
                Generating QR...
              </div>
            )}
          </div>

          {/* 6-Minute Countdown Timer for Dynamic QRs */}
          {isAnyDynamicQr && (
            <div className="mb-3 px-3.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center gap-1.5 text-xs text-amber-900 font-semibold shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>
                Expires in <strong className="font-mono font-bold tracking-wider">{formatCountdown(countdownSeconds)}</strong>
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#10181c] bg-white px-3 py-1 rounded-full border border-[#e2e7e6]">
              {currentEntry.permanentCode}
            </span>
          </div>
          <p className="text-xs text-[#6a787e] mt-1.5 font-medium">{currentEntry.label}</p>
        </div>

        {/* Details & Actions */}
        <div className={isAnyDynamicQr ? "contents md:flex md:flex-col md:space-y-4 md:w-full" : "space-y-4"}>
          {/* Unified Badge + Journey Flow Bar across all 4 sub-panels */}
          <div className={`w-full flex flex-wrap items-center justify-between gap-2 bg-[#f8faf9] p-2 rounded-2xl border border-[#e2e7e6] ${isAnyDynamicQr ? 'order-1 md:order-none' : ''}`}>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                isDynamicLoyaltyQr
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : isDynamicQr
                  ? 'bg-emerald-100 text-emerald-800'
                  : isExpressLoyalty
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-teal-100 text-teal-800'
              }`}
            >
              {isDynamicLoyaltyQr
                ? '6-Min Loyalty Dynamic QR'
                : isDynamicQr
                ? '6-Minute Dynamic QR'
                : isExpressLoyalty
                ? 'Permanent Loyalty NFC'
                : 'Permanent Combined NFC'}
            </span>

            {/* Dynamic Journey Flow matching each tier and entry mode */}
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#0e7c66] bg-white px-2.5 py-1 rounded-xl border border-[#e2e7e6]">
              <span className="text-[#6a787e] font-semibold">Flow:</span>
              {businessTier === 'review' ? (
                <span className="text-[#0e7c66]">
                  <strong>Review</strong>
                </span>
              ) : businessTier === 'spin' ? (
                <span className="flex items-center gap-1">
                  <strong>Spin</strong> <ArrowRight className="w-3 h-3 inline" /> <strong>Review</strong>
                </span>
              ) : businessTier === 'loyalty' || isExpressLoyalty || isDynamicLoyaltyQr ? (
                <span className="flex items-center gap-1 text-amber-700">
                  <strong>Loyalty</strong> <ArrowRight className="w-3 h-3 inline" /> <strong>Review</strong>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <strong>Spin</strong> <ArrowRight className="w-3 h-3 inline" /> <strong>Loyalty</strong> <ArrowRight className="w-3 h-3 inline" /> <strong>Review</strong>
                </span>
              )}
            </div>
          </div>

          <div className={`w-full ${isAnyDynamicQr ? 'order-4 md:order-none' : ''}`}>
            <span className="text-xs font-bold uppercase tracking-wider text-[#6a787e]">
              {isAnyDynamicQr ? 'Destination Customer URL' : 'Permanent NFC Destination URL'}
            </span>
            <div className="mt-1 flex items-center gap-2 bg-[#f8faf9] p-3 rounded-2xl border border-[#e2e7e6]">
              <span className="text-xs font-mono text-[#10181c] truncate flex-1" title={effectiveCustomerUrl}>
                {effectiveCustomerUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-1.5 text-[#0e7c66] hover:bg-[#e2f1ec] rounded-lg transition-colors cursor-pointer shrink-0"
                title="Copy URL"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons Row: Exactly 2 Buttons Per Panel */}
          <div className={`w-full flex flex-col sm:flex-row gap-3 pt-2 ${isAnyDynamicQr ? 'order-3 md:order-none' : ''}`}>
            {isAnyDynamicQr ? (
              // 1. Dynamic QRs: Refresh QR button
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleRefreshQr}
                isLoading={isRefreshing}
                className="gap-2 flex-1 cursor-pointer min-h-[44px] py-3 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh QR</span>
              </Button>
            ) : (
              // 2. Physical & Express NFC: Copy NFC URL button
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleCopyUrl}
                className="gap-2 flex-1 cursor-pointer bg-[#0e7c66] hover:bg-[#0a6252] text-white shadow-sm min-h-[44px] py-3 text-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied NFC URL!' : 'Copy NFC URL'}</span>
              </Button>
            )}

            {/* Test Live Screen Button: Directly opens working live flow in new tab */}
            <Button
              type="button"
              variant={isAnyDynamicQr ? 'primary' : 'outline'}
              size="md"
              onClick={handleTestLiveScreen}
              className="gap-2 flex-1 shadow-xs cursor-pointer min-h-[44px] py-3 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Test Live Screen</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};