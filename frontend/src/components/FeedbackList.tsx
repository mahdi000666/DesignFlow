import { useState } from 'react';
import { useFeedback, useUpdateFeedbackStatus } from '../hooks/useFeedback';
import { useCreateMessage } from '../hooks/useMessages';
import type { FeedbackStatus } from '../types/feedback';

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  Pending:    'bg-yellow-100 text-yellow-700',
  InProgress: 'bg-blue-100 text-blue-700',
  Resolved:   'bg-green-100 text-green-700',
};

const CATEGORY_STYLES: Record<string, string> = {
  Revision: 'bg-red-100 text-red-700',
  Approval: 'bg-green-100 text-green-700',
  Question: 'bg-gray-100 text-gray-700',
};

// Approval items are intentionally omitted — an Approval is already a
// positive signal; progressing it through Pending→InProgress→Resolved
// is semantically meaningless.
const NEXT_STATUS: Partial<Record<FeedbackStatus, FeedbackStatus>> = {
  Pending:    'InProgress',
  InProgress: 'Resolved',
};

interface Props {
  projectId: number;
  canUpdate: boolean;    // true for Manager and Designer
  canReply?:  boolean;   // true for Designer/Manager (reply stored as a project message)
}

export default function FeedbackList({ projectId, canUpdate, canReply = false }: Props) {
  const { data: items = [], isLoading } = useFeedback(projectId);
  const updateStatus  = useUpdateFeedbackStatus(projectId);
  const createMessage = useCreateMessage(projectId);

  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText,  setReplyText]  = useState('');

  const handleReply = (feedbackId: number, category: string) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    createMessage.mutate(
      { project: projectId, content_text: `[Re: ${category} #${feedbackId}] ${trimmed}` },
      { onSuccess: () => { setReplyingTo(null); setReplyText(''); } },
    );
  };

  if (isLoading) return <p className="text-sm text-gray-400">Loading feedback…</p>;
  if (!items.length) return <p className="text-sm text-gray-400">No feedback yet.</p>;

  return (
    <ul className="space-y-3">
      {items.map(item => {
        const next = item.category !== 'Approval' ? NEXT_STATUS[item.status] : undefined;
        return (
          <li key={item.id} className="border rounded-lg p-4 bg-white shadow-sm">

            {/* Top row: badges + status button */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[item.category]}`}>
                    {item.category}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[item.status]}`}>
                    {item.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.submitted_at).toLocaleDateString()}
                  </span>
                  {item.resolved_at && (
                    <span className="text-xs text-gray-400">
                      Resolved {new Date(item.resolved_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{item.content_text}</p>
              </div>

              {canUpdate && next && (
                <button
                  onClick={() => updateStatus.mutate({ id: item.id, status: next })}
                  disabled={updateStatus.isPending}
                  className="text-xs px-2 py-1 border rounded hover:bg-gray-50 flex-shrink-0 disabled:opacity-50"
                >
                  Mark {next}
                </button>
              )}
            </div>

            {/* Reply section */}
            {canReply && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                {replyingTo === item.id ? (
                  <div className="flex gap-2 items-end">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Write a reply…"
                      rows={2}
                      className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                    />
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => handleReply(item.id, item.category)}
                        disabled={!replyText.trim() || createMessage.isPending}
                        className="text-xs px-3 py-1.5 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
                      >
                        Send
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReplyingTo(item.id); setReplyText(''); }}
                    className="text-xs text-slate-500 hover:text-blue-700 transition-colors"
                  >
                    ↩ Reply
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}