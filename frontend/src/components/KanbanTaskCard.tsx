import { useState, useEffect, useRef } from 'react';
import type { Task } from '../types/task';
import type { TimerSession } from '../types/timelog';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import { formatHours } from '../utils/format';

interface Props {
  task:        Task;
  isManager:   boolean;
  loggedHours: number;
  session?:    TimerSession;
  onPause?:    () => void;
  onResume?:   () => void;
  onStop?:     () => void;
  isPending?:  boolean;
  onEdit?:     () => void;
  onDelete?:   () => void;
}

function fmtSecs(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

export default function KanbanTaskCard({
  task, isManager, loggedHours, session, onPause, onResume, onStop, isPending,
  onEdit, onDelete,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showSubs, setShowSubs] = useState(false);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (session?.state === 'running') {
      const base = session.elapsed_secs;
      let extra = 0;
      intervalRef.current = setInterval(() => {
        extra += 1;
        setElapsed(base + extra);
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session]);

  const displaySecs = session?.state === 'running'
    ? elapsed
    : (session?.accumulated_secs ?? 0);

  const isRunning  = session?.state === 'running';
  const isPaused   = session?.state === 'paused';
  const hasSession = !!session;

  // Subtask totals — used for display only; the parent's own estimate is always shown as-is.
  const subtaskEstimateTotal = task.subtasks.length > 0
    ? task.subtasks.reduce((sum, s) => sum + (s.estimated_hours ?? 0), 0)
    : null;

  const showManagerActions = isManager && (onEdit || onDelete);

  return (
    <div
      className={`relative group bg-white rounded-xl border p-3.5 shadow-xs select-none transition-colors ${
        isRunning
          ? 'border-primary/40 ring-1 ring-primary/20'
          : isPaused
          ? 'border-amber-300/60 ring-1 ring-amber-200/60'
          : 'border-slate-200'
      }`}
    >
      {/* ── Manager edit / delete buttons (hover) ───────────────────────── */}
      {showManagerActions && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-primary-50 hover:text-primary text-slate-400 flex items-center justify-center transition-colors"
              title="Edit task"
            >
              <Pencil size={11} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 flex items-center justify-center transition-colors"
              title="Delete task"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      )}

      {/* Task name — keep right padding so it doesn't overlap buttons */}
      <p className={`text-sm font-medium text-slate-900 leading-snug ${showManagerActions ? 'pr-14' : ''}`}>
        {task.task_name}
      </p>

      {task.description && (
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{task.description}</p>
      )}

      {task.is_unplanned && (
        <span className="inline-block text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded mt-1.5">
          Scope creep
        </span>
      )}

      {/* ── Subtasks ─────────────────────────────────────────────────────── */}
      {task.subtasks.length > 0 && (
        <div className="mt-1.5">
          <button
            onClick={e => { e.stopPropagation(); setShowSubs(v => !v); }}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors"
          >
            ↳ {task.subtasks.length} Subtask{task.subtasks.length !== 1 ? 's' : ''}
            {subtaskEstimateTotal !== null && subtaskEstimateTotal > 0 && (
              <span className="ml-0.5 font-mono">{formatHours(subtaskEstimateTotal)} est.</span>
            )}
            <span className="ml-0.5">{showSubs ? '▴' : '▾'}</span>
          </button>

          {showSubs && (
            <ul className="mt-1.5 space-y-2 pl-3 border-l-2 border-slate-100">
              {task.subtasks.map(sub => (
                <li key={sub.id} className="text-xs text-slate-600">
                  {/* Name row */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate font-medium">{sub.task_name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sub.is_unplanned && (
                        <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1 rounded">SC</span>
                      )}
                      {sub.estimated_hours != null && (
                        <span className="font-mono text-[10px] text-slate-400">
                          {formatHours(sub.estimated_hours)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Description */}
                  {sub.description && (
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {sub.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Hours row (parent's own estimate, never replaced by subtotal) ── */}
      <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-400">
        {task.estimated_hours != null && (
          <span>
            Est:{' '}
            <span className="font-mono text-slate-600">{formatHours(task.estimated_hours)}</span>
          </span>
        )}
        {loggedHours > 0 && (
          <span className="flex items-center gap-1">
            <Clock size={10} />
            <span className="font-mono text-slate-600">{formatHours(loggedHours)}</span>
          </span>
        )}
      </div>

      {/* ── Timer controls — designer only ───────────────────────────────── */}
      {!isManager && hasSession && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {hasSession && (
            <div
              className={`font-mono text-base font-bold text-center mb-2.5 tabular-nums ${
                isRunning ? 'text-primary' : 'text-slate-400'
              }`}
            >
              {fmtSecs(displaySecs)}
            </div>
          )}

          <div className="flex gap-1.5">
            {isRunning && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onPause?.(); }}
                  disabled={isPending}
                  className="flex-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 py-1.5 rounded-lg hover:bg-amber-100 disabled:opacity-40 transition-colors"
                >
                  Pause
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onStop?.(); }}
                  disabled={isPending}
                  className="flex-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 rounded-lg hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                >
                  Stop & Log
                </button>
              </>
            )}

            {isPaused && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onResume?.(); }}
                  disabled={isPending}
                  className="flex-1 text-xs font-semibold bg-primary text-white py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-colors"
                >
                  Resume
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onStop?.(); }}
                  disabled={isPending}
                  className="flex-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 rounded-lg hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                >
                  Stop & Log
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}