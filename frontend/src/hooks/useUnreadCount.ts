import { useState, useCallback } from 'react';

/**
 * Tracks "unread" items client-side by storing a last-read ISO timestamp
 * in localStorage per project per tab key.
 *
 * Items are considered unread if their timestamp field is newer than the
 * stored last-read value. Calling markRead() updates the timestamp to now.
 */
export function useUnreadCount(
  items: Array<{ created_at?: string; submitted_at?: string }>,
  projectId: number,
  key: string,
) {
  const storageKey = `lastRead_${key}_${projectId}`;

  const [lastRead, setLastRead] = useState<Date>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? new Date(stored) : new Date(0);
  });

  const count = items.filter(item => {
    const ts = item.created_at ?? item.submitted_at;
    return ts ? new Date(ts) > lastRead : false;
  }).length;

  const markRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(storageKey, now);
    setLastRead(new Date(now));
  // storageKey is derived from stable primitives — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, key]);

  return { count, markRead };
}