/**
 * Date formatting utilities for consistent date display across the app
 */

/**
 * Common date format options
 */
export const DATE_FORMATS = {
  /** Display format: "Jan 15, 2025" */
  display: { month: "short", day: "numeric", year: "numeric" },
  /** Long display: "January 15, 2025" */
  displayLong: { month: "long", day: "numeric", year: "numeric" },
  /** Short format: "1/15/25" */
  short: { month: "numeric", day: "numeric", year: "2-digit" },
  /** Month and day: "Jan 15" */
  monthDay: { month: "short", day: "numeric" },
  /** Month and year: "January 2025" */
  monthYear: { month: "long", year: "numeric" },
  /** Time only: "2:30 PM" */
  time: { hour: "numeric", minute: "2-digit", hour12: true },
  /** Date with time: "Jan 15, 2025 2:30 PM" */
  dateTime: {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  },
  /** Relative weekday: "Monday, Jan 15" */
  weekday: { weekday: "long", month: "short", day: "numeric" },
} as const;

type DateFormatKey = keyof typeof DATE_FORMATS;

/**
 * Format a date using predefined formats
 *
 * @param date - Date to format (Date object, string, or timestamp)
 * @param format - Format key from DATE_FORMATS
 * @param locale - Locale for formatting (default: "en-US")
 *
 * @example
 * ```ts
 * formatDate("2025-01-15", "display") // "Jan 15, 2025"
 * formatDate(new Date(), "time") // "2:30 PM"
 * formatDate("2025-01-15T14:30:00", "dateTime") // "Jan 15, 2025 2:30 PM"
 * ```
 */
export function formatDate(
  date: Date | string | number,
  format: DateFormatKey = "display",
  locale: string = "en-US"
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    locale,
    DATE_FORMATS[format] as Intl.DateTimeFormatOptions
  ).format(dateObj);
}

/**
 * Format a date as ISO string (YYYY-MM-DD) for API calls
 *
 * @example
 * ```ts
 * formatDateISO(new Date()) // "2025-01-15"
 * ```
 */
export function formatDateISO(date: Date | string | number): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString().split("T")[0];
}

/**
 * Get relative time description (e.g., "2 days ago", "in 3 hours")
 *
 * @example
 * ```ts
 * getRelativeTime(yesterday) // "1 day ago"
 * getRelativeTime(tomorrow) // "in 1 day"
 * ```
 */
export function getRelativeTime(
  date: Date | string | number,
  locale: string = "en-US"
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((dateObj.getTime() - now.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  // Calculate the appropriate unit
  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "week", seconds: 604800 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 },
  ];

  for (const { unit, seconds } of units) {
    if (Math.abs(diffInSeconds) >= seconds || unit === "second") {
      const value = Math.round(diffInSeconds / seconds);
      return rtf.format(value, unit);
    }
  }

  return "just now";
}

/**
 * Get days remaining until a target date
 *
 * @returns Number of days (positive = future, negative = past)
 *
 * @example
 * ```ts
 * getDaysRemaining("2025-12-31") // 350 (if today is mid-Feb)
 * ```
 */
export function getDaysRemaining(targetDate: Date | string | number): number {
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get days remaining in the current month
 *
 * @example
 * ```ts
 * getDaysRemainingInMonth() // 16 (if it's Jan 15 of a 31-day month)
 * ```
 */
export function getDaysRemainingInMonth(): number {
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return lastDayOfMonth.getDate() - today.getDate();
}

/**
 * Get the start of the current month
 *
 * @example
 * ```ts
 * getStartOfMonth() // Date object for the 1st of current month at midnight
 * ```
 */
export function getStartOfMonth(): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Get the end of the current month
 */
export function getEndOfMonth(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: Date | string | number): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.getTime() < Date.now();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string | number): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Get a date N days ago
 *
 * @example
 * ```ts
 * getDaysAgo(30) // Date 30 days in the past
 * ```
 */
export function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Get a date N days from now
 */
export function getDaysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
