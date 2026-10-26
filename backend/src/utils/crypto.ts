import crypto from 'crypto';

/**
 * Generate a cryptographically secure hex token
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Compute SHA-256 hash of a string (e.g. for magic tokens)
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Hash a password with salt using PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a salt:hash string
 */
export function verifyPassword(password: string, combined: string): boolean {
  try {
    const [salt, originalHash] = combined.split(':');
    if (!salt || !originalHash) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

const PIN_KEY = crypto.createHash('sha256').update(process.env.APP_SECRET || 'seyo_secure_pin_secret_key_2026').digest();

/**
 * Encrypt a 4-digit PIN with AES-256-GCM
 */
export function encryptPin(pin: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', PIN_KEY, iv);
  let encrypted = cipher.update(pin, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a 4-digit PIN with AES-256-GCM
 */
export function decryptPin(encryptedCombined: string): string | null {
  try {
    const [ivHex, tagHex, encrypted] = encryptedCombined.split(':');
    if (!ivHex || !tagHex || !encrypted) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', PIN_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Hash a 4-digit staff PIN using PBKDF2 salt + secure reversible ciphertext
 * Format: `${salt}:${hash}:${iv}:${tag}:${ciphertext}`
 */
export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 10000, 32, 'sha256').toString('hex');
  const encrypted = encryptPin(pin);
  return `${salt}:${hash}:${encrypted}`;
}

/**
 * Verify a 4-digit staff PIN
 */
export function verifyPin(pin: string, combined: string): boolean {
  try {
    const parts = combined.split(':');
    const salt = parts[0];
    const originalHash = parts[1];
    if (!salt || !originalHash) return false;
    const testHash = crypto.pbkdf2Sync(pin, salt, 10000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Extract configured PIN for authorized staff terminal display
 */
export function extractConfiguredPin(combined: string): string | null {
  try {
    const parts = combined.split(':');
    // If format is salt:hash:iv:tag:ciphertext (5 parts)
    if (parts.length >= 5) {
      const encryptedPart = `${parts[2]}:${parts[3]}:${parts[4]}`;
      const decrypted = decryptPin(encryptedPart);
      if (decrypted && /^\d{4}$/.test(decrypted)) {
        return decrypted;
      }
    }
    // Fallback for demo seed PIN 7788
    if (verifyPin('7788', combined)) {
      return '7788';
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cryptographically secure random integer in range [min, max)
 */
export function secureRandomInt(min: number, max: number): number {
  return crypto.randomInt(min, max);
}

/**
 * Cryptographically secure weighted selection for Spin Wheel
 * Total weights must sum to 100
 */
export function selectWeightedReward<T extends { weight: number }>(items: T[]): T {
  if (!items || items.length === 0) {
    throw new Error('Cannot select from empty item list');
  }

  const roll = crypto.randomInt(0, 100); // 0 to 99
  let accumulated = 0;

  for (const item of items) {
    accumulated += item.weight;
    if (roll < accumulated) {
      return item;
    }
  }

  // Fallback to last item in rare floating point rounding edge
  return items[items.length - 1];
}

/**
 * Generate a 6-character alphanumeric voucher code (e.g. 'SY-7X9K')
 */
export function generateVoucherCode(prefix: string = 'SY'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous 0,1,I,O
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return `${prefix}-${code}`;
}

/**
 * Mask mobile number: e.g. "+1 (555) 123-4567" -> "******4567"
 */
export function maskMobile(mobile: string): string {
  const cleaned = mobile.replace(/\D/g, '');
  if (cleaned.length <= 4) return '****' + cleaned;
  const last4 = cleaned.slice(-4);
  return '******' + last4;
}

/**
 * Normalize phone number to digits and leading plus: e.g. "+1 (555) 123-4567" -> "+15551234567"
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

