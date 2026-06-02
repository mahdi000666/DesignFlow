import { useState, useCallback } from 'react';

/**
 * Tracks "unread" items client-side by storing a last-read ISO timestamp
 * in localStorage, keyed per user per project per tab.
 *
 * Including userId in the key prevents one user marking items as read
 * from clearing the badge for other users on the same browser.
 */
export function useUnreadCount(
  items: Array<{ created_at?: string; submitted_at?: string; uploaded_at?: string }>,
  projectId: number,
  key: string,
  userId: number | string,
) {
  const storageKey = `lastRead_${userId}_${key}_${projectId}`;

  // Initialize from localStorage (or epoch 0 if never read).
  const [lastRead, setLastRead] = useState<Date>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? new Date(stored) : new Date(0); // Convert to string or use Unix epoch so everything is shown unread.
  });

  // Count how many items are newer than the stored timestamp.
  const count = items.filter(item => {
    const ts = item.created_at ?? item.submitted_at ?? item.uploaded_at;
    return ts ? new Date(ts) > lastRead : false;
  }).length;

  // markRead = write current time to localStorage + update state.
  const markRead = useCallback(() => { // useCallback prevents the func from being recreated every render.
    const now = new Date().toISOString(); // ISO is universal standard for timestamps.
    localStorage.setItem(storageKey, now);
    // Update the lastRead.
    setLastRead(new Date(now));
  // storageKey is derived from stable primitives — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, key, userId]);

  return { count, markRead };
}