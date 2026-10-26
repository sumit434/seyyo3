import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Button } from '../components/common/Button';
import { CustomerFooter } from '../components/customer/CustomerFooter';
import { SeyyoLogo } from '../components/common/SeyyoLogo';
import {
  Gift,
  Award,
  Star,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  Clock,
  ThumbsUp,
  User,
  Phone,
} from 'lucide-react';

type DemoStep = 'input' | 'spin' | 'voucher' | 'loyalty' | 'loyalty_claim' | 'review' | 'cooldown';

const DEMO_BUSINESS = {
  name: 'Demo Bistro & Cafe',
  slug: 'demo-cafe',
  tier: 'combined',
  primaryColor: '#009788',
  redeemPin: '1234',
  logoEmoji: '☕',
};

const DEMO_VOUCHER = {
  code: 'DEMO-7788',
  rewardTitle: 'Free Artisan Coffee',
  emoji: '☕',
};

// 7 exact slice colors sequence matching production wheel
const WHEEL_SLICES = [
  { id: 1, color: '#e76484', emoji: '🎁', title: 'Gift Box' },
  { id: 2, color: '#c442d8', emoji: '🏆', title: 'Bistro Mug' },
  { id: 3, color: '#6862f6', emoji: '🥇', title: 'First Place Perk' },
  { id: 4, color: '#49aed8', emoji: '👑', title: 'Royal Dessert' },
  { id: 5, color: '#7eb557', emoji: '☕', title: 'Free Artisan Coffee' },
  { id: 6, color: '#f2d634', emoji: '🥐', title: 'Bakery Croissant' },
  { id: 7, color: '#f48e3a', emoji: '🌟', title: 'VIP Bonus' },
];

