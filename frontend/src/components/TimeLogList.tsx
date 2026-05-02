import { useState } from 'react';
import type { TimeLog, TimeLogPayload } from '../types/timelog';
import { DataTable, EmptyState } from './Ui';

interface Props {
  logs:       TimeLog[];
  isManager:  boolean;
  currentUserId?: number;
  onDelete?:  (id: number) => void;
  onUpdate?:  (id: number, payload: Partial<TimeLogPayload>) => void;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const inputCls = 'px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors bg-white w-full';

export default function TimeLogList({ logs, isManager, currentUserId, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editDesc,  setEditDesc]  = useState('');

  const startEdit = (log: TimeLog) => {
    setEditingId(log.id);
    setEditHours(String(log.hours_spent));
    setEditDesc(log.description ?? '');
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (id: number) => {
    onUpdate?.(id, {
      hours_spent: parseFloat(editHours),
      description: editDesc,
    });
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    if (!confirm('Delete this time log? This cannot be undone.')) return;
    onDelete?.(id);
  };

  if (!logs.length) {
    return <EmptyState message="No time logged yet." />;
  }

  return (
    <DataTable>
      <thead>
        <tr>
          {['Date', 'Designer', 'Task', 'Hours', 'Description'].map(h => (
            <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {h}
            </th>
          ))}
          <th className="px-5 py-3 w-24" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {logs.map(log => {
          const isEditing = editingId === log.id;
          return (
            <tr key={log.id} className={`transition-colors ${isEditing ? 'bg-amber-50/40' : 'group hover:bg-slate-50/80'}`}>
              <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap align-middle font-medium">
                {fmt(log.created_at)}
              </td>
              <td className="px-5 py-3.5 text-sm font-bold text-slate-900 align-middle">
                {log.designer_name}
              </td>
              <td className="px-5 py-3.5 text-sm text-slate-600 align-middle">
                {log.task_name}
              </td>

              {/* Hours — editable inline */}
              <td className="px-5 py-3.5 align-middle w-28">
                {isEditing ? (
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={editHours}
                    onChange={e => setEditHours(e.target.value)}
                    className={`${inputCls} font-mono w-20`}
                  />
                ) : (
                  <span className="font-mono text-sm text-slate-900 whitespace-nowrap font-semibold">
                    {Number(log.hours_spent).toFixed(1)}h
                  </span>
                )}
              </td>

              {/* Description — editable inline */}
              <td className="px-5 py-3.5 align-middle">
                {isEditing ? (
                  <input
                    type="text"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder="Description…"
                    className={inputCls}
                  />
                ) : (
                  <span className="text-sm text-slate-400 max-w-xs truncate block">
                    {log.description || <span className="text-slate-300">—</span>}
                  </span>
                )}
              </td>

              {/* Actions */}
              <td className="px-5 py-3.5 align-middle">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(log.id)}
                      className="text-xs font-bold text-primary hover:text-primary-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {(isManager || log.designer_user_id === currentUserId) && (
                      <button
                        onClick={() => startEdit(log)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {isManager && (
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}