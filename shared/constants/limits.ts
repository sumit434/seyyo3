export const MIN_SPIN_SLICES = 2;
export const MAX_SPIN_SLICES = 7;

export const FIXED_SPIN_EMOJIS = ['🎁', '⭐', '🍕', '☕', '🎉', '🍰', '🏆'] as const;

export const MIN_LOYALTY_TARGET = 3;
export const MAX_LOYALTY_TARGET = 365;

export const MIN_VALIDATION_DAYS = 3;
export const MAX_VALIDATION_DAYS = 365;

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const QR_SESSION_KEY_TTL_MS = 6 * 60 * 1000; // 6 minutes
export const NFC_SESSION_KEY_TTL_MS = 3 * 60 * 1000; // 3 minutes
export const CUSTOMER_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const STAFF_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const STAFF_PIN_LENGTH = 4;
export const TOP_RANKERS_LIMIT = 5;

export const SEYO_PALETTE = {
  background: '#f1f3f2',
  ink: '#10181c',
  muted: '#6a787e',
  line: '#e2e7e6',
  brand: '#0e7c66',
  brandDark: '#0a6252',
  brandSoft: '#e2f1ec',
  accent: '#f59e0b',
  error: '#ef4444',
  success: '#10b981',
};
