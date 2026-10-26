import {
  getCountryPhoneLength,
  detectDefaultCountryCode,
  COUNTRY_PHONE_CONSTRAINTS,
  getCountryPhoneConstraint,
} from '../constants/countries';
import type { CountryPhoneConstraint } from '../constants/countries';

export {
  detectDefaultCountryCode,
  COUNTRY_PHONE_CONSTRAINTS,
  getCountryPhoneConstraint,
  getCountryPhoneLength,
};
export type { CountryPhoneConstraint };

/**
 * Canonical E.164 phone normalizer
 * Normalizes any phone number into canonical E.164 string format (e.g., '+919876543210')
 */
export function normalizeCanonicalPhone(
  phone: string | null | undefined,
  defaultCountryCode = '+91'
): string {
  if (!phone) return '';
  const str = String(phone).trim();
  if (!str) return '';

  const cleanPrefix = defaultCountryCode.startsWith('+')
    ? defaultCountryCode
    : `+${defaultCountryCode.replace(/\D/g, '')}`;
  const prefixDigits = cleanPrefix.replace(/\D/g, '');

  if (str.startsWith('+')) {
    const digits = str.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  const digits = str.replace(/\D/g, '');
  if (!digits) return '';

  if (prefixDigits && digits.startsWith(prefixDigits) && digits.length > prefixDigits.length) {
    return `+${digits}`;
  }

  return `${cleanPrefix}${digits}`;
}

/**
 * Strict Country Phone Validator
 * Validates raw digits against CountryPhoneConstraint minLength, maxLength, and regex.
 */
export function isValidCountryPhoneNumber(
  phone: string | null | undefined,
  countryCode?: string
): boolean {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return false;

  // Anti-spam checks: reject all-identical digits (0000000000, 1111111111, 9999999999, etc.)
  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  // Reject sequential dummies
  if (
    digits === '1234567890' ||
    digits === '0123456789' ||
    digits === '9876543210'
  ) {
    return false;
  }

  const constraint = getCountryPhoneConstraint(countryCode || '+91');
  if (!constraint) {
    return digits.length >= 8 && digits.length <= 15;
  }

  // Enforce min and max length
  if (digits.length < constraint.minLength || digits.length > constraint.maxLength) {
    return false;
  }

  // Enforce country-specific regex
  return constraint.regex.test(digits);
}

/**
 * Strict WhatsApp phone number validator.
 */
export function isValidWhatsAppNumber(
  phone: string | null | undefined,
  countryCode?: string
): boolean {
  if (!phone) return false;

  const rawStr = String(phone).trim();
  if (!rawStr) return false;

  if (rawStr.includes('*') || /x/i.test(rawStr)) {
    return false;
  }

  const rawDigits = rawStr.replace(/\D/g, '');
  if (!rawDigits) return false;

  if (/^(\d)\1+$/.test(rawDigits)) {
    return false;
  }

  if (
    rawDigits === '1234567890' ||
    rawDigits === '0123456789' ||
    rawDigits === '9876543210'
  ) {
    return false;
  }

  const normalizedCountry = (countryCode || '').trim().toUpperCase();

  const isExplicitIndiaCode =
    normalizedCountry === '+91' ||
    normalizedCountry === '91' ||
    normalizedCountry === 'IN' ||
    normalizedCountry === 'IND' ||
    normalizedCountry === 'INDIA';

  const isExplicitUSCode =
    normalizedCountry === '+1' ||
    normalizedCountry === '1' ||
    normalizedCountry === 'US' ||
    normalizedCountry === 'USA' ||
    normalizedCountry === 'UNITED STATES' ||
    normalizedCountry === 'CA' ||
    normalizedCountry === 'CAN' ||
    normalizedCountry === 'CANADA';

  const isExplicitUKCode =
    normalizedCountry === '+44' ||
    normalizedCountry === '44' ||
    normalizedCountry === 'GB' ||
    normalizedCountry === 'UK' ||
    normalizedCountry === 'UNITED KINGDOM';

  const hasPlusPrefix = rawStr.startsWith('+');
  const hasIndiaPrefix =
    rawStr.startsWith('+91') ||
    (rawDigits.length === 12 && rawDigits.startsWith('91'));
  const hasUSPrefix =
    rawStr.startsWith('+1') ||
    (rawDigits.length === 11 && rawDigits.startsWith('1'));
  const hasUKPrefix =
    rawStr.startsWith('+44') ||
    (rawDigits.length === 12 && rawDigits.startsWith('44'));

  if (hasIndiaPrefix) {
    let indDigits = rawDigits;
    if (indDigits.length === 12 && indDigits.startsWith('91')) {
      indDigits = indDigits.slice(2);
    }
    return /^[6-9]\d{9}$/.test(indDigits);
  }

  if (hasUSPrefix) {
    let usDigits = rawDigits;
    if (usDigits.length === 11 && usDigits.startsWith('1')) {
      usDigits = usDigits.slice(1);
    }
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(usDigits)) {
      return false;
    }
    if (usDigits.slice(3, 6) === '555') {
      return false;
    }
    return true;
  }

  if (hasUKPrefix) {
    let ukDigits = rawDigits;
    if (ukDigits.length === 12 && ukDigits.startsWith('44')) {
      ukDigits = ukDigits.slice(2);
    }
    return /^7\d{9}$/.test(ukDigits);
  }

  if (rawDigits.length === 10) {
    const isIndiaMobileFormat = /^[6-9]\d{9}$/.test(rawDigits);
    const isUsNanpFormat =
      /^[2-9]\d{2}[2-9]\d{6}$/.test(rawDigits) && rawDigits.slice(3, 6) !== '555';
    const isUkMobileFormat = /^7\d{9}$/.test(rawDigits);

    if (isExplicitIndiaCode) {
      return isIndiaMobileFormat || isUsNanpFormat;
    }

    if (isExplicitUSCode) {
      return isUsNanpFormat || isIndiaMobileFormat;
    }

    if (isExplicitUKCode) {
      return isUkMobileFormat || isIndiaMobileFormat || isUsNanpFormat;
    }

    return isIndiaMobileFormat || isUsNanpFormat || isUkMobileFormat;
  }

  if (rawDigits.length === 11) {
    if (rawDigits.startsWith('1')) {
      const usDigits = rawDigits.slice(1);
      return /^[2-9]\d{2}[2-9]\d{6}$/.test(usDigits) && usDigits.slice(3, 6) !== '555';
    }
    if (rawDigits.startsWith('0')) {
      const localDigits = rawDigits.slice(1);
      return /^[6-9]\d{9}$/.test(localDigits) || /^7\d{9}$/.test(localDigits);
    }
  }

  if (hasPlusPrefix) {
    return rawDigits.length >= 8 && rawDigits.length <= 15;
  }

  return rawDigits.length >= 8 && rawDigits.length <= 15;
}

