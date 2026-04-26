/**
 * Shared formatting utilities.
 */

// ─── Currency ────────────────────────────────────────────────────────────────

/** Formats a numeric value as Tunisian Dinar with fr-TN locale separators.
 *  e.g. 15000 → "15 000,00 TND"
 */
export const formatTND = (value: number): string =>
  `${value.toLocaleString('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TND`;

/**
 * Formats an effective hourly rate (TND per hour).
 * Keeps two decimal places so precision isn't lost in manager analytics.
 * e.g. 87.5 → "87,50 TND/h"
 */
export const formatEHR = (value: number): string =>
  `${value.toLocaleString('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TND/h`;

// ─── Strings ─────────────────────────────────────────────────────────────────

/**
 * Returns up to two uppercase initials from a full name.
 * "Sarah Chen" → "SC",  "Alice" → "A"
 */
export const Initials = (name: string): string =>
  name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();