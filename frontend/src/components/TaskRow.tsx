import { useState } from 'react';
import { useDeleteTask, useUpdateTask, useCreateTask } from '../hooks/useTasks';
import TaskForm from './TaskForm';
import type { Task, TaskPayload } from '../types/task';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  task:          Task;
  projectId:     number;
  isManager:     boolean;
  loggedHours?:  number;
  taskLogMap?:   Record<number, number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<Task['status'], Task['status']> = {
  Todo:       'InProgress',
  InProgress: 'Completed',
  Completed:  'Todo',
};

const STATUS_BADGE: Record<Task['status'], string> = {
  Todo:       'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
  InProgress: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  Completed:  'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
};

const STATUS_LABEL: Record<Task['status'], string> = {
  Todo:       'Todo',
  InProgress: 'In Progress',
  Completed:  'Completed',
};

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

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete task "${name}"? This cannot be undone.`)) return;
    deleteTask.mutate(id);
  };

  // colspan: task + type + estimated + logged + status + actions = 6
  const SPAN = 6;

  return (
    <>
      {/* ── Parent task row ─────────────────────────────────────────────── */}
      <tr className="hover:bg-slate-50/70 transition-colors group">

        {/* Task name */}
        <td className="px-4 py-3.5 align-middle">
          <span className="text-sm font-medium text-slate-900">{task.task_name}</span>
          {task.description && (
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{task.description}</p>
          )}
        </td>

        {/* Type */}
        <td className="px-4 py-3.5 w-36 align-middle text-center">
          {task.is_unplanned && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
              Scope creep
            </span>
          )}
        </td>

        {/* Estimated */}
        <td className="px-4 py-3.5 w-28 align-middle font-mono text-sm text-slate-900 text-center">
          {task.estimated_hours != null
            ? `${task.estimated_hours}h`
            : <span className="text-slate-300">—</span>}
        </td>

        {/* Logged */}
        <td className="px-4 py-3.5 w-24 align-middle font-mono text-sm text-slate-900 text-center">
          {loggedHours > 0
            ? `${loggedHours.toFixed(1)}h`
            : <span className="text-slate-300">0h</span>}
        </td>

        {/* Status — click to cycle */}
        <td className="px-4 py-3.5 w-32 align-middle text-center">
          <button
            type="button"
            onClick={() => cycleStatus(task.id, task.status)}
            disabled={updateTask.isPending}
            title="Click to cycle status"
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-70 transition-opacity disabled:opacity-40 ${STATUS_BADGE[task.status]}`}
          >
            {STATUS_LABEL[task.status]}
          </button>
        </td>

        {/* Manager actions */}
        <td className="px-4 py-3.5 w-36 align-middle">
          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {isManager && (
              <>
                <button
                  onClick={() => { setAddingSubtask(v => !v); setEditing(false); }}
                  className="text-xs text-slate-400 hover:text-amber-600 transition-colors font-medium"
                >
                  {addingSubtask ? 'Cancel' : '+ Sub'}
                </button>
                <button
                  onClick={() => { setEditing(v => !v); setAddingSubtask(false); }}
                  className="text-xs text-slate-400 hover:text-slate-900 transition-colors font-medium"
                >
                  {editing ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDelete(task.id, task.task_name)}
                  disabled={deleteTask.isPending}
                  className="text-xs text-rose-400 hover:text-rose-600 transition-colors font-medium disabled:opacity-40"
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
        <tr className="bg-slate-50/50">
          <td colSpan={SPAN} className="px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
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

      {/* ── Subtask rows ────────────────────────────────────────────────── */}
      {task.subtasks.map(sub => (
        <tr
          key={sub.id}
          className="bg-slate-50/30 hover:bg-slate-50/70 transition-colors group/sub"
        >
          {/* Subtask name — indented */}
          <td className="px-4 py-3 pl-10 align-middle">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 text-xs">↳</span>
              <span className="text-sm text-slate-600">{sub.task_name}</span>
            </div>
          </td>

          {/* Type */}
          <td className="px-4 py-3 w-36 align-middle text-center">
            {sub.is_unplanned && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
                Scope creep
              </span>
            )}
          </td>

          {/* Estimated */}
          <td className="px-4 py-3 w-28 align-middle font-mono text-sm text-slate-600 text-center">
            {sub.estimated_hours != null
              ? `${sub.estimated_hours}h`
              : <span className="text-slate-300">—</span>}
          </td>

          {/* Logged */}
          <td className="px-4 py-3 w-24 align-middle font-mono text-sm text-slate-600 text-center">
            {(taskLogMap[sub.id] ?? 0) > 0
              ? `${(taskLogMap[sub.id]!).toFixed(1)}h`
              : <span className="text-slate-300">0h</span>}
          </td>

          {/* Status — click to cycle */}
          <td className="px-4 py-3 w-32 align-middle text-center">
            <button
              type="button"
              onClick={() => cycleStatus(sub.id, sub.status)}
              disabled={updateTask.isPending}
              title="Click to cycle status"
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-70 transition-opacity disabled:opacity-40 ${STATUS_BADGE[sub.status]}`}
            >
              {STATUS_LABEL[sub.status]}
            </button>
          </td>

          {/* Manager actions */}
          <td className="px-4 py-3 w-36 align-middle">
            {isManager && (
              <button
                onClick={() => handleDelete(sub.id, sub.task_name)}
                disabled={deleteTask.isPending}
                className="text-xs text-rose-400 hover:text-rose-600 transition-colors opacity-0 group-hover/sub:opacity-100 font-medium disabled:opacity-40"
              >
                Delete
              </button>
            )}
          </td>
        </tr>
      ))}

      {/* ── Add-subtask form ────────────────────────────────────────────── */}
      {addingSubtask && isManager && (
        <tr className="bg-slate-50/50">
          <td colSpan={SPAN} className="px-6 py-4 pl-12">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
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