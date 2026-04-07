import { useState } from 'react';
import { useDeleteTask, useUpdateTask, useCreateTask } from '../hooks/useTasks';
import TaskForm from './TaskForm';
import type { Task, TaskPayload } from '../types/task';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  task:        Task;
  projectId:   number;
  isManager:   boolean;
  /** Pre-computed SUM(hours_spent) for this task from the parent's log map. */
  loggedHours?:  number;
  /** Logged hours keyed by task id — passed through for subtask rows. */
  taskLogMap?:   Record<number, number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<Task['status'], Task['status']> = {
  Todo:       'InProgress',
  InProgress: 'Completed',
  Completed:  'Todo',
};

const STATUS_BADGE: Record<Task['status'], string> = {
  Todo:       'bg-surface2 text-ink3',
  InProgress: 'bg-info-light text-info',
  Completed:  'bg-success-light text-success',
};

// Teal filled checkbox for Completed, empty square otherwise.
const Checkbox = ({
  status,
  onClick,
  disabled,
}: {
  status:   Task['status'];
  onClick:  () => void;
  disabled: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title="Click to cycle status"
    className="flex items-center justify-center w-5 h-5 focus:outline-none disabled:opacity-40 shrink-0"
  >
    {status === 'Completed' ? (
      <span className="w-5 h-5 rounded-sm bg-teal flex items-center justify-center">
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    ) : (
      <span className="w-5 h-5 rounded-sm border-2 border-border-strong" />
    )}
  </button>
);

// ─── Component ───────────────────────────────────────────────────────────────

export default function TaskRow({ task, projectId, isManager, loggedHours = 0, taskLogMap = {} }: Props) {
  const deleteTask    = useDeleteTask(projectId);
  const updateTask    = useUpdateTask(projectId);
  const createSubtask = useCreateTask(projectId);

  const [editing,       setEditing]       = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);

  const cycleStatus = (id: number, current: Task['status']) =>
    updateTask.mutate({ id, payload: { status: STATUS_CYCLE[current] } });

  const handleEdit = (payload: TaskPayload) =>
    updateTask.mutate({ id: task.id, payload }, { onSuccess: () => setEditing(false) });

  const handleCreateSubtask = (payload: TaskPayload) =>
    createSubtask.mutate(payload, { onSuccess: () => setAddingSubtask(false) });

  // colspan covers: checkbox + task + type + estimated + logged + status + (actions)
  const SPAN = 7;

  return (
    <>
      {/* ── Parent task row ─────────────────────────────────────────────── */}
      <tr className="border-b border-border last:border-b-0 hover:bg-bg transition-colors group">

        {/* Checkbox */}
        <td className="px-4 py-[13px] w-12">
          <Checkbox
            status={task.status}
            onClick={() => cycleStatus(task.id, task.status)}
            disabled={updateTask.isPending}
          />
        </td>

        {/* Task name + optional edit-trigger */}
        <td className="px-4 py-[13px]">
          <span className="font-sans text-[13px] font-medium text-ink">
            {task.task_name}
          </span>
          {task.description && (
            <p className="font-sans text-[12px] text-ink3 mt-[2px] truncate max-w-xs">
              {task.description}
            </p>
          )}
        </td>

        {/* Type — scope creep badge only */}
        <td className="px-4 py-[13px] w-36">
          {task.is_unplanned && (
            <span className="inline-block px-2 py-[3px] rounded font-sans text-[11px] font-semibold bg-danger-light text-danger">
              Scope creep
            </span>
          )}
        </td>

        {/* Estimated */}
        <td className="px-4 py-[13px] w-24 font-mono text-[13px] text-ink">
          {task.estimated_hours != null ? `${task.estimated_hours}h` : <span className="text-ink3">—</span>}
        </td>

        {/* Logged (from parent's time-log map) */}
        <td className="px-4 py-[13px] w-24 font-mono text-[13px] text-ink">
          {loggedHours > 0 ? `${loggedHours.toFixed(1)}h` : <span className="text-ink3">0h</span>}
        </td>

        {/* Status badge */}
        <td className="px-4 py-[13px] w-28">
          <span className={`inline-block px-2 py-[3px] rounded font-sans text-[11px] font-semibold ${STATUS_BADGE[task.status]}`}>
            {task.status}
          </span>
        </td>

        {/* Manager actions — revealed on row hover */}
        <td className="px-4 py-[13px] w-36">
          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {isManager && (
              <>
                <button
                  onClick={() => { setAddingSubtask(v => !v); setEditing(false); }}
                  className="font-sans text-[11px] text-ink3 hover:text-amber transition-colors"
                >
                  {addingSubtask ? 'Cancel' : '+ Sub'}
                </button>
                <button
                  onClick={() => { setEditing(v => !v); setAddingSubtask(false); }}
                  className="font-sans text-[11px] text-ink3 hover:text-ink transition-colors"
                >
                  {editing ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={() => deleteTask.mutate(task.id)}
                  disabled={deleteTask.isPending}
                  className="font-sans text-[11px] text-danger/60 hover:text-danger transition-colors disabled:opacity-40"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* ── Inline edit form ────────────────────────────────────────────── */}
      {editing && isManager && (
        <tr className="border-b border-border bg-bg">
          <td colSpan={SPAN} className="px-6 py-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.6px] text-ink3 mb-3">
              Editing: {task.task_name}
            </p>
            <TaskForm
              projectId={projectId}
              defaults={task}
              onSubmit={handleEdit}
              isLoading={updateTask.isPending}
            />
          </td>
        </tr>
      )}

      {/* ── Subtask rows (always visible, indented) ─────────────────────── */}
      {task.subtasks.map(sub => (
        <tr
          key={sub.id}
          className="border-b border-border last:border-b-0 bg-bg hover:bg-surface2/50 transition-colors group/sub"
        >
          {/* Indent checkbox */}
          <td className="py-[10px] pl-10 pr-4 w-12">
            <Checkbox
              status={sub.status}
              onClick={() => cycleStatus(sub.id, sub.status)}
              disabled={updateTask.isPending}
            />
          </td>

          {/* Sub task name — with a small visual indent marker */}
          <td className="px-4 py-[10px]">
            <div className="flex items-center gap-2">
              <span className="text-ink3 text-[11px]">↳</span>
              <span className="font-sans text-[13px] text-ink2">{sub.task_name}</span>
            </div>
          </td>

          {/* Type */}
          <td className="px-4 py-[10px] w-36">
            {sub.is_unplanned && (
              <span className="inline-block px-2 py-[3px] rounded font-sans text-[11px] font-semibold bg-danger-light text-danger">
                Scope creep
              </span>
            )}
          </td>

          {/* Estimated */}
          <td className="px-4 py-[10px] w-24 font-mono text-[13px] text-ink2">
            {sub.estimated_hours != null ? `${sub.estimated_hours}h` : <span className="text-ink3">—</span>}
          </td>

          {/* Logged */}
          <td className="px-4 py-[10px] w-24 font-mono text-[13px] text-ink2">
            {(taskLogMap[sub.id] ?? 0) > 0
              ? `${(taskLogMap[sub.id]!).toFixed(1)}h`
              : <span className="text-ink3">0h</span>
            }
          </td>

          {/* Status */}
          <td className="px-4 py-[10px] w-28">
            <span className={`inline-block px-2 py-[3px] rounded font-sans text-[11px] font-semibold ${STATUS_BADGE[sub.status]}`}>
              {sub.status}
            </span>
          </td>

          {/* Manager actions */}
          <td className="px-4 py-[10px] w-36">
            {isManager && (
              <button
                onClick={() => deleteTask.mutate(sub.id)}
                disabled={deleteTask.isPending}
                className="font-sans text-[11px] text-danger/60 hover:text-danger transition-colors opacity-0 group-hover/sub:opacity-100 disabled:opacity-40"
              >
                Delete
              </button>
            )}
          </td>
        </tr>
      ))}

      {/* ── Add-subtask form ────────────────────────────────────────────── */}
      {addingSubtask && isManager && (
        <tr className="border-b border-border bg-bg">
          <td colSpan={SPAN} className="px-6 py-4 pl-10">
            <p className="font-sans text-[11px] uppercase tracking-[0.6px] text-ink3 mb-3">
              New subtask of: {task.task_name}
            </p>
            <TaskForm
              projectId={projectId}
              defaults={{ parent_task: task.id }}
              onSubmit={handleCreateSubtask}
              isLoading={createSubtask.isPending}
            />
          </td>
        </tr>
      )}
    </>
  );
}