import React, { useEffect, useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { SetupPage } from './pages/SetupPage';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { StaffLoginPage } from './pages/StaffLoginPage';
import { StaffTerminalPage } from './pages/StaffTerminalPage';
import { CustomerEntryPage } from './pages/CustomerEntryPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RefundPolicyPage } from './pages/RefundPolicyPage';
import { DeveloperDashboardPage } from './pages/DeveloperDashboardPage';
import { CustomerDemoPage } from './pages/CustomerDemoPage';
import { MerchantCustomersPage } from './pages/MerchantCustomersPage';
import { MerchantSettingsPage } from './pages/MerchantSettingsPage';
import { saveAttribution, getAttribution } from './utils/safeStorage';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Capture Short.io / influencer campaign attribution parameters (?ref=, ?utm_*)
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const referralCode = searchParams.get('ref') || searchParams.get('referral') || undefined;
      const utmSource = searchParams.get('utm_source') || undefined;
      const utmMedium = searchParams.get('utm_medium') || undefined;
      const utmCampaign = searchParams.get('utm_campaign') || undefined;

      // Only save attribution when explicit parameters (ref, utm_*) are present
      if (referralCode || utmSource || utmMedium || utmCampaign) {
        const existing = getAttribution() || {};
        saveAttribution({
          referralCode: referralCode || existing.referralCode,
          utmSource: utmSource || existing.utmSource,
          utmMedium: utmMedium || existing.utmMedium,
          utmCampaign: utmCampaign || existing.utmCampaign,
        });
      }
    } catch {
      // Ignore URL parsing errors
    }

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePopState);
    };
  }, []);

  // Router matching
  if (currentPath === '/' || currentPath === '') {
    return <LandingPage />;
  }

  if (currentPath === '/setup') {
    return <SetupPage />;
  }

  if (
    currentPath === '/payment-success' ||
    currentPath === '/payment-success/' ||
    currentPath === '/payment/success' ||
    currentPath === '/payment/success/'
  ) {
    return <PaymentSuccess />;
  }

  if (currentPath === '/staff/login') {
    return <StaffLoginPage />;
  }

  if (currentPath === '/staff/terminal') {
    return <StaffTerminalPage />;
  }

  // Merchant Customer Directory & 1-Click WhatsApp Outreach
  if (
    currentPath === '/merchant/customers' ||
    currentPath === '/merchant/customers/' ||
    currentPath === '/staff/customers' ||
    currentPath === '/staff/customers/'
  ) {
    return <MerchantCustomersPage />;
  }

  // Merchant Settings (WhatsApp Business, Fast Mode, Staff PIN)
  if (
    currentPath === '/merchant/settings' ||
    currentPath === '/merchant/settings/' ||
    currentPath === '/staff/settings' ||
    currentPath === '/staff/settings/'
  ) {
    return <MerchantSettingsPage />;
  }

  // Interactive Client-Side Demo Flow (Zero Database)
  if (currentPath === '/demo' || currentPath === '/demo/') {
    return <CustomerDemoPage />;
  }

  // Public Legal, Compliance & Refund Policy Routes
  if (currentPath === '/terms' || currentPath === '/terms/') {
    return <TermsPage />;
  }

  if (currentPath === '/privacy' || currentPath === '/privacy/' || currentPath === '/privacy-policy' || currentPath === '/privacy-policy/') {
    return <PrivacyPage />;
  }

  if (currentPath === '/about' || currentPath === '/about/') {
    return <TermsPage />; // Maps to legal layout with tabs
  }

  if (currentPath === '/contact' || currentPath === '/contact/') {
    return <TermsPage />; // Maps to legal layout with contact
  }

  if (
    currentPath === '/refund-policy' ||
    currentPath === '/refund-policy/' ||
    currentPath === '/refund' ||
    currentPath === '/refund/'
  ) {
    return <RefundPolicyPage />;
  }

  // Developer / Admin Overview Dashboard (Isolated developer route)
  if (currentPath === '/developer' || currentPath === '/developer/') {
    return <DeveloperDashboardPage />;
  }

  // Customer Combined or Tier entry: /c/:slug/v, /c/:slug/spin, /c/:slug/loyalty, or /c/:slug
  const customerMatch = currentPath.match(/^\/c\/([^/]+)(?:\/(v|spin|loyalty))?\/?$/);
  if (customerMatch) {
    const slug = customerMatch[1];
    const sub = customerMatch[2];
    const mode = sub === 'spin' ? 'spin' : sub === 'loyalty' ? 'loyalty' : 'combined';
    return <CustomerEntryPage slug={slug} entryMode={mode} />;
  }

  // Customer direct session entry: /entry?sk=...
  if (currentPath === '/entry' || currentPath === '/entry/') {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const entryType = params.get('entryType');
    const modeParam = params.get('mode');
    const mode = (modeParam as any) || (entryType === 'loyalty_express' || entryType === 'loyalty' ? 'loyalty' : 'combined');
    return <CustomerEntryPage slug="entry" entryMode={mode} />;
  }

  // Review entry: /review/:slug
  const reviewMatch = currentPath.match(/^\/review\/([^/]+)\/?$/);
  if (reviewMatch) {
    const slug = reviewMatch[1];
    return <CustomerEntryPage slug={slug} entryMode="review" />;
  }

  // 404 fallback
  return (
    <div className="min-h-screen bg-[#f1f3f2] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#e2e7e6] shadow-sm space-y-4">
        <h2 className="text-3xl font-black text-[#10181c]">404</h2>
        <p className="text-sm text-[#6a787e]">
          The page or customer destination you requested was not found.
        </p>
        <a href="/" className="inline-block pt-2">
          <button
            type="button"
            className="px-6 py-3 bg-[#0e7c66] text-white font-semibold rounded-2xl hover:bg-[#0a6252] transition-colors cursor-pointer"
          >
            Return to Homepage
          </button>
        </a>
      </div>
    </div>
  );
}