export const CustomerDemoPage: React.FC = () => {
  const [step, setStep] = useState<DemoStep>('input');

  // Step 1: Input state
  const [customerName, setCustomerName] = useState('Alex Rivera');
  const [customerPhone, setCustomerPhone] = useState('+1 (555) 019-2834');

  // Step 2: Spin state
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const [wonSliceIndex, setWonSliceIndex] = useState<number>(4); // Slice 5: Coffee

  // Step 3: Voucher redemption state
  const [staffPin, setStaffPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVoucherRedeemed, setIsVoucherRedeemed] = useState(false);

  // Step 4: Loyalty state
  const [loyaltyVisits, setLoyaltyVisits] = useState(5);
  const [loyaltyTarget] = useState(6);
  const [hasStampedToday, setHasStampedToday] = useState(false);
  const [loyaltyStaffPin, setLoyaltyStaffPin] = useState('');
  const [loyaltyPinError, setLoyaltyPinError] = useState<string | null>(null);
  const [isLoyaltyRewardRedeemed, setIsLoyaltyRewardRedeemed] = useState(false);
  const [loyaltyRedeemedAt, setLoyaltyRedeemedAt] = useState<string | null>(null);

  // Step 5: Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Artisan Coffee',
    'Friendly Baristas',
    'Cozy Atmosphere',
  ]);
  const [isCopied, setIsCopied] = useState(false);
  const [isReviewSubmitted, setIsReviewSubmitted] = useState(false);
  const [hasEnteredReview, setHasEnteredReview] = useState(false);

  // Helper confetti
  const fireConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#009788', '#f59e0b', '#10b981', '#ffffff'],
    });
  };

  const handleResetDemo = () => {
    setStep('input');
    setCustomerName('Alex Rivera');
    setCustomerPhone('+1 (555) 019-2834');
    setIsSpinning(false);
    setRotationAngle(0);
    setHasSpun(false);
    setStaffPin('');
    setPinError(null);
    setIsVoucherRedeemed(false);
    setLoyaltyVisits(5);
    setHasStampedToday(false);
    setLoyaltyStaffPin('');
    setLoyaltyPinError(null);
    setIsLoyaltyRewardRedeemed(false);
    setLoyaltyRedeemedAt(null);
    setReviewRating(5);
    setSelectedTags(['Artisan Coffee', 'Friendly Baristas', 'Cozy Atmosphere']);
    setIsCopied(false);
    setIsReviewSubmitted(false);
    setHasEnteredReview(false);
  };

  // Voucher deferral & skip handler: mirrors database lifetime-once review rule in demo state
  const handleVoucherSkipOrDefer = (isMilestoneReward: boolean = false) => {
    // 1. Combined demo tier: Spin voucher deferral routes directly to Loyalty stamp card
    if (!isMilestoneReward && DEMO_BUSINESS.tier === 'combined') {
      setStep('loyalty');
      return;
    }

    // 2. Milestone reward or single-tier voucher: check lifetime-once review rule
    const hasAlreadyReviewed = hasEnteredReview || isReviewSubmitted;
    if (!hasAlreadyReviewed) {
      setHasEnteredReview(true);
      setStep('review');
    } else {
      setStep('cooldown');
    }
  };

  // Wheel spin simulation
  const handleSpinClick = () => {
    if (isSpinning || hasSpun) return;
    setIsSpinning(true);

    // Target slice 5: Free Artisan Coffee (index 4)
    // Slice 5 starts at 4 * (360/7) = 205.71 deg, center at 231.43 deg
    const targetIndex = 4;
    setWonSliceIndex(targetIndex);

    const sliceDeg = 360 / 7;
    const sliceCenter = targetIndex * sliceDeg + sliceDeg / 2;
    // Align with top pointer at 0 deg: 360 - sliceCenter
    const targetDeg = 360 - sliceCenter;
    const fullSpins = 360 * 5; // 5 full rotations
    const totalRotation = fullSpins + targetDeg;

    setRotationAngle(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      fireConfetti();
    }, 4200);
  };

  // Voucher redeem simulation
  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (staffPin !== DEMO_BUSINESS.redeemPin) {
      setPinError(`Incorrect PIN. For this demo, use PIN ${DEMO_BUSINESS.redeemPin}`);
      return;
    }
    setPinError(null);
    setIsVoucherRedeemed(true);
    fireConfetti();
  };

  // Loyalty stamp simulation
  const handleStampLoyalty = () => {
    if (hasStampedToday) return;
    const newVisits = loyaltyVisits + 1;
    setLoyaltyVisits(newVisits);
    setHasStampedToday(true);
    fireConfetti();

    // Conditional Routing: Milestone reached (6/6) routes directly to Step 5: Claim
    if (newVisits >= loyaltyTarget) {
      setTimeout(() => {
        setStep('loyalty_claim');
      }, 900);
    }
  };

  // Loyalty reward voucher redemption simulation via staff PIN
  const handleVerifyLoyaltyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!/^\d{4}$/.test(loyaltyStaffPin)) {
      setLoyaltyPinError('Please enter a 4-digit numeric staff PIN');
      return;
    }
    if (loyaltyStaffPin !== DEMO_BUSINESS.redeemPin) {
      setLoyaltyPinError(`Invalid staff PIN. Please ask staff to re-enter (Demo PIN: ${DEMO_BUSINESS.redeemPin}).`);
      return;
    }
    setLoyaltyPinError(null);
    setIsLoyaltyRewardRedeemed(true);
    setLoyaltyRedeemedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setLoyaltyStaffPin('');
    fireConfetti();
  };

  // Review tags list
  const AVAILABLE_TAGS = [
    'Artisan Coffee',
    'Friendly Baristas',
    'Cozy Atmosphere',
    'Fast Counter Service',
    'Fresh Pastries',
    'Great Music',
  ];

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const reviewText = `Had an incredible visit to ${DEMO_BUSINESS.name}! What stood out most was the ${selectedTags.map(t => t.toLowerCase()).join(', ')}. Friendly staff and welcoming energy. Highly recommended!`;

  const handleCopyReview = async () => {
    try {
      await navigator.clipboard.writeText(reviewText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Wheel trigonometry constants
  const viewBoxSize = 400;
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;
  const rimStrokeWidth = 24;
  const rimRadius = 188;

  return (
    <div className="min-h-screen bg-[#f1f3f2] text-[#10181c] flex flex-col justify-between font-['Inter',sans-serif] relative pb-6 pt-16 px-4">
      {/* Floating Demo Banner */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-md text-white text-xs px-4 py-1.5 rounded-full flex items-center gap-3 shadow-xl border border-white/10">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Demo
        </span>
        <span className="text-white/30">•</span>
        <a href="/" className="text-gray-300 hover:text-white transition-colors">
          Exit
        </a>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-sm mx-auto my-auto flex flex-col items-center">
        {/* Merchant Branding Header */}
        <div className="w-full flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-xs border border-[#e2e7e6] bg-[#009788]/15"
            >
              <span>{DEMO_BUSINESS.logoEmoji}</span>
            </div>
            <div className="text-left">
              <h1 className="font-bold text-sm text-[#10181c] leading-tight">
                {DEMO_BUSINESS.name}
              </h1>
              <p className="text-[11px] text-[#6a787e]">
                Customer: <strong className="text-[#009788]">{customerName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#e2e7e6] text-[10px] font-bold text-[#009788] shadow-2xs">
            <Sparkles className="w-3 h-3 text-[#009788]" />
            <span>Seyyo Combo</span>
          </div>
        </div>

        {/* Step Indicator Pills */}
        <div className="w-full grid grid-cols-6 gap-1 mb-5 px-1">
          {[
            { id: 'input', label: '1. Entry' },
            { id: 'spin', label: '2. Spin' },
            { id: 'voucher', label: '3. Claim' },
            { id: 'loyalty', label: '4. Stamp' },
            { id: 'loyalty_claim', label: '5. Claim' },
            { id: 'review', label: '6. Review' },
          ].map(s => {
            const isCurrent = step === s.id;
            const isCompleted =
              (s.id === 'input' && step !== 'input') ||
              (s.id === 'spin' && ['voucher', 'loyalty', 'loyalty_claim', 'review', 'cooldown'].includes(step)) ||
              (s.id === 'voucher' && ['loyalty', 'loyalty_claim', 'review', 'cooldown'].includes(step)) ||
              (s.id === 'loyalty' && ['loyalty_claim', 'review', 'cooldown'].includes(step)) ||
              (s.id === 'loyalty_claim' && ['review', 'cooldown'].includes(step)) ||
              (s.id === 'review' && step === 'cooldown');

            return (
              <div
                key={s.id}
                className={`py-1 rounded-lg text-center text-[9px] font-bold transition-all truncate px-0.5 ${
                  isCurrent
                    ? 'bg-[#009788] text-white shadow-xs'
                    : isCompleted
                    ? 'bg-[#e2f1ec] text-[#009788]'
                    : 'bg-white/70 text-[#6a787e] border border-[#e2e7e6]'
                }`}
              >
                {s.label}
              </div>
            );
          })}
        </div>

        {/* STEP 1: PHONE INPUT */}
        {step === 'input' && (
          <div className="w-full bg-white rounded-3xl border border-[#e2e7e6] shadow-xl p-6 sm:p-8 text-left space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#009788]/10 text-[#009788] flex items-center justify-center mx-auto mb-2 text-2xl">
                ☕
              </div>
              <h2 className="text-xl font-black text-[#10181c] tracking-tight">
                Welcome to {DEMO_BUSINESS.name}
              </h2>
              <p className="text-xs text-[#6a787e]">
                Tap below to experience the seamless 3-stage customer engagement journey.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] text-xs space-y-1.5">
              <span className="font-bold text-[#009788] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Zero-Download Web Experience
              </span>
              <p className="text-[#6a787e] text-[11px] leading-relaxed">
                Customers scan a single NFC or QR tag at your counter and immediately participate in seconds.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#10181c] mb-1">
                  Customer Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#6a787e] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#e2e7e6] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#009788]"
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10181c] mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#6a787e] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#e2e7e6] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#009788]"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setStep('spin')}
              className="gap-2 shadow-md bg-[#009788] hover:bg-[#007f72]"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP 2: SPIN WHEEL */}
        {step === 'spin' && (
          <div className="w-full bg-white rounded-3xl border border-[#e2e7e6] shadow-xl p-5 text-center space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#009788]/10 text-[#009788] text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Stage 1 • Gamified Treat</span>
              </div>
              <h2 className="text-xl font-black text-[#10181c] tracking-tight">
                Spin the All-Win Wheel!
              </h2>
              <p className="text-xs text-[#6a787e] mt-0.5">
                100% win rate • Guaranteed reward on every scan
              </p>
            </div>

            {/* Spin Wheel Container */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto my-2 flex items-center justify-center">
              {/* Top Pointer Needle */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-md">
                <div
                  className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px]"
                  style={{ borderTopColor: '#009788' }}
                />
              </div>

              {/* Rotating Wheel Disk */}
              <div
                className="w-full h-full rounded-full shadow-2xl relative overflow-hidden transition-transform ease-out"
                style={{
                  transform: `rotate(${rotationAngle}deg)`,
                  transitionDuration: isSpinning ? '4000ms' : '0ms',
                  transitionTimingFunction: 'cubic-bezier(0.12, 0.8, 0.15, 1)',
                }}
              >
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  {WHEEL_SLICES.map((slice, i) => {
                    const startAngle = (i * 360) / 7;
                    const endAngle = ((i + 1) * 360) / 7;
                    const startRad = ((startAngle - 90) * Math.PI) / 180;
                    const endRad = ((endAngle - 90) * Math.PI) / 180;
                    const r = 200;
                    const x1 = 200 + r * Math.cos(startRad);
                    const y1 = 200 + r * Math.sin(startRad);
                    const x2 = 200 + r * Math.cos(endRad);
                    const y2 = 200 + r * Math.sin(endRad);

                    const pathData = `M 200 200 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                    return (
                      <path
                        key={slice.id}
                        d={pathData}
                        fill={slice.color}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>

                {/* Slices Emojis (Nudged outward toward outer edge) */}
                {WHEEL_SLICES.map((slice, i) => {
                  const angle = i * (360 / 7) + 360 / 14;
                  return (
                    <div
                      key={slice.id}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                      style={{
                        transform: `rotate(${angle}deg)`,
                      }}
                    >
                      <div
                        className="flex flex-col items-center justify-center"
                        style={{ transform: 'translateY(-88px)' }}
                      >
                        <span className="text-2xl drop-shadow-md">{slice.emoji}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Outer White Border & 7 Responsive Dots in SVG coordinates */}
              <svg
                viewBox="0 0 400 400"
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              >
                {/* White Outer Rim */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={rimRadius}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={rimStrokeWidth}
                />
                {/* 7 Evenly Spaced Yellow Dots */}
                {Array.from({ length: 7 }).map((_, index) => {
                  const angle = (index * 360) / 7;
                  const radians = (angle * Math.PI) / 180;
                  const dotX = centerX + rimRadius * Math.cos(radians);
                  const dotY = centerY + rimRadius * Math.sin(radians);
                  return (
                    <circle
                      key={index}
                      cx={dotX}
                      cy={dotY}
                      r={5}
                      fill="#f2d634"
                    />
                  );
                })}
              </svg>

              {/* Center Hub Cap with Seyyo SVG Logo */}
              <div className="absolute z-20 w-16 h-16 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center ring-1 ring-[#e2e7e6] p-2">
                <div className="w-10 h-10 rounded-2xl bg-[#0e7c66] flex items-center justify-center shadow-inner overflow-hidden p-1.5">
                  <SeyyoLogo className="w-full h-full" />
                </div>
              </div>
            </div>

            {/* Action Area */}
            {!hasSpun ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSpinning}
                onClick={handleSpinClick}
                className="gap-2 shadow-lg bg-[#009788] hover:bg-[#007f72] font-black text-base py-3.5"
              >
                <span>{isSpinning ? 'Spinning...' : 'Tap to Spin!'}</span>
                <Sparkles className="w-4 h-4" />
              </Button>
            ) : (
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-3 bg-[#e2f1ec] rounded-2xl border border-[#009788]/30">
                  <span className="text-xs font-bold text-[#009788] block">🎉 You Won!</span>
                  <h3 className="text-lg font-black text-[#10181c]">
                    Free Artisan Coffee ☕
                  </h3>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => setStep('voucher')}
                  className="gap-2 shadow-md bg-[#009788] hover:bg-[#007f72]"
                >
                  <span>Claim Digital Voucher</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: VOUCHER CLAIM & STAFF PIN VERIFICATION */}
        {step === 'voucher' && (
          <div className="w-full bg-white rounded-3xl border border-[#e2e7e6] shadow-xl overflow-hidden text-left animate-in fade-in duration-200">
            {/* Header banner */}
            <div className="bg-[#009788] text-white p-6 text-center relative">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mb-3 text-3xl shadow-xs mx-auto">
                {DEMO_VOUCHER.emoji}
              </div>
              <h2 className="text-xl font-black">{DEMO_VOUCHER.rewardTitle}</h2>
              <p className="text-xs text-white/90 mt-0.5">
                {DEMO_BUSINESS.name} • 100% Guaranteed Treat
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Voucher Code Box */}
              <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] text-center space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#6a787e]">
                  Voucher Claim Code
                </span>
                <div className="font-mono text-2xl font-black text-[#009788] tracking-widest">
                  {DEMO_VOUCHER.code}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6a787e] pt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Valid for 15 minutes at counter</span>
                </div>
              </div>

              {!isVoucherRedeemed ? (
                /* Staff PIN Gate */
                <form onSubmit={handleVerifyPin} className="space-y-3">
                  <div className="text-center pt-1">
                    <span className="text-xs font-bold text-[#10181c] flex items-center justify-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#009788]" />
                      Staff Verification PIN
                    </span>
                    <p className="text-[11px] text-[#6a787e] mt-0.5">
                      Show code to barista or enter demo PIN: <strong className="text-[#009788]">1234</strong>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={staffPin}
                      onChange={e => setStaffPin(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 text-center font-mono text-lg font-black tracking-widest py-2.5 rounded-xl border border-[#e2e7e6] focus:outline-none focus:ring-2 focus:ring-[#009788]"
                      placeholder="••••"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setStaffPin('1234');
                        setPinError(null);
                      }}
                      className="px-3 py-2 bg-[#f1f3f2] hover:bg-[#e2e7e6] text-[#2a383f] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Fill 1234
                    </button>
                  </div>

                  {pinError && (
                    <p className="text-xs text-red-600 font-semibold text-center">{pinError}</p>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    className="gap-2 bg-[#009788] hover:bg-[#007f72]"
                  >
                    <span>Verify & Redeem Voucher</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleVoucherSkipOrDefer(false)}
                    className="w-full text-center text-xs text-[#6a787e] hover:text-[#10181c] py-1 cursor-pointer"
                  >
                    Redeem Later & Skip to Loyalty Log →
                  </button>
                </form>
              ) : (
                /* Success State */
                <div className="space-y-4 text-center animate-in fade-in duration-200">
                  <div className="p-3 bg-[#e2f1ec] text-[#009788] rounded-2xl flex items-center justify-center gap-2 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Redeemed Successfully by Staff!</span>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => handleVoucherSkipOrDefer(false)}
                    className="gap-2 bg-[#009788] hover:bg-[#007f72]"
                  >
                    <span>Proceed to Loyalty Log</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: LOYALTY LOG / STAMP CARD */}
        {step === 'loyalty' && (
          <div className="w-full bg-white rounded-3xl border border-[#e2e7e6] shadow-xl p-6 sm:p-8 text-left space-y-6 animate-in fade-in duration-200">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#009788]/10 text-[#009788] text-xs font-bold uppercase tracking-wider mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>Stage 2 • Loyalty Log</span>
              </div>
              <h2 className="text-2xl font-black text-[#10181c] tracking-tight">
                Digital Stamp Card
              </h2>
              <p className="text-xs text-[#6a787e] mt-1">
                {loyaltyVisits < loyaltyTarget
                  ? `${loyaltyTarget - loyaltyVisits} more stamp to unlock: Free Artisan Pastry 🥐`
                  : 'Milestone Completed! Free Artisan Pastry unlocked!'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#6a787e] uppercase tracking-wider">Cycle Progress</span>
                <span className="text-[#009788] text-sm">
                  {loyaltyVisits} / {loyaltyTarget} Stamps
                </span>
              </div>
              <div className="w-full h-3 bg-[#e2e7e6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#009788] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, (loyaltyVisits / loyaltyTarget) * 100)}%` }}
                />
              </div>
            </div>

            {/* Stamp Grid */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#f1f3f2]/60 border border-[#e2e7e6]">
              {Array.from({ length: loyaltyTarget }).map((_, i) => {
                const isStamped = i < loyaltyVisits;
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 text-center transition-all ${
                      isStamped
                        ? 'bg-[#009788] text-white shadow-sm ring-2 ring-[#009788]/20'
                        : 'bg-white border-2 border-dashed border-[#e2e7e6] text-[#6a787e]'
                    }`}
                  >
                    {isStamped ? (
                      <>
                        <Check className="w-6 h-6 stroke-[3]" />
                        <span className="text-[10px] font-black uppercase mt-0.5">Visit {i + 1}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base font-bold text-[#6a787e]">{i + 1}</span>
                        <span className="text-[9px] text-[#6a787e] font-semibold">Stamp</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {!hasStampedToday ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleStampLoyalty}
                className="gap-2 bg-[#009788] hover:bg-[#007f72] shadow-md"
              >
                <span>Stamp Today&apos;s Visit (+1)</span>
                <Sparkles className="w-4 h-4" />
              </Button>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3 bg-[#e2f1ec] text-[#009788] rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-center">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {loyaltyVisits >= loyaltyTarget
                      ? 'Visit Stamped! Target 6/6 Reached 🎉'
                      : 'Visit Stamped Successfully!'}
                  </span>
                </div>

                {loyaltyVisits >= loyaltyTarget ? (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => setStep('loyalty_claim')}
                    className="gap-2 bg-[#009788] hover:bg-[#007f72]"
                  >
                    <span>Claim Milestone Reward</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => handleVoucherSkipOrDefer(true)}
                    className="gap-2 bg-[#009788] hover:bg-[#007f72]"
                  >
                    <span>
                      {hasEnteredReview || isReviewSubmitted
                        ? 'View Cooldown Summary'
                        : 'Proceed to Google Review'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: LOYALTY CLAIM (Dedicated Step 5: Claim for Loyalty Reward) */}
        {step === 'loyalty_claim' && (
          <div className="w-full bg-white rounded-3xl border border-[#e2e7e6] shadow-xl overflow-hidden text-left animate-in fade-in duration-200">
            {/* Header / Step Indicator */}
            <div className="bg-[#009788] text-white p-6 text-center relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider mb-3">
                <Award className="w-3.5 h-3.5" />
                <span>Step 5: Claim • Milestone Reward</span>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mb-3 text-3xl shadow-xs mx-auto">
                <span>🥐</span>
              </div>
              <h2 className="text-xl font-black">Free Artisan Pastry 🥐</h2>
              <p className="text-xs text-white/90 mt-0.5">
                {DEMO_BUSINESS.name} • Milestone Achieved!
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Reward Card Display */}
              <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] text-center space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#6a787e]">
                  Milestone Voucher Code
                </span>
                <div className="font-mono text-2xl font-black text-[#009788] tracking-widest">
                  LOYAL-6688
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6a787e] pt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Earned today at counter</span>
                </div>
              </div>

              {!isLoyaltyRewardRedeemed ? (
                /* Staff Redemption Section */
                <form onSubmit={handleVerifyLoyaltyPin} className="space-y-3 pt-1 text-left">
                  <div className="text-center">
                    <span className="text-xs font-bold text-[#10181c] flex items-center justify-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#009788]" />
                      Staff Redemption
                    </span>
                    <p className="text-[11px] text-[#6a787e] mt-0.5">
                      Present this screen to staff to redeem your reward. (Demo PIN: <strong className="text-[#009788]">1234</strong>)
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={loyaltyStaffPin}
                      placeholder="••••"
                      onChange={e => {
                        setLoyaltyStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                        if (loyaltyPinError) setLoyaltyPinError(null);
                      }}
                      className="flex-1 text-center font-mono text-lg font-black tracking-widest py-2.5 rounded-xl border border-[#e2e7e6] bg-white focus:outline-none focus:ring-2 focus:ring-[#009788]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLoyaltyStaffPin('1234');
                        setLoyaltyPinError(null);
                      }}
                      className="px-3 py-2 bg-[#f1f3f2] hover:bg-[#e2e7e6] text-[#2a383f] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Fill 1234
                    </button>
                  </div>

                  {loyaltyPinError && (
                    <p className="text-xs text-red-600 font-semibold text-center">{loyaltyPinError}</p>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={loyaltyStaffPin.length !== 4}
                    className="gap-2 bg-[#009788] hover:bg-[#007f72]"
                  >
                    <span>Verify & Redeem</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleVoucherSkipOrDefer(true)}
                    className="w-full text-center text-xs text-[#6a787e] hover:text-[#10181c] py-1 cursor-pointer"
                  >
                    {hasEnteredReview || isReviewSubmitted
                      ? 'Redeem Later & View Summary →'
                      : 'Redeem Later & Proceed to Review →'}
                  </button>
                </form>
              ) : (
                /* Success State */
                <div className="space-y-4 text-center animate-in fade-in duration-200">
                  <div className="p-3 bg-[#e2f1ec] text-[#009788] rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Reward Redeemed Successfully</span>
                    </div>
                    {loyaltyRedeemedAt && (
                      <span className="text-[11px] text-[#007f72] font-normal">
                        Redeemed today at {loyaltyRedeemedAt}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => handleVoucherSkipOrDefer(true)}
                    className="gap-2 bg-[#009788] hover:bg-[#007f72]"
                  >
                    <span>
                      {hasEnteredReview || isReviewSubmitted
                        ? 'Finish Journey'
                        : 'Continue to Google Review'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW SCREEN */}
        {step === 'review' && (
          <div className="w-full bg-white rounded-3xl border border-[#e2e7e6] shadow-xl p-6 sm:p-8 text-left space-y-5 animate-in fade-in duration-200">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#009788]/10 text-[#009788] text-xs font-bold uppercase tracking-wider mb-2">
                <Star className="w-3.5 h-3.5 fill-[#009788]" />
                <span>Step 6: Review • Verified Review Pro</span>
              </div>
              <h2 className="text-2xl font-black text-[#10181c] tracking-tight">
                Share Your Feedback
              </h2>
              <p className="text-xs text-[#6a787e] mt-1">
                Select highlights to generate your personalized 5-star Google review.
              </p>
            </div>

            {/* Star Rating */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1 cursor-pointer transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= reviewRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-[#e2e7e6]'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Quick Experience Tags */}
            <div>
              <span className="text-[11px] font-bold text-[#6a787e] block uppercase tracking-wider mb-2">
                What did you love today?
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#009788] text-white shadow-xs'
                          : 'bg-[#f1f3f2] text-[#2a383f] hover:bg-[#e2e7e6]'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Generated Review Box */}
            <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#6a787e]">
                <span>Generated Review Prompt</span>
                <button
                  type="button"
                  onClick={handleCopyReview}
                  className="text-[#009788] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <p className="text-xs text-[#2a383f] leading-relaxed italic font-medium">
                &ldquo;{reviewText}&rdquo;
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                fireConfetti();
                setIsReviewSubmitted(true);
                setHasEnteredReview(true);
                setStep('cooldown');
              }}
              className="gap-2 bg-[#009788] hover:bg-[#007f72] shadow-md"
            >
              <span>Submit & Finish Journey</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP 6: COOLDOWN / SUMMARY */}
        {step === 'cooldown' && (
          <div className="w-full bg-white rounded-3xl border border-[#e2e7e6] shadow-xl p-6 sm:p-8 text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-[#009788] text-white mx-auto flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#009788] uppercase tracking-wider">
                Full Demo Completed
              </span>
              <h2 className="text-2xl font-black text-[#10181c] tracking-tight mt-1">
                All Caught Up for Today!
              </h2>
              <p className="text-xs text-[#6a787e] mt-1 leading-relaxed">
                You experienced all 3 pillars of the Seyyo Combo flow. At midnight in your store&apos;s timezone, customer cooldowns automatically reset for their next visit.
              </p>
            </div>

            {/* 3 Pillars Summary */}
            <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] space-y-2.5 text-left text-xs">
              <div className="flex items-center gap-2.5 text-[#10181c] font-bold">
                <span className="w-6 h-6 rounded-lg bg-[#e2f1ec] text-[#009788] flex items-center justify-center text-sm">
                  ✓
                </span>
                <span>🎁 Spin & Win — Free Artisan Coffee claimed</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#10181c] font-bold">
                <span className="w-6 h-6 rounded-lg bg-[#e2f1ec] text-[#009788] flex items-center justify-center text-sm">
                  ✓
                </span>
                <span>⭐ Loyalty Log — 6/6 milestone stamp unlocked</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#10181c] font-bold">
                <span className="w-6 h-6 rounded-lg bg-[#e2f1ec] text-[#009788] flex items-center justify-center text-sm">
                  ✓
                </span>
                <span>🌟 Review Pro — 5-star Google review generated</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleResetDemo}
                className="gap-2 bg-[#009788] hover:bg-[#007f72] shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Replay Demo Experience</span>
              </Button>

              <Button
                href="/"
                variant="outline"
                size="lg"
                fullWidth
                className="gap-2"
              >
                <span>Return to Marketing Homepage</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Footer */}
      <div className="w-full max-w-sm mx-auto mt-6">
        <CustomerFooter />
      </div>
    </div>
  );
};
