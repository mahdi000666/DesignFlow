import { useState } from 'react';
import type { Task } from '../types/task';
import type { TimeLogPayload } from '../types/timelog';

interface Props {
  tasks:     Task[];
  isLoading: boolean;
  onSubmit:  (payload: TimeLogPayload) => void;
}

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors placeholder:text-slate-400 bg-white';

const labelCls =
  'block text-xs font-semibold text-slate-500 mb-1.5';

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
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div>
        <label className={labelCls}>Task</label>
        <select
          value={taskId}
          onChange={e => setTaskId(Number(e.target.value))}
          required
          className={inputCls}
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
          className="w-40 px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors placeholder:text-slate-400 bg-white"
        />
      </div>

      <div>
        <label className={labelCls}>
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="What did you work on?"
          className={inputCls}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="pt-0.5">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Saving…' : 'Log time'}
        </button>
      </div>
    </form>
  );
};

export default TimeLogForm;