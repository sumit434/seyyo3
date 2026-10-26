import React, { useEffect, useState } from 'react';
import { onboardingService, VerifyMagicLinkResponse } from '../services/onboardingService';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { safeSessionStorage } from '../utils/safeStorage';
import { SeyyoLogo } from '../components/common/SeyyoLogo';

export const SetupPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<VerifyMagicLinkResponse | null>(null);
  const [completedBusiness, setCompletedBusiness] = useState<any | null>(null);

  useEffect(() => {
    const initSetup = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const rawToken = params.get('token');
        const storedSession = safeSessionStorage.getItem('seyo_onboarding_session');

        // Route Guard: Direct entry without token or active session redirects immediately to /
        if (!rawToken && !storedSession) {
          window.location.replace('/');
          return;
        }

        if (rawToken) {
          // Verify magic token and create authorized session
          const res = await onboardingService.verifyMagicLink(rawToken);
          safeSessionStorage.setItem('seyo_onboarding_session', res.sessionToken);
          setSessionData(res);

          // Clean token from visible URL (Specification rule 50)
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } else if (storedSession) {
          // Resume existing authorized onboarding session
          const res = await onboardingService.getSessionState(storedSession);
          setSessionData({
            ...res,
            sessionToken: storedSession,
          });
        }
      } catch (err: any) {
        // Missing, expired, or invalid token: clean session and redirect immediately to landing
        safeSessionStorage.removeItem('seyo_onboarding_session');
        window.location.replace('/');
        return;
      } finally {
        setLoading(false);
      }
    };

    initSetup();
  }, []);

  if (loading) {
    return <LoadingScreen message="Verifying secure merchant onboarding token..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Setup Link Invalid or Expired"
        message={error}
        actionText="Return to Homepage"
        onRetry={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  if (completedBusiness) {
    return (
      <div className="min-h-screen bg-[#f1f3f2] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#e2e7e6] shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#0e7c66] text-white mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#10181c]">Setup Complete!</h2>
            <p className="text-sm text-[#6a787e] mt-1">
              {completedBusiness.name} is now active and ready for customer scans.
            </p>
          </div>

          <div className="p-4 bg-[#f8faf9] rounded-2xl border border-[#e2e7e6] text-left text-xs space-y-1">
            <p className="text-[#6a787e]">
              Default Staff Verification PIN: <strong className="font-mono text-[#10181c]">{completedBusiness.defaultStaffPin}</strong>
            </p>
            <p className="text-[#6a787e]">
              Merchant Slug: <strong className="font-mono text-[#0e7c66]">/c/{completedBusiness.slug}/v</strong>
            </p>
          </div>

          <a href="/staff/terminal" className="block w-full">
            <button
              type="button"
              className="w-full min-h-[48px] bg-[#0e7c66] hover:bg-[#0a6252] text-white font-semibold rounded-2xl px-5 py-4 transition-all shadow-md cursor-pointer"
            >
              Open Staff Terminal
            </button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f3f2] py-8 sm:py-12 px-4">
      {/* Top Header */}
      <div className="max-w-2xl mx-auto flex items-center justify-between mb-6">
        <a href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6a787e] hover:text-[#10181c]">
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Homepage</span>
        </a>

        <div className="flex items-center gap-2">
          <SeyyoLogo className="w-6 h-6 shadow-xs" />
          <span className="font-black text-sm tracking-tight text-[#10181c]">Seyyo Setup</span>
        </div>
      </div>

      {sessionData && (
        <OnboardingWizard
          sessionToken={sessionData.sessionToken}
          tier={sessionData.tier}
          initialStep={sessionData.currentStep}
          initialDraftData={sessionData.draftData}
          onCompleted={launchResult => {
            safeSessionStorage.removeItem('seyo_onboarding_session');
            safeSessionStorage.setItem('seyo_staff_session', launchResult.staffSession.sessionId);
            setCompletedBusiness({
              ...launchResult.business,
              defaultStaffPin: launchResult.defaultStaffPin,
            });
          }}
        />
      )}
    </div>
  );
};
