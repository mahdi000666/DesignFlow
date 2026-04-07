import type { TimeLog } from '../types/timelog';

interface Props {
  logs:      TimeLog[];
  isManager: boolean;
  onDelete?: (id: number) => void;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function TimeLogList({ logs, isManager, onDelete }: Props) {
  if (!logs.length) {
    return (
      <p className="font-sans text-[13px] text-ink3 py-4">No time logged yet.</p>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface2 border-b border-border">
            {['Date', 'Designer', 'Task', 'Hours', 'Description'].map(h => (
              <th
                key={h}
                className="px-4 py-3 text-left font-sans text-[11px] font-semibold uppercase tracking-[0.5px] text-ink3"
              >
                {h}
              </th>
            ))}
            {isManager && <th className="px-4 py-3 w-16" />}
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-b border-border last:border-b-0 hover:bg-bg transition-colors">
              <td className="px-4 py-[14px] font-sans text-[13px] text-ink whitespace-nowrap">
                {fmt(log.created_at)}
              </td>
              {/* Designer shown for manager; for designer view this column still renders
                  but the isManager guard in the header keeps columns aligned */}
              <td className="px-4 py-[14px] font-sans text-[13px] text-ink">
                {log.designer_name}
              </td>
              <td className="px-4 py-[14px] font-sans text-[13px] text-ink">
                {log.task_name}
              </td>
              <td className="px-4 py-[14px] font-mono text-[13px] text-ink whitespace-nowrap">
                {Number(log.hours_spent).toFixed(1)}h
              </td>
              <td className="px-4 py-[14px] font-sans text-[13px] text-ink3 max-w-xs truncate">
                {log.description || '—'}
              </td>
              {isManager && (
                <td className="px-4 py-[14px] text-right">
                  <button
                    onClick={() => onDelete?.(log.id)}
                    className="font-sans text-[11px] text-danger/70 hover:text-danger transition-colors"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}