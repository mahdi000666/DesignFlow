import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/clients';
import type { ProjectPayload } from '../types/project';

// Handles values that are optional but must be positive in cases they are provided.
const optionalPositiveNumber = (label: string) =>
  z.string().optional().refine(
    value => value == null || value === '' || Number(value) > 0,
    `${label} must be greater than 0`,
  );

const schema = z.object({
  project_name:  z.string().min(1, 'Project name is required'),
  client:        z.string().min(1, 'Client is required'),
  description:   z.string().optional(),
  budget_hours:  optionalPositiveNumber('Budget hours'),
  budget_amount: optionalPositiveNumber('Budget amount'),
  deadline:      z.string().optional(),
  status:        z.enum(['Active', 'Completed', 'OnHold']),
  category:      z.string().optional(),
  revision_limit: z.string().optional().refine(
    value => value == null || value === '' || Number(value) >= 0,
    'Revision limit cannot be negative',
  ),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit:   (payload: ProjectPayload) => void;
  isLoading:  boolean;
  defaults?:  Partial<FormValues>;
}

interface ClientOption {
  id:   number;
  name: string;
}

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors placeholder:text-slate-400 bg-white';

const labelCls =
  'block text-xs font-semibold text-slate-500 mb-1.5';

const ProjectForm = ({ onSubmit, isLoading, defaults }: Props) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver:      zodResolver(schema),
    defaultValues: { status: 'Active', revision_limit: '2', ...defaults },
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn:  async () => {
      const { data } = await apiClient.get<ClientOption[]>('/users/clients/');
      return data;
    },
  });

  const submit = (values: FormValues) => {
    onSubmit({
      project_name:  values.project_name,
      client:        parseInt(values.client, 10),
      description:   values.description,
      budget_hours:  values.budget_hours  ? parseFloat(values.budget_hours)  : undefined,
      budget_amount: values.budget_amount ? parseFloat(values.budget_amount) : undefined,
      deadline:      values.deadline || undefined,
      status:        values.status,
      category:      values.category,
      revision_limit: values.revision_limit ? parseInt(values.revision_limit, 10) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Project name</label>
          <input
            {...register('project_name')}
            placeholder="e.g. Brand Refresh 2025"
            className={inputCls}
          />
          {errors.project_name && (
            <p className="text-xs text-rose-600 mt-1">{errors.project_name.message}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Client</label>
          <select {...register('client')} className={inputCls}>
            <option value="">Select a client…</option>
            {clients?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.client && (
            <p className="text-xs text-rose-600 mt-1">{errors.client.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Brief overview of the project scope…"
          className={inputCls}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Budget (Hours)</label>
          <input
            type="number"
            min="0.5"
            step="0.5"
            placeholder="e.g. 80"
            {...register('budget_hours')}
            className={inputCls}
          />
          {errors.budget_hours && (
            <p className="text-xs text-rose-600 mt-1">{errors.budget_hours.message}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Budget (TND)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="e.g. 15000"
            {...register('budget_amount')}
            className={inputCls}
          />
          {errors.budget_amount && (
            <p className="text-xs text-rose-600 mt-1">{errors.budget_amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Deadline</label>
          <input
            type="date"
            {...register('deadline')}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Status</label>
          <select {...register('status')} className={inputCls}>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="OnHold">On Hold</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Category</label>
        <input
          {...register('category')}
          placeholder="e.g. Branding, Web, Print"
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Included Revisions</label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="2"
            {...register('revision_limit')}
            className={inputCls}
          />
          {errors.revision_limit && (
            <p className="text-xs text-rose-600 mt-1">{errors.revision_limit.message}</p>
          )}
        </div>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors w-full"
        >
          {isLoading ? 'Saving…' : 'Save project'}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
