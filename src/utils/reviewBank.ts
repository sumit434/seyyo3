/**
 * Local Review Bank Engine
 * Generates natural, high-converting review drafts across 3 distinct variations (variant = 0, 1, 2)
 * with zero external AI dependencies and zero note handling.
 */

export interface ReviewOptions {
  rating: number;
  tags?: string[];
  variant?: number;
  business?: { name?: string } | string;
}

export interface ReviewDraftsOptions {
  rating: number;
  tags?: string[];
  business?: { name?: string } | string;
}

export const RATING_STYLES: Record<number, [string, string, string]> = {
  5: [
    'Had an absolutely wonderful experience at {business}! Everything exceeded expectations from start to finish.',
    'Always a delight visiting {business}. The hospitality and top-notch standards keep me coming back.',
    'Five stars all the way for {business}! Easily one of the standout spots in the area.',
  ],
  4: [
    'Really enjoyed my visit to {business}. Overall a great experience with lots to love.',
    'Solid four-star experience at {business}. High quality offerings and a great vibe throughout.',
    'Had a very good experience at {business} today. Consistent quality and pleasant service.',
  ],
  3: [
    'Had a decent visit to {business}. Good overall, with a few areas that could be even better.',
    'Fair experience at {business}. Some positive aspects and potential for growth.',
    'Average visit to {business}. Meets expectations and has good foundation.',
  ],
  2: [
    'Sharing some honest feedback regarding my recent visit to {business}.',
    'My experience at {business} fell short of expectations on this occasion.',
    'Wanted to leave constructive notes about my visit to {business}.',
  ],
  1: [
    'Disappointed with my recent experience at {business}.',
    'Unfortunately, my recent visit to {business} did not go as hoped.',
    'Sharing my feedback for {business} regarding service and quality.',
  ],
};

export const TAG_PHRASES: Record<string, [string, string, string]> = {
  'Amazing Service': [
    'The team was incredibly attentive and took great care of us.',
    'Customer service was prompt, courteous, and very professional.',
    'Staff went above and beyond to make the counter experience seamless.',
  ],
  'Exceptional Quality': [
    'The quality of everything offered is consistently top-tier.',
    'You can immediately tell how much care goes into high-grade quality.',
    'Everything was thoughtfully crafted with noticeable attention to detail.',
  ],
  'Friendly & Welcoming': [
    'The staff greeted everyone with genuine warmth and positive energy.',
    'Felt right at home from the moment we walked in thanks to the welcoming staff.',
    'Friendly, smiling team members make such a huge difference here.',
  ],
  'Great Atmosphere': [
    'The ambience is relaxing, vibrant, and perfectly curated.',
    'Loved the inviting setting and clean aesthetic of the space.',
    'Great vibe and comfortable environment to unwind.',
  ],
  'Quick & Attentive': [
    'Service was remarkably quick without sacrificing any care.',
    'Fast turnaround and attentive staff made the whole stop effortless.',
    'Quick counter workflow that respects customers’ time.',
  ],
  'Clean & Cozy': [
    'The establishment is impeccably clean, cozy, and well-maintained.',
    'Spotless interior and a very comfortable setup all around.',
    'Appreciated how fresh, clean, and organized the space was.',
  ],
  'Highly Recommended': [
    'Can wholeheartedly recommend this place to friends, family, and colleagues.',
    'A must-visit spot if you appreciate great service and quality.',
    'Definitely one of my go-to recommendations in the neighborhood.',
  ],
};

export const COMPLIMENTS: [string[], string[], string[]] = [
  // Variant 0: Enthusiastic & Word of Mouth
  [
    'Will definitely be returning regularly and bringing friends along!',
    'Excited to visit again soon—thank you for keeping standards so high!',
    'A memorable stop that I will gladly recommend to anyone nearby.',
  ],
  // Variant 1: Warm & Appreciative of Staff
  [
    'Kudos to the hardworking team—keep up the fantastic work!',
    'Thank you to the crew for making our visit so enjoyable.',
    'Appreciate the wonderful hospitality and warm smiles.',
  ],
  // Variant 2: Direct, Punchy & Reliable
  [
    'Already looking forward to my next stop here.',
    'Consistently dependable and well worth the visit.',
    'A great local business that deserves all the praise.',
  ],
];

export const CONSTRUCTIVE_CLOSINGS: [string, string, string] = [
  'Hoping to see improvements on my next visit.',
  'Sharing in hopes that management can address these points.',
  'Appreciate the team taking feedback into account.',
];

/**
 * Generates a single review draft based on rating, selected tags, and variant index (0, 1, 2)
 */
export function generateReview({
  rating,
  tags = [],
  variant = 0,
  business,
}: ReviewOptions): string {
  const safeVariant = Math.abs(variant) % 3;
  const safeRating = Math.max(1, Math.min(5, Math.round(rating || 5)));
  const businessName =
    typeof business === 'string'
      ? business.trim() || 'this establishment'
      : business?.name?.trim() || 'this establishment';

  // 1. Opening sentence based on rating style & variant
  const styleList = RATING_STYLES[safeRating] || RATING_STYLES[5];
  const opening = styleList[safeVariant].replace('{business}', businessName);

  // 2. Incorporate sentiment tags matching the variant
  const tagSentences: string[] = [];
  if (tags && tags.length > 0) {
    tags.forEach(tag => {
      const phraseVariants = TAG_PHRASES[tag];
      if (phraseVariants) {
        tagSentences.push(phraseVariants[safeVariant]);
      } else {
        // Fallback natural sentence for custom or non-standard tags
        if (safeVariant === 0) {
          tagSentences.push(`Really appreciated the ${tag.toLowerCase()}.`);
        } else if (safeVariant === 1) {
          tagSentences.push(`The ${tag.toLowerCase()} truly stood out during our visit.`);
        } else {
          tagSentences.push(`Great experience with the ${tag.toLowerCase()}.`);
        }
      }
    });
  }

  // 3. Ending compliment or constructive closing matching the variant
  let closing = '';
  if (safeRating >= 3) {
    const complimentPool = COMPLIMENTS[safeVariant];
    closing = complimentPool[safeVariant % complimentPool.length];
  } else {
    closing = CONSTRUCTIVE_CLOSINGS[safeVariant];
  }

  // Combine into clean, cohesive review text
  const parts = [opening, ...tagSentences, closing].filter(Boolean);
  return parts.join(' ');
}

/**
 * Generates all 3 distinct review draft variations [variant 0, variant 1, variant 2]
 */
export function generateReviewDrafts({
  rating,
  tags = [],
  business,
}: ReviewDraftsOptions): [string, string, string] {
  return [
    generateReview({ rating, tags, variant: 0, business }),
    generateReview({ rating, tags, variant: 1, business }),
    generateReview({ rating, tags, variant: 2, business }),
  ];
}
