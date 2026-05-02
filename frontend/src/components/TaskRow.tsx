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
  InProgress: 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200',
  Completed:  'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
};

const STATUS_LABEL: Record<Task['status'], string> = {
  Todo:       'Todo',
  InProgress: 'In Progress',
  Completed:  'Completed',
};

function VarianceCell({ logged, estimated }: { logged: number; estimated: number | null | undefined }) {
  if (logged === 0 || estimated == null) {
    return <span className="text-slate-300 font-medium">—</span>;
  }
  const v = logged - Number(estimated);
  if (v === 0) return <span className="text-slate-900 font-semibold">0h</span>;
  if (v > 0)   return <span className="text-rose-600 font-semibold">+{v.toFixed(1)}h</span>;
  return           <span className="text-emerald-600 font-semibold">{v.toFixed(1)}h</span>;
}

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

  const SPAN = 6;

  return (
    <>
      {/* ── Parent task row ─────────────────────────────────────────────── */}
      <tr className="group hover:bg-slate-50/80 transition-colors">

        {/* Task name + scope creep label */}
        <td className="px-5 py-4 align-middle">
          <span className="text-sm font-bold text-slate-900">{task.task_name}</span>
          {task.description && (
            <p className="text-xs text-slate-400 mt-1 truncate max-w-xs leading-relaxed">{task.description}</p>
          )}
          {task.is_unplanned && (
            <p className="text-[11px] text-rose-600 font-bold mt-1.5 uppercase tracking-wider">Scope creep</p>
          )}
        </td>

        {/* Status — click to cycle */}
        <td className="px-5 py-4 w-32 align-middle text-center">
          <button
            type="button"
            onClick={() => cycleStatus(task.id, task.status)}
            disabled={updateTask.isPending}
            title="Click to cycle status"
            className={`status-btn ${STATUS_BADGE[task.status]} hover:shadow-sm`}
          >
            {STATUS_LABEL[task.status]}
          </button>
        </td>

        {/* Estimated */}
        <td className="px-5 py-4 w-28 align-middle font-mono text-sm text-slate-900 text-center font-semibold">
          {task.estimated_hours != null
            ? `${task.estimated_hours}h`
            : <span className="text-slate-300">—</span>}
        </td>

        {/* Logged */}
        <td className="px-5 py-4 w-24 align-middle font-mono text-sm text-slate-900 text-center font-semibold">
          {loggedHours > 0
            ? `${loggedHours.toFixed(1)}h`
            : <span className="text-slate-300">0h</span>}
        </td>

        {/* Variance */}
        <td className="px-5 py-4 w-28 align-middle font-mono text-sm text-center">
          <VarianceCell logged={loggedHours} estimated={task.estimated_hours} />
        </td>

        {/* Manager actions */}
        <td className="px-5 py-4 w-36 align-middle">
          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {isManager && (
              <>
                <button
                  onClick={() => { setAddingSubtask(v => !v); setEditing(false); }}
                  className="text-xs font-bold text-slate-400 hover:text-amber-600 transition-colors"
                >
                  {addingSubtask ? 'Cancel' : '+ Sub'}
                </button>
                <button
                  onClick={() => { setEditing(v => !v); setAddingSubtask(false); }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
                >
                  {editing ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDelete(task.id, task.task_name)}
                  disabled={deleteTask.isPending}
                  className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors disabled:opacity-40"
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
        <tr className="bg-slate-50/60">
          <td colSpan={SPAN} className="px-6 py-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
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
          className="bg-slate-50/30 hover:bg-slate-50/60 transition-colors group/sub"
        >
          {/* Subtask name — indented */}
          <td className="px-5 py-3.5 align-middle border-l-2 border-l-slate-200">
            <div className="flex items-center gap-2 pl-2">
              <span className="text-slate-300 text-xs">↳</span>
              <span className="text-sm font-medium text-slate-700">{sub.task_name}</span>
            </div>
            {sub.is_unplanned && (
              <p className="text-[11px] text-rose-600 font-bold mt-1 pl-5 uppercase tracking-wider">Scope creep</p>
            )}
          </td>

          {/* Status — click to cycle */}
          <td className="px-5 py-3.5 w-32 align-middle text-center">
            <button
              type="button"
              onClick={() => cycleStatus(sub.id, sub.status)}
              disabled={updateTask.isPending}
              title="Click to cycle status"
              className={`status-btn ${STATUS_BADGE[sub.status]} hover:shadow-sm`}
            >
              {STATUS_LABEL[sub.status]}
            </button>
          </td>

          {/* Estimated */}
          <td className="px-5 py-3.5 w-28 align-middle font-mono text-sm text-slate-600 text-center font-semibold">
            {sub.estimated_hours != null
              ? `${sub.estimated_hours}h`
              : <span className="text-slate-300">—</span>}
          </td>

          {/* Logged */}
          <td className="px-5 py-3.5 w-24 align-middle font-mono text-sm text-slate-600 text-center font-semibold">
            {(taskLogMap[sub.id] ?? 0) > 0
              ? `${(taskLogMap[sub.id]!).toFixed(1)}h`
              : <span className="text-slate-300">0h</span>}
          </td>

          {/* Variance */}
          <td className="px-5 py-3.5 w-28 align-middle font-mono text-sm text-center">
            <VarianceCell logged={taskLogMap[sub.id] ?? 0} estimated={sub.estimated_hours} />
          </td>

          {/* Manager actions */}
          <td className="px-5 py-3.5 w-36 align-middle">
            {isManager && (
              <button
                onClick={() => handleDelete(sub.id, sub.task_name)}
                disabled={deleteTask.isPending}
                className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors opacity-0 group-hover/sub:opacity-100 disabled:opacity-40"
              >
                Delete
              </button>
            )}
          </td>
        </tr>
      ))}

      {/* ── Add-subtask form ────────────────────────────────────────────── */}
      {addingSubtask && isManager && (
        <tr className="bg-slate-50/60">
          <td colSpan={SPAN} className="px-6 py-5 pl-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
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