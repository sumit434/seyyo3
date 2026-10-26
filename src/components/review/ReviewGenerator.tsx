import React, { useState } from 'react';
import { Star, Copy, Check, ExternalLink, ThumbsUp } from 'lucide-react';
import { Button } from '../common/Button';
import { customerService } from '../../services/customerService';
import { copyToClipboard } from '../../utils/clipboard';
import { generateReviewDrafts } from '../../utils/reviewBank';

interface ReviewGeneratorProps {
  businessId: string;
  businessName: string;
  customerId: string;
  customerName: string;
  googleReviewUrl: string;
  onReviewCompleted: () => void;
}

const DEFAULT_TAGS = [
  'Amazing Service',
  'Exceptional Quality',
  'Friendly & Welcoming',
  'Great Atmosphere',
  'Quick & Attentive',
  'Clean & Cozy',
  'Highly Recommended',
];

export const ReviewGenerator: React.FC<ReviewGeneratorProps> = ({
  businessId,
  businessName,
  customerId,
  customerName,
  googleReviewUrl,
  onReviewCompleted,
}) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Amazing Service', 'Exceptional Quality']);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState<number>(0);

  // Compute 3 review draft variations using local review bank
  const [drafts, setDrafts] = useState<[string, string, string]>(() =>
    generateReviewDrafts({
      rating: 5,
      tags: ['Amazing Service', 'Exceptional Quality'],
      business: businessName,
    })
  );

  const [reviewText, setReviewText] = useState<string>(drafts[0]);

  const updateDrafts = (newRating: number, newTags: string[], activeIndex: number) => {
    const newDrafts = generateReviewDrafts({
      rating: newRating,
      tags: newTags,
      business: businessName,
    });
    setDrafts(newDrafts);
    setReviewText(newDrafts[activeIndex]);
  };

  const handleTagToggle = (tag: string) => {
    let next: string[];
    if (selectedTags.includes(tag)) {
      next = selectedTags.filter(t => t !== tag);
    } else {
      next = [...selectedTags, tag];
    }
    setSelectedTags(next);
    updateDrafts(rating, next, selectedDraftIndex);
  };

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    updateDrafts(newRating, selectedTags, selectedDraftIndex);
  };

  const handleSelectDraft = (index: number) => {
    setSelectedDraftIndex(index);
    if (drafts[index]) {
      setReviewText(drafts[index]);
    }
  };

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [reviewText]);

  const handleCopy = async () => {
    const success = await copyToClipboard(reviewText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleProceedToGoogle = async () => {
    setIsSubmitting(true);
    setError(null);

    // Conditional Star-Rating Routing Gate:
    // <= 2 Stars: Intercept and bypass external redirection; navigate immediately to the Cooldown View
    if (rating <= 2) {
      try {
        await customerService.persistReview(
          businessId,
          customerId,
          rating,
          selectedTags,
          reviewText
        );
      } catch (err: any) {
        console.warn('Low star rating review persistence warning:', err);
      } finally {
        setIsSubmitting(false);
        onReviewCompleted();
      }
      return;
    }

    // >= 3 Stars: Copy review draft and open merchant's googleReviewUrl in a new tab before transitioning to Cooldown
    // On iPhone Safari, window.open after an async operation is blocked by Safari's popup blocker.
    // Pre-opening a reference allows setting location.href after the async persistence.
    let popupWindow: Window | null = null;
    try {
      popupWindow = window.open('about:blank', '_blank');
    } catch {
      // Ignored if browser blocks pre-opening
    }

    try {
      // 1. Copy review text to clipboard with Safari fallback
      await copyToClipboard(reviewText);
      setCopied(true);

      // 2. Mandatory server-side persistence BEFORE redirecting
      const res = await customerService.persistReview(
        businessId,
        customerId,
        rating,
        selectedTags,
        reviewText
      );

      // 3. Open Google review link
      const fallbackUrl = `https://maps.google.com/?q=${encodeURIComponent(businessName.replace(/\s+/g, '+'))}`;
      const targetUrl = res.googleReviewUrl || googleReviewUrl || fallbackUrl;

      if (popupWindow && !popupWindow.closed) {
        popupWindow.location.href = targetUrl;
      } else {
        try {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } catch {
          window.location.href = targetUrl;
        }
      }

      // 4. Mark google opened and complete review journey
      await customerService.markGoogleOpened(res.reviewLogId, customerId);

      onReviewCompleted();
    } catch (err: any) {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl border border-[#e2e7e6] shadow-xl p-6 sm:p-8 text-left space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2f1ec] text-[#0e7c66] text-xs font-bold uppercase tracking-wider mb-2">
          <Star className="w-3.5 h-3.5 fill-[#0e7c66]" />
          <span>Verified Review</span>
        </div>
        <h2 className="text-2xl font-black text-[#10181c] tracking-tight">Share Your Experience</h2>
        <p className="text-xs text-[#6a787e] mt-1">
          Help others discover {businessName} on Google Maps!
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Star Rating */}
      <div className="flex flex-col items-center gap-2 bg-[#f1f3f2]/60 p-4 rounded-2xl border border-[#e2e7e6]">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(star)}
              className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-[#e2e7e6] hover:text-amber-300'
                }`}
              />
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-[#10181c]">
          {rating === 5 ? '⭐⭐⭐⭐⭐ Exceptional (5 Stars)' : `${rating} Stars`}
        </span>
      </div>

      {/* Sentiment Tags */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[#6a787e] flex items-center gap-1.5">
          <ThumbsUp className="w-3.5 h-3.5 text-[#0e7c66]" />
          <span>Highlight What You Loved</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_TAGS.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0e7c66] text-white shadow-xs'
                    : 'bg-[#f1f3f2] text-[#6a787e] hover:bg-[#e2e7e6]'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Review Text Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[#6a787e]">
            Review Draft
          </label>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-[#0e7c66] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>

        {/* 3-Option Review Draft Selector Slider */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f1f3f2] rounded-2xl border border-[#e2e7e6]">
          {[0, 1, 2].map(idx => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDraft(idx)}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                selectedDraftIndex === idx
                  ? 'bg-[#0e7c66] text-white shadow-xs'
                  : 'text-[#6a787e] hover:text-[#10181c] hover:bg-white/50'
              }`}
            >
              Option {idx + 1}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={reviewText}
          onChange={e => setReviewText(e.target.value)}
          className="w-full text-xs text-[#10181c] bg-[#f8faf9] p-3 rounded-2xl border border-[#e2e7e6] focus:outline-none focus:ring-2 focus:ring-[#0e7c66] leading-relaxed resize-none overflow-hidden"
          style={{ minHeight: '76px' }}
        />
      </div>

      {/* Action Button */}
      <div className="space-y-2 pt-1">
        <Button
          onClick={handleProceedToGoogle}
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          className="gap-2 shadow-lg"
        >
          <span>Copy & Review it</span>
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
