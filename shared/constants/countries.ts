export interface CountryConfig {
  code: string;
  name: string;
  dialCode: string;
  flagEmoji: string;
  defaultTimezone: string;
  timezones: string[];
  phoneLength: number;
}

export const ALLOWED_COUNTRIES: CountryConfig[] = [
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flagEmoji: '🇺🇸',
    defaultTimezone: 'America/New_York',
    timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'],
    phoneLength: 10,
  },
  {
    code: 'CN',
    name: 'China',
    dialCode: '+86',
    flagEmoji: '🇨🇳',
    defaultTimezone: 'Asia/Shanghai',
    timezones: ['Asia/Shanghai', 'Asia/Urumqi'],
    phoneLength: 11,
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    flagEmoji: '🇩🇪',
    defaultTimezone: 'Europe/Berlin',
    timezones: ['Europe/Berlin'],
    phoneLength: 10,
  },
  {
    code: 'JP',
    name: 'Japan',
    dialCode: '+81',
    flagEmoji: '🇯🇵',
    defaultTimezone: 'Asia/Tokyo',
    timezones: ['Asia/Tokyo'],
    phoneLength: 10,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flagEmoji: '🇬🇧',
    defaultTimezone: 'Europe/London',
    timezones: ['Europe/London'],
    phoneLength: 10,
  },
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    flagEmoji: '🇮🇳',
    defaultTimezone: 'Asia/Kolkata',
    timezones: ['Asia/Kolkata'],
    phoneLength: 10,
  },
  {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    flagEmoji: '🇫🇷',
    defaultTimezone: 'Europe/Paris',
    timezones: ['Europe/Paris'],
    phoneLength: 9,
  },
  {
    code: 'IT',
    name: 'Italy',
    dialCode: '+39',
    flagEmoji: '🇮🇹',
    defaultTimezone: 'Europe/Rome',
    timezones: ['Europe/Rome'],
    phoneLength: 10,
  },
  {
    code: 'RU',
    name: 'Russia',
    dialCode: '+7',
    flagEmoji: '🇷🇺',
    defaultTimezone: 'Europe/Moscow',
    timezones: ['Europe/Moscow', 'Asia/Yekaterinburg', 'Asia/Novosibirsk', 'Asia/Vladivostok'],
    phoneLength: 10,
  },
  {
    code: 'BR',
    name: 'Brazil',
    dialCode: '+55',
    flagEmoji: '🇧🇷',
    defaultTimezone: 'America/Sao_Paulo',
    timezones: ['America/Sao_Paulo', 'America/Manaus', 'America/Belem'],
    phoneLength: 11,
  },
];

export const ALLOWED_COUNTRY_NAMES = ALLOWED_COUNTRIES.map(c => c.name);

export interface CountryPhoneConstraint {
  dialCode: string;
  code: string;
  minLength: number;
  maxLength: number;
  regex: RegExp;
}

export const COUNTRY_PHONE_CONSTRAINTS: Record<string, CountryPhoneConstraint> = {
  '+91': {
    dialCode: '+91',
    code: 'IN',
    minLength: 10,
    maxLength: 10,
    regex: /^[6-9]\d{9}$/,
  },
  '+1': {
    dialCode: '+1',
    code: 'US',
    minLength: 10,
    maxLength: 10,
    regex: /^[2-9]\d{2}[2-9]\d{6}$/,
  },
  '+44': {
    dialCode: '+44',
    code: 'GB',
    minLength: 10,
    maxLength: 10,
    regex: /^7\d{9}$/,
  },
  '+86': {
    dialCode: '+86',
    code: 'CN',
    minLength: 11,
    maxLength: 11,
    regex: /^1[3-9]\d{9}$/,
  },
  '+49': {
    dialCode: '+49',
    code: 'DE',
    minLength: 10,
    maxLength: 11,
    regex: /^1[5-7]\d{7,9}$/,
  },
  '+81': {
    dialCode: '+81',
    code: 'JP',
    minLength: 10,
    maxLength: 10,
    regex: /^[789]0\d{8}$/,
  },
  '+33': {
    dialCode: '+33',
    code: 'FR',
    minLength: 9,
    maxLength: 9,
    regex: /^[67]\d{8}$/,
  },
  '+39': {
    dialCode: '+39',
    code: 'IT',
    minLength: 10,
    maxLength: 10,
    regex: /^3\d{9}$/,
  },
  '+7': {
    dialCode: '+7',
    code: 'RU',
    minLength: 10,
    maxLength: 10,
    regex: /^9\d{9}$/,
  },
  '+55': {
    dialCode: '+55',
    code: 'BR',
    minLength: 11,
    maxLength: 11,
    regex: /^[1-9]{2}9\d{8}$/,
  },
};

