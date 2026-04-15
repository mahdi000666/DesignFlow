import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { estimateTaskHours } from '../api/tasks';
import type { Task, TaskPayload } from '../types/task';

export interface ParentTaskOption {
  id:        number;
  task_name: string;
}

const schema = z.object({
  task_name:       z.string().min(1, 'Task name is required'),
  description:     z.string().optional(),
  estimated_hours: z.string().optional(),
  is_unplanned:    z.boolean(),
  parent_task:     z.string().optional(),
  status:          z.enum(['Todo', 'InProgress', 'Completed']).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  projectId:          number;
  onSubmit:           (payload: TaskPayload) => void;
  isLoading:          boolean;
  defaults?:          Partial<Task>;
  parentTaskOptions?: ParentTaskOption[];
}

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors placeholder:text-slate-400 bg-white';

const labelCls =
  'block text-xs font-semibold text-slate-500 mb-1.5';

export default function TaskForm({ projectId, onSubmit, isLoading, defaults, parentTaskOptions }: Props) {
  const isEdit = defaults !== undefined;

  const [estimating,  setEstimating]  = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  const { register, handleSubmit, setValue, getValues, formState: { errors } } =
    useForm<FormValues>({
      resolver:      zodResolver(schema),
      defaultValues: {
        is_unplanned:    defaults?.is_unplanned    ?? false,
        task_name:       defaults?.task_name        ?? '',
        description:     defaults?.description      ?? '',
        estimated_hours: defaults?.estimated_hours != null
          ? String(defaults.estimated_hours)
          : '',
        status:          defaults?.status           ?? 'Todo',
        parent_task:     defaults?.parent_task != null
          ? String(defaults.parent_task)
          : '',
      },
    });

  const handleEstimate = async () => {
    const { task_name, description } = getValues();
    if (!task_name) return;
    setEstimating(true);
    setAiReasoning(null);
    const result = await estimateTaskHours(task_name, description ?? '', projectId);
    if (result.estimated_hours !== null) {
      setValue('estimated_hours', String(result.estimated_hours));
    }
    setAiReasoning(result.reasoning);
    setEstimating(false);
  };

  const submit = (values: FormValues) => {
    onSubmit({
      project:         projectId,
      task_name:       values.task_name,
      description:     values.description,
      estimated_hours: values.estimated_hours ? parseFloat(values.estimated_hours) : null,
      is_unplanned:    values.is_unplanned,
      parent_task:     values.parent_task ? parseInt(values.parent_task, 10) : null,
      ...(isEdit && values.status ? { status: values.status } : {}),
    });
  };

  const showParentSelect = parentTaskOptions && parentTaskOptions.length > 0;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">

      {showParentSelect ? (
        <div>
          <label className={labelCls}>
            Parent task <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <select {...register('parent_task')} className={inputCls}>
            <option value="">— None (top-level task) —</option>
            {parentTaskOptions.map(t => (
              <option key={t.id} value={t.id}>{t.task_name}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" {...register('parent_task')} />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Task name</label>
          <input
            {...register('task_name')}
            placeholder="e.g. Logo refinement"
            className={inputCls}
          />
          {errors.task_name && (
            <p className="text-xs text-rose-600 mt-1">{errors.task_name.message}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Estimated hours</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.5"
              {...register('estimated_hours')}
              placeholder="e.g. 6"
              className="w-28 px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors placeholder:text-slate-400 bg-white"
            />
            <button
              type="button"
              onClick={handleEstimate}
              disabled={estimating}
              className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {estimating ? 'Estimating…' : '✦ AI Suggest'}
            </button>
          </div>
          {aiReasoning && (
            <p className="text-xs text-slate-400 mt-1.5 italic leading-relaxed">{aiReasoning}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="What needs to be done?"
          className={inputCls}
          style={{ resize: 'vertical' }}
        />
      </div>

      {isEdit && (
        <div>
          <label className={labelCls}>Status</label>
          <select {...register('status')} className={inputCls}>
            <option value="Todo">Todo</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      )}

      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          id="is_unplanned"
          {...register('is_unplanned')}
          className="w-4 h-4 rounded border-slate-300 text-rose-600 accent-rose-600 cursor-pointer"
        />
        <label htmlFor="is_unplanned" className="text-sm text-slate-700 cursor-pointer select-none flex items-center gap-2">
          Unplanned task
          <span className="inline-block px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200 text-xs font-semibold">
            Scope creep
          </span>
        </label>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors w-full"
        >
          {isLoading ? 'Saving…' : isEdit ? 'Save changes' : 'Save task'}
        </button>
      </div>
    </form>
  );
}