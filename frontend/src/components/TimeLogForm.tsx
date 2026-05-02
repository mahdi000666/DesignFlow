import { useState } from 'react';
import type { Task } from '../types/task';
import type { TimeLogPayload } from '../types/timelog';

interface Props {
  tasks:     Task[];
  isLoading: boolean;
  onSubmit:  (payload: TimeLogPayload) => void;
}

const labelCls = 'block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider';

const TimeLogForm = ({ tasks, isLoading, onSubmit }: Props) => {
  const [taskId,      setTaskId]      = useState<number | ''>('');
  const [hoursSpent,  setHoursSpent]  = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !hoursSpent) return;
    onSubmit({
      task:        Number(taskId),
      hours_spent: Number(hoursSpent),
      description,
    });
    setTaskId('');
    setHoursSpent('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <h4 className="section-title text-sm mb-1">Log Time</h4>

      <div>
        <label className={labelCls}>Task</label>
        <select
          value={taskId}
          onChange={e => setTaskId(Number(e.target.value))}
          required
          className="input-field cursor-pointer"
        >
          <option value="">Select a task…</option>
          {tasks.filter(t => t.status !== 'Completed').map(t => (
            <option key={t.id} value={t.id}>{t.task_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Hours spent</label>
        <input
          type="number"
          value={hoursSpent}
          onChange={e => setHoursSpent(e.target.value)}
          min="0.25"
          step="0.25"
          required
          placeholder="e.g. 2.5"
          className="w-40 input-field font-mono"
        />
      </div>

      <div>
        <label className={labelCls}>
          Description <span className="normal-case text-slate-400 font-normal">(Optional)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="What did you work on?"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors resize-y"
        />
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary shadow-sm"
        >
          {isLoading ? 'Saving…' : 'Log time'}
        </button>
      </div>
    </form>
  );
};

export default TimeLogForm;