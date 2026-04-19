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

  const [lastRead, setLastRead] = useState<Date>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? new Date(stored) : new Date(0);
  });

  const count = items.filter(item => {
    const ts = item.created_at ?? item.submitted_at ?? item.uploaded_at;
    return ts ? new Date(ts) > lastRead : false;
  }).length;

  const markRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(storageKey, now);
    setLastRead(new Date(now));
  // storageKey is derived from stable primitives — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, key, userId]);

  return { count, markRead };
}