/**
 * Formats a phone number for WhatsApp links without symbols.
 */
export function formatWhatsAppPhone(
  phone: string | null | undefined,
  countryCode?: string
): string {
  if (!phone) return '';
  const rawStr = String(phone).trim();
  const digits = rawStr.replace(/\D/g, '');
  if (!digits) return '';

  const normalizedCountry = (countryCode || '').trim().toUpperCase();

  const isIndia =
    rawStr.startsWith('+91') ||
    (digits.length === 12 && digits.startsWith('91')) ||
    normalizedCountry === '+91' ||
    normalizedCountry === '91' ||
    normalizedCountry === 'IN' ||
    normalizedCountry === 'INDIA';

  const isUS =
    rawStr.startsWith('+1') ||
    (digits.length === 11 && digits.startsWith('1')) ||
    normalizedCountry === '+1' ||
    normalizedCountry === '1' ||
    normalizedCountry === 'US' ||
    normalizedCountry === 'USA' ||
    normalizedCountry === 'UNITED STATES' ||
    normalizedCountry === 'CA' ||
    normalizedCountry === 'CANADA';

  const isUK =
    rawStr.startsWith('+44') ||
    (digits.length === 12 && digits.startsWith('44')) ||
    normalizedCountry === '+44' ||
    normalizedCountry === '44' ||
    normalizedCountry === 'GB' ||
    normalizedCountry === 'UK' ||
    normalizedCountry === 'UNITED KINGDOM';

  if (rawStr.startsWith('+')) {
    return digits;
  }

  if (digits.length === 10) {
    if (isUS && !isIndia) return `1${digits}`;
    if (isIndia && !isUS) return `91${digits}`;
    if (isUK) return `44${digits}`;
    if (/^[6-9]/.test(digits)) return `91${digits}`;
    if (/^[2-9]/.test(digits)) return `1${digits}`;
    return `91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) return digits;
  if (digits.length === 12 && (digits.startsWith('91') || digits.startsWith('44'))) return digits;

  return digits;
}