/**
 * A small red circular badge showing an unread count.
 * Renders nothing when count is 0.
 *
 * Previously duplicated in ClientProjectDetail, DesignerProjectDetail,
 * and ProjectDetail. Import from here instead.
 */
export default function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">
      {count}
    </span>
  );
}
