import { useState } from 'react';
import type { FeedbackPayload, FeedbackCategory } from '../types/feedback';

interface Props {
  projectId: number;
  onSubmit:  (payload: FeedbackPayload) => void;
  isLoading: boolean;
}

const CATEGORIES: { value: FeedbackCategory; label: string; hint: string }[] = [
  { value: 'Question',  label: 'Question',  hint: 'Ask about the project'         },
  { value: 'Revision',  label: 'Revision',  hint: 'Request a change'              },
  { value: 'Approval',  label: 'Approval',  hint: 'Sign off on a deliverable'     },
];

export default function FeedbackForm({ projectId, onSubmit, isLoading }: Props) {
  const [category, setCategory] = useState<FeedbackCategory>('Question');
  const [content,  setContent]  = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({ project: projectId, category, content_text: content.trim() });
    setContent('');
    setCategory('Question');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submit Feedback</p>

      {/* Category radio buttons */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(({ value, label }) => (
          <label
            key={value}
            title={CATEGORIES.find(c => c.value === value)?.hint}
            className={`flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors select-none ${
              category === value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="feedback-category"
              value={value}
              checked={category === value}
              onChange={() => setCategory(value)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Describe your feedback…"
        rows={3}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
      />

      <button
        type="submit"
        disabled={!content.trim() || isLoading}
        className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}