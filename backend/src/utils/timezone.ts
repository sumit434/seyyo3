/**
 * Timezone utilities for merchant-authoritative midnight calculations
 */

export function getMerchantLocalDateString(dateInput: Date | string = new Date(), timezone: string = 'UTC'): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    // Format YYYY-MM-DD in the specific IANA timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch (err) {
    // Fallback to UTC if timezone is invalid
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return d.toISOString().split('T')[0];
  }
}

/**
 * Check if two dates fall on the same merchant-local calendar day
 */
export function isSameMerchantDay(
  dateA: Date | string | undefined,
  dateB: Date | string | undefined,
  timezone: string
): boolean {
  if (!dateA || !dateB) return false;
  const strA = getMerchantLocalDateString(dateA, timezone);
  const strB = getMerchantLocalDateString(dateB, timezone);
  return strA === strB;
}

/**
 * Calculate difference in calendar days between two dates in merchant timezone
 */
export function getMerchantDaysDifference(
  startDateInput: Date | string,
  endDateInput: Date | string = new Date(),
  timezone: string
): number {
  const startStr = getMerchantLocalDateString(startDateInput, timezone);
  const endStr = getMerchantLocalDateString(endDateInput, timezone);

  const startMidnight = new Date(`${startStr}T00:00:00Z`).getTime();
  const endMidnight = new Date(`${endStr}T00:00:00Z`).getTime();

  const diffMs = endMidnight - startMidnight;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Determine if current visit is within validationDays window
 */
export function isWithinValidationWindow(
  cycleStartDate: Date | string | undefined,
  currentDate: Date | string = new Date(),
  validationDays: number,
  timezone: string
): boolean {
  if (!cycleStartDate) return true;
  const daysDiff = getMerchantDaysDifference(cycleStartDate, currentDate, timezone);
  return daysDiff <= validationDays;
}
