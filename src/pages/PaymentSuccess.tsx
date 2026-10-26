import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../components/common/Button';

interface PaymentSuccessProps {
  email?: string;
  setupUrl?: string;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({
  email: propEmail,
  setupUrl: propSetupUrl,
}) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [email, setEmail] = useState(propEmail || '');
  const [setupUrl, setSetupUrl] = useState(propSetupUrl || '');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const paramSetupUrl = params.get('setupUrl');
    const paramEmail = params.get('email');

    const effectiveSetupUrl = propSetupUrl || paramSetupUrl || (token ? `/setup?token=${encodeURIComponent(token)}` : null);
    const effectiveEmail = propEmail || paramEmail || '';

    // Route Guard: Must have an explicit setup token or verified setup URL
    if (!effectiveSetupUrl || effectiveSetupUrl === '/setup' || (!token && !effectiveSetupUrl.includes('token='))) {
      window.location.replace('/');
      return;
    }

    setEmail(effectiveEmail);
    setSetupUrl(effectiveSetupUrl);
    setIsAuthorized(true);
  }, [propEmail, propSetupUrl]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f1f3f2] flex flex-col items-center justify-center p-4 sm:p-6 font-['Inter',sans-serif]">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#e2e7e6] shadow-xl p-6 sm:p-8 space-y-6 text-left">
        <div>
          <h2 className="text-2xl font-black text-[#10181c]">Payment Confirmed!</h2>
        </div>

        <div className="p-4 rounded-2xl bg-[#e2f1ec] border border-[#0e7c66]/30 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#0e7c66] text-white mx-auto flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-[#0e7c66] text-base">Payment Verified Successfully</h4>
          <p className="text-xs text-[#0a6252]">
            Order verified via Razorpay. Your single-use 15-minute onboarding link is ready.
          </p>
        </div>

        {email && (
          <div className="p-3 bg-[#f8faf9] rounded-2xl border border-[#e2e7e6] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a787e]">
              Merchant Account Email
            </span>
            <p className="text-xs font-semibold text-[#10181c]">{email}</p>
          </div>
        )}

        <div className="p-3 bg-[#f8faf9] rounded-2xl border border-[#e2e7e6] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a787e]">
            Setup Magic Link
          </span>
          <p className="text-xs font-mono text-[#0e7c66] truncate">{setupUrl}</p>
        </div>

        <a href={setupUrl} className="block pt-1">
          <Button variant="primary" size="lg" fullWidth className="gap-2 shadow-md">
            <span>Merchant Setup</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </a>
      </div>
    </div>
  );
};

export default PaymentSuccess;
