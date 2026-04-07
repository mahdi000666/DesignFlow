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
  'w-full px-[14px] py-[10px] border border-border-strong rounded bg-surface font-sans text-[14px] text-ink outline-none focus:border-amber transition-colors placeholder:text-ink3';

const labelCls =
  'block font-sans text-[11px] uppercase tracking-[0.6px] text-ink3 mb-[6px]';

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
            Parent task <span className="normal-case text-ink3">(optional)</span>
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
          <input {...register('task_name')} className={inputCls} placeholder="e.g. Logo refinement" />
          {errors.task_name && (
            <p className="font-sans text-[12px] text-danger mt-1">{errors.task_name.message}</p>
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
              className="w-28 px-[14px] py-[10px] border border-border-strong rounded bg-surface font-mono text-[14px] text-ink outline-none focus:border-amber transition-colors placeholder:text-ink3 placeholder:font-sans"
            />
            <button
              type="button"
              onClick={handleEstimate}
              disabled={estimating}
              className="px-[14px] py-[6px] rounded bg-amber-light border border-[#F6D860] font-sans text-[12px] font-medium text-amber-dark hover:bg-[#FEF3C7] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {estimating ? 'Estimating…' : '✦ AI Suggest'}
            </button>
          </div>
          {aiReasoning && (
            <p className="font-sans text-[12px] text-ink3 mt-[6px] italic">{aiReasoning}</p>
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

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_unplanned"
          {...register('is_unplanned')}
          className="w-4 h-4 rounded border-border-strong accent-danger cursor-pointer"
        />
        <label htmlFor="is_unplanned" className="font-sans text-[13px] text-ink cursor-pointer select-none">
          Unplanned task{' '}
          <span className="inline-block px-2 py-[2px] rounded bg-danger-light text-danger font-semibold text-[11px]">
            Scope creep
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-[14px] py-[10px] rounded bg-ink text-white font-sans text-[13px] font-medium border border-ink hover:bg-[#333] disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Saving…' : isEdit ? 'Save changes' : 'Save task'}
      </button>
    </form>
  );
}