export function getCountryPhoneLength(dialCodeOrCode: string): number {
  if (!dialCodeOrCode) return 10;
  const clean = dialCodeOrCode.trim();
  const found = ALLOWED_COUNTRIES.find(
    c => c.dialCode === clean || c.code.toLowerCase() === clean.toLowerCase() || clean.startsWith(c.dialCode)
  );
  return found?.phoneLength || 10;
}

export function getCountryPhoneConstraint(dialCodeOrCode: string): CountryPhoneConstraint {
  if (!dialCodeOrCode) return COUNTRY_PHONE_CONSTRAINTS['+91'];
  const clean = dialCodeOrCode.trim();
  if (COUNTRY_PHONE_CONSTRAINTS[clean]) {
    return COUNTRY_PHONE_CONSTRAINTS[clean];
  }
  const found = ALLOWED_COUNTRIES.find(
    c => c.dialCode === clean || c.code.toLowerCase() === clean.toLowerCase() || clean.startsWith(c.dialCode)
  );
  if (found && COUNTRY_PHONE_CONSTRAINTS[found.dialCode]) {
    return COUNTRY_PHONE_CONSTRAINTS[found.dialCode];
  }
  const phoneLen = found?.phoneLength || 10;
  return {
    dialCode: found?.dialCode || '+91',
    code: found?.code || 'IN',
    minLength: phoneLen,
    maxLength: phoneLen,
    regex: new RegExp(`^\\d{${phoneLen}}$`),
  };
}

/**
 * Centralized country code detector.
 * Priority 1: Check merchantCountry (IN/+91, US/+1, UK/+44, etc.)
 * Priority 2: Inspect Intl.DateTimeFormat().resolvedOptions().timeZone (e.g., Asia/Kolkata, Asia/Calcutta -> +91)
 * Priority 3: Fall back safely to +91 instead of +1
 */
export function detectDefaultCountryCode(merchantCountry?: string): string {
  // Priority 1: Check merchantCountry
  if (merchantCountry) {
    const clean = merchantCountry.trim().toUpperCase();
    if (clean === 'IN' || clean === '+91' || clean === '91' || clean === 'IND' || clean === 'INDIA') {
      return '+91';
    }
    if (
      clean === 'US' ||
      clean === '+1' ||
      clean === '1' ||
      clean === 'USA' ||
      clean === 'CA' ||
      clean === 'CAN' ||
      clean === 'CANADA' ||
      clean === 'UNITED STATES'
    ) {
      return '+1';
    }
    if (clean === 'UK' || clean === 'GB' || clean === '+44' || clean === '44' || clean === 'UNITED KINGDOM') {
      return '+44';
    }
    const matched = ALLOWED_COUNTRIES.find(
      c => c.code === clean || c.dialCode === clean || `+${clean}` === c.dialCode || c.name.toUpperCase() === clean
    );
    if (matched) return matched.dialCode;
  }

  // Priority 2: Inspect Intl.DateTimeFormat().resolvedOptions().timeZone
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        if (
          tz === 'Asia/Kolkata' ||
          tz === 'Asia/Calcutta' ||
          tz.startsWith('Asia/Kolkata') ||
          tz.startsWith('Asia/Calcutta')
        ) {
          return '+91';
        }
        if (
          tz.startsWith('America/') ||
          tz === 'US/Eastern' ||
          tz === 'US/Central' ||
          tz === 'US/Mountain' ||
          tz === 'US/Pacific'
        ) {
          return '+1';
        }
        if (tz.startsWith('Europe/London') || tz === 'Europe/Belfast') {
          return '+44';
        }
        const tzMatch = ALLOWED_COUNTRIES.find(
          c => c.timezones.includes(tz) || c.defaultTimezone === tz
        );
        if (tzMatch) return tzMatch.dialCode;
      }
    }
  } catch {
    // Ignore timezone detection errors
  }

  // Priority 3: Safe fallback to +91 instead of +1
  return '+91';
}