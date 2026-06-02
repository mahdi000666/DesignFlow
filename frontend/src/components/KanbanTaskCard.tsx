import { useState, useEffect, useRef } from 'react';
import type { Task } from '../types/task';
import type { TimerSession } from '../types/timelog';
import { Clock, Pencil, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { formatHours } from '../utils/format';

interface Props {
  task:         Task;
  columnColor:  string;   // e.g. "bg-blue-500"
  isManager:    boolean;
  loggedHours:  number;
  session?:     TimerSession;
  onPause?:     () => void;
  onResume?:    () => void;
  onStop?:      () => void;
  isPending?:   boolean;
  onEdit?:      () => void;
  onDelete?:    () => void;
}

function fmtSecs(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

/** Left accent bar: scope creep wins, otherwise column colour */
function accentClass(task: Task, columnColor: string, isRunning: boolean, isPaused: boolean): string {
  if (task.is_unplanned) return 'bg-rose-400';
  if (isRunning) return 'bg-primary-500';
  if (isPaused)  return 'bg-amber-400';
  return columnColor;
}

/** Mini progress bar colour */
function progressClass(logged: number, estimated: number | null): string {
  if (!estimated || estimated === 0) return 'bg-slate-200';
  const pct = logged / estimated;
  if (pct >= 1)   return 'bg-rose-400';
  if (pct >= 0.8) return 'bg-amber-400';
  return 'bg-primary-400';
}

export default function KanbanTaskCard({
  task, columnColor, isManager, loggedHours, session, onPause, onResume, onStop, isPending,
  onEdit, onDelete,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showSubs, setShowSubs] = useState(false);

  useEffect(() => { // captures elapsed_secs as the base, then increments a local extra counter and adds its to the base. The backend sends accumulated_secs and the frontend ticks forward from there.
    if (intervalRef.current) clearInterval(intervalRef.current); // Cancel on unmount, when the user navigates away to avoid memory leaks.
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

  // If running then show the live elapsed, if paused show accumulated_secs frozen.
  const displaySecs = session?.state === 'running'
    ? elapsed
    : (session?.accumulated_secs ?? 0);

  const isRunning  = session?.state === 'running';
  const isPaused   = session?.state === 'paused';
  const hasSession = !!session;

  const subtaskEstimateTotal = task.subtasks.length > 0
    ? task.subtasks.reduce((sum, s) => sum + (s.estimated_hours ?? 0), 0)
    : null;

  const showManagerActions = isManager && (onEdit || onDelete);
  const accent = accentClass(task, columnColor, isRunning, isPaused);

  const progressPct = task.estimated_hours && task.estimated_hours > 0
    ? Math.min(100, (loggedHours / task.estimated_hours) * 100)
    : 0;

  return (
    <div
      className={`relative group bg-white rounded-xl border shadow-sm select-none transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden ${
        isRunning
          ? 'border-primary-200 shadow-primary-100/50'
          : isPaused
          ? 'border-amber-200 shadow-amber-50/50'
          : 'border-slate-200/70'
      }`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${accent}`} />

      {/* Animated top line for running tasks */}
      {isRunning && (
        <div className="absolute top-0 left-[3px] right-0 h-[2px] bg-primary-400/20 animate-pulse" />
      )}

      {/* Content */}
      <div className="pl-4 pr-3 py-3.5">

        {/* ── Title + Manager Actions ───────────────────────────────── */}
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[13px] font-semibold text-slate-800 leading-snug tracking-tight ${showManagerActions ? 'pr-10' : ''}`}>
            {task.task_name}
          </p>

          {showManagerActions && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0 -mr-1 -mt-0.5">
              {onEdit && (
                <button
                  onClick={e => { e.stopPropagation(); onEdit(); }}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-primary-500 flex items-center justify-center transition-all duration-150"
                  title="Edit task"
                >
                  <Pencil size={12} strokeWidth={2.5} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={e => { e.stopPropagation(); onDelete(); }}
                  className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 flex items-center justify-center transition-all duration-150"
                  title="Delete task"
                >
                  <Trash2 size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Description ───────────────────────────────────────────── */}
        {task.description && (
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
            {task.description}
          </p>
        )}

        {/* ── Badges ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {task.is_unplanned && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100/80 px-2 py-0.5 rounded-md">
              <AlertTriangle size={9} strokeWidth={2.5} />
              Scope Creep
            </span>
          )}

          {task.estimated_hours != null && task.estimated_hours > 0 && (
            <span className="inline-flex items-center gap-2 text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
              <span className="relative w-30 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${progressClass(loggedHours, task.estimated_hours)}`}
                  style={{ width: `${progressPct}%` }}
                />
              </span>
              {Math.round(progressPct)}%
            </span>
          )}
        </div>

        {/* ── Subtasks ──────────────────────────────────────────────── */}
        {task.subtasks.length > 0 && (
          <div className="mt-2.5">
            <button
              onClick={e => { e.stopPropagation(); setShowSubs(v => !v); }}
              className="inline-flex items-center justify-between gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50/80 hover:bg-slate-100 border border-slate-100 px-2.5 py-1 rounded-lg transition-all duration-150 w-full group/sub"
            >
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-slate-400">
                  <path d="M21 12h-8m8-6H8m13 12h-8M3 6h4m-4 6h4m-4 6h4" />
                </svg>
                {task.subtasks.length} Subtask{task.subtasks.length !== 1 ? 's' : ''}
                {subtaskEstimateTotal !== null && subtaskEstimateTotal > 0 && (
                  <span className="font-mono text-[10px] text-slate-600 font-normal">
                    · {formatHours(subtaskEstimateTotal)} Est.
                  </span>
                )}
              </span>
              <span className="text-slate-300 group-hover/sub:text-slate-400 transition-colors">
                {showSubs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
            </button>

            {showSubs && (
              <ul className="mt-2 space-y-1.5">
                {task.subtasks.map(sub => (
                  <li
                    key={sub.id}
                    className="text-xs text-slate-600 bg-slate-50/60 rounded-lg px-2.5 py-2 border border-slate-100/80"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-slate-700">{sub.task_name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sub.is_unplanned && (
                          <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-1 py-0.5 rounded">SC</span>
                        )}
                        {sub.estimated_hours != null && (
                          <span className="font-mono text-[10px] text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                            {formatHours(sub.estimated_hours)}
                          </span>
                        )}
                      </div>
                    </div>
                    {sub.description && (
                      <p className="text-[10px] text-slate-600 mt-1 leading-relaxed line-clamp-1">
                        {sub.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Footer: Hours + Status ────────────────────────────────── */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/80">
          <div className="flex items-center gap-2.5">
            {task.estimated_hours != null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="font-mono font-semibold text-slate-600">{formatHours(task.estimated_hours)}</span>
                <span className="text-slate-600">Estimated</span>
              </span>
            )}
            {loggedHours > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Clock size={10} className="text-slate-400" />
                <span className="font-mono font-semibold text-slate-600">{formatHours(loggedHours)}</span>
                <span className="text-slate-600">Logged</span>
              </span>
            )}
          </div>

          {isRunning && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
              </span>
              Active
            </span>
          )}
          {isPaused && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-100" />
              Paused
            </span>
          )}
        </div>

        {/* ── Timer Panel (Designer only) ───────────────────────────── */}
        {!isManager && hasSession && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-center mb-3">
              <div className={`inline-flex items-center gap-2.5 px-5 py-2 rounded-xl border ${
                isRunning
                  ? 'bg-primary-50/40 border-primary-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isRunning ? 'text-primary-500' : 'text-slate-400'}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className={`font-mono text-lg font-bold tracking-[0.08em] tabular-nums ${
                  isRunning ? 'text-primary-700' : 'text-slate-500'
                }`}>
                  {fmtSecs(displaySecs)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {isRunning && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); onPause?.(); }}
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 py-2 rounded-lg hover:bg-amber-100 hover:border-amber-300 disabled:opacity-40 transition-all duration-150 active:scale-95"
                  >
                    <span className="w-1.5 h-1.5 rounded-sm bg-amber-500" />
                    Pause
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onStop?.(); }}
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 py-2 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-40 transition-all duration-150 active:scale-95"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Stop & Log
                  </button>
                </>
              )}

              {isPaused && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); onResume?.(); }}
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-primary text-white py-2 rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-all duration-150 active:scale-95 shadow-sm shadow-primary-200"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Resume
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onStop?.(); }}
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 py-2 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-40 transition-all duration-150 active:scale-95"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Stop & Log
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}