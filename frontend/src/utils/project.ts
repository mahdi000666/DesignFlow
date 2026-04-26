/**
 * Shared display constants and helpers for Project entities.
 *
 * Import from here instead of redefining locally.  All pages that previously
 * defined STATUS_BADGE, STATUS_DOT, barColor, or CATEGORY_COLORS should be
 * updated to import these exports.
 */

import type { Project } from '../types/project';

// ─── Status badge Tailwind classes ───────────────────────────────────────────
// Standardised on amber for OnHold (removed the erroneous violet variant that
// appeared in manager-only pages).

export const STATUS_BADGE: Record<Project['status'], string> = {
  Active:    'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  OnHold:    'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
};

export const STATUS_DOT: Record<Project['status'], string> = {
  Active:    'bg-blue-500',
  Completed: 'bg-emerald-500',
  OnHold:    'bg-amber-500',
};

// Human-readable label (converts 'OnHold' → 'On Hold').
export const statusLabel = (status: Project['status']): string =>
  status === 'OnHold' ? 'On Hold' : status;

// ─── Budget bar colour ───────────────────────────────────────────────────────
// Standardised on teal for healthy (<80 %), amber for warning (80-99 %),
// red for over-budget (≥100 %).
// Previously, manager list / dashboard used teal while detail pages used blue;
// teal is the correct semantic choice (green ≈ healthy).

export const barColor = (pct: number): string =>
  pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#0d9488';

// ─── Category colour map ─────────────────────────────────────────────────────
// Named map used in project detail pages.
// For list pages that cycle colours by index, derive the palette from this map
// or use CATEGORY_PALETTE below.

export const CATEGORY_COLORS: Record<string, string> = {
  Branding:  'text-purple-700 bg-purple-50',
  UX:        'text-blue-700 bg-blue-50',
  Motion:    'text-orange-700 bg-orange-50',
  Editorial: 'text-pink-700 bg-pink-50',
  Web:       'text-cyan-700 bg-cyan-50',
};

// Fallback class when the category isn't in the map above.
export const CATEGORY_FALLBACK = 'text-slate-600 bg-slate-100';

/** Returns the Tailwind class string for a given category (with fallback). */
export const categoryClass = (category: string | null | undefined): string =>
  (category && CATEGORY_COLORS[category]) ? CATEGORY_COLORS[category] : CATEGORY_FALLBACK;

// Ordered palette used by list/dashboard pages that assign colours to arbitrary
// category strings by index.
export const CATEGORY_PALETTE: string[] = [
  'bg-purple-50 text-purple-700',
  'bg-blue-50 text-blue-700',
  'bg-orange-50 text-orange-700',
  'bg-pink-50 text-pink-700',
  'bg-cyan-50 text-cyan-700',
  'bg-rose-50 text-rose-700',
];