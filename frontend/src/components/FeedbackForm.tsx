import { useState } from 'react';
import type { FeedbackPayload, FeedbackCategory } from '../types/feedback';
import { MessageSquare, HelpCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface Props {
  projectId: number;
  onSubmit:  (payload: FeedbackPayload) => void;
  isLoading: boolean;
}

const CATEGORIES: { value: FeedbackCategory; label: string; icon: React.ReactNode; hint: string }[] = [
  { value: 'Question',  label: 'Question',  icon: <HelpCircle size={14} />,  hint: 'Ask about the project'     },
  { value: 'Revision',  label: 'Revision',  icon: <RefreshCw size={14} />,  hint: 'Request a change'          },
  { value: 'Approval',  label: 'Approval',  icon: <CheckCircle2 size={14} />, hint: 'Sign off on a deliverable' },
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

  const activeCat = CATEGORIES.find(c => c.value === category)!;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare size={14} className="text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submit Feedback</p>
      </div>

      {/* Category selector */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setCategory(value)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all select-none ${
              category === value
                ? 'border-primary bg-primary-50 text-primary-700 shadow-sm'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={`Describe your ${activeCat.label.toLowerCase()}…`}
        rows={3}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
      />

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={!content.trim() || isLoading}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </div>
    </form>
  );
}
