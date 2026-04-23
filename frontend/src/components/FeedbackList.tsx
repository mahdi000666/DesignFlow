import { useState } from 'react';
import { useFeedback, useUpdateFeedbackStatus, useDeleteFeedback } from '../hooks/useFeedback';
import { useReplies, useCreateMessage } from '../hooks/useMessages';
import { useAuth } from '../hooks/useAuth';
import type { FeedbackStatus } from '../types/feedback';

type FeedbackFilter = 'All' | 'Pending' | 'InProgress' | 'Resolved' | 'Revision' | 'Approval' | 'Question';

const FILTERS: { value: FeedbackFilter; label: string }[] = [
  { value: 'All',        label: 'All' },
  { value: 'Pending',    label: 'Pending' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Resolved',   label: 'Resolved' },
  { value: 'Revision',   label: 'Revision' },
  { value: 'Approval',   label: 'Approval' },
  { value: 'Question',   label: 'Question' },
];

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

const NEXT_STATUS: Partial<Record<FeedbackStatus, FeedbackStatus>> = {
  Pending:    'InProgress',
  InProgress: 'Resolved',
};

function StatusBadge({ category, status }: { category: string; status: FeedbackStatus }) {
  if (category === 'Approval') {
    if (status === 'Pending') return null;
    const label = status === 'Resolved' ? 'Acknowledged' : status;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status]}`}>
        {label}
      </span>
    );
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

interface Props {
  projectId: number;
  canUpdate: boolean;
  canReply?:  boolean;
}

export default function FeedbackList({ projectId, canUpdate, canReply = false }: Props) {
  const { user }                           = useAuth();
  const { data: items    = [], isLoading } = useFeedback(projectId);
  const { data: replies  = [] }            = useReplies(projectId);
  const updateStatus   = useUpdateFeedbackStatus(projectId);
  const deleteFeedback = useDeleteFeedback(projectId);
  const createMessage  = useCreateMessage(projectId);

  const [filter,     setFilter]     = useState<FeedbackFilter>('All');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText,  setReplyText]  = useState('');

  // Replies are Messages with feedback=<id> — group by feedback FK directly.
  const repliesFor = (feedbackId: number) =>
    replies.filter(r => r.feedback === feedbackId);

  const handleReply = (feedbackId: number) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    createMessage.mutate(
      { project: projectId, content_text: trimmed, feedback: feedbackId },
      { onSuccess: () => { setReplyingTo(null); setReplyText(''); } },
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm('Delete this feedback? This cannot be undone.')) return;
    deleteFeedback.mutate(id);
  };

  if (isLoading) return <p className="text-sm text-gray-400">Loading feedback…</p>;
  if (!items.length) return <p className="text-sm text-gray-400">No feedback yet.</p>;

  const isClient = user?.role === 'Client';

  const visibleItems = filter === 'All'
    ? items
    : ['Pending', 'InProgress', 'Resolved'].includes(filter)
      ? items.filter(i => i.status === filter)
      : items.filter(i => i.category === filter);

  return (
    <div className="space-y-4">

      {/* ── Filter pills ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-sm text-gray-400">No feedback matches this filter.</p>
      ) : (
        <ul className="space-y-3">
          {visibleItems.map(item => {
            const next      = item.category !== 'Approval' ? NEXT_STATUS[item.status] : undefined;
            const canDelete = isClient && item.status === 'Pending';
            const itemReplies = repliesFor(item.id);

            return (
              <li key={item.id} className="border rounded-lg p-4 bg-white shadow-sm">

                {/* ── Top row: badges + action buttons ─────────────────────── */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[item.category]}`}>
                        {item.category}
                      </span>
                      <StatusBadge category={item.category} status={item.status} />
                      <span className="text-xs text-gray-400">
                        {new Date(item.submitted_at).toLocaleDateString()}
                      </span>
                      {item.resolved_at && (
                        <span className="text-xs text-gray-400">
                          {item.category === 'Approval' ? 'Acknowledged' : 'Resolved'}{' '}
                          {new Date(item.resolved_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{item.content_text}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canUpdate && next && (
                      <button
                        onClick={() => updateStatus.mutate({ id: item.id, status: next })}
                        disabled={updateStatus.isPending}
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        Mark {next}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteFeedback.isPending}
                        className="text-xs px-2 py-1 border border-rose-200 text-rose-500 rounded hover:bg-rose-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Threaded replies ──────────────────────────────────────── */}
                {(itemReplies.length > 0 || canReply) && (
                  <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">

                    {itemReplies.length > 0 && (
                      <ul className="space-y-2">
                        {itemReplies.map(reply => (
                          <li key={reply.id} className="flex gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-500 shrink-0 mt-0.5">
                              {(reply.sender_name ?? '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-medium text-slate-700">
                                  {reply.sender_name ?? 'Team'}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {new Date(reply.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mt-0.5">{reply.content_text}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {canReply && (
                      replyingTo === item.id ? (
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
                              onClick={() => handleReply(item.id)}
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
                      )
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}