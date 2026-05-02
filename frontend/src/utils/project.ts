/**
 * Shared display constants and helpers for Project entities.
 *
 * Import from here instead of redefining locally.  All pages that previously
 * defined STATUS_BADGE, STATUS_DOT, barColor, or CATEGORY_COLORS should be
 * updated to import these exports.
 */

import type { Project } from '../types/project';

// ─── Status badge Tailwind classes ───────────────────────────────────────────
// Standardised on primary (indigo) for Active to match DesignFlow theme.

export const STATUS_BADGE: Record<Project['status'], string> = {
  Active:    'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200',
  Completed: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
  OnHold:    'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
};

export const STATUS_DOT: Record<Project['status'], string> = {
  Active:    'bg-primary',
  Completed: 'bg-green-500',
  OnHold:    'bg-amber-500',
};

// Human-readable label (converts 'OnHold' → 'On Hold').
export const statusLabel = (status: Project['status']): string =>
  status === 'OnHold' ? 'On Hold' : status;

// ─── Budget bar colour ───────────────────────────────────────────────────────
// Standardised on primary for healthy (<80 %), amber for warning (80-99 %),
// red for over-budget (≥100 %).

export const barColor = (pct: number): string =>
  pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#6366f1';

// ─── Category colour map ─────────────────────────────────────────────────────
// ─── Deterministic colour palette ───────────────────────────────────────────
const PALETTE = [
  'text-purple-700 bg-purple-50',
  'text-blue-700 bg-blue-50',
  'text-orange-700 bg-orange-50',
  'text-pink-700 bg-pink-50',
  'text-cyan-700 bg-cyan-50',
  'text-red-700 bg-red-50',
  'text-indigo-700 bg-indigo-50',
  'text-amber-700 bg-amber-50',
  'text-lime-700 bg-lime-50',
  'text-rose-700 bg-rose-50',
  'text-sky-700 bg-sky-50',
];

/** Simple string hash → stable index into the palette. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/** Returns a stable Tailwind class string for any category name. */
export function categoryClass(category: string | null | undefined): string {
  if (!category) return 'text-slate-600 bg-slate-100';
  const idx = hashString(category) % PALETTE.length;
  return PALETTE[idx];
}
