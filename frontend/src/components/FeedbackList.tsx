import { useState } from 'react';
import { useFeedback, useUpdateFeedbackStatus, useDeleteFeedback } from '../hooks/useFeedback';
import { useReplies, useCreateMessage } from '../hooks/useMessages';
import { useAuth } from '../hooks/useAuth';
import { SectionCard, EmptyState } from './Ui';
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
  Pending:    'bg-amber-50 text-amber-700',
  InProgress: 'bg-blue-50 text-blue-700',
  Resolved:   'bg-emerald-50 text-emerald-700',
};

const CATEGORY_STYLES: Record<string, string> = {
  Revision: 'bg-rose-50 text-rose-700',
  Approval: 'bg-emerald-50 text-emerald-700',
  Question: 'bg-slate-100 text-slate-600',
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
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[status]}`}>
        {label}
      </span>
    );
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

interface Props {
  projectId: number;
  canUpdate: boolean;
  canReply?: boolean;
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

  if (isLoading) return <p className="text-sm text-slate-400">Loading feedback…</p>;

  const isClient = user?.role === 'Client';

  const visibleItems = filter === 'All'
    ? items
    : ['Pending', 'InProgress', 'Resolved'].includes(filter)
      ? items.filter(i => i.status === filter)
      : items.filter(i => i.category === filter);

  return (
    <SectionCard title="Feedback History" action={
      <span className="text-xs text-slate-400 font-medium">{visibleItems.length} items</span>
    }>
      <div className="space-y-5">
        {/* ── Filter pills ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                filter === f.value
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {visibleItems.length === 0 ? (
          <EmptyState message="No feedback matches this filter." />
        ) : (
          <ul className="space-y-4">
            {visibleItems.map(item => {
              const next      = item.category !== 'Approval' ? NEXT_STATUS[item.status] : undefined;
              const canDelete = isClient && item.status === 'Pending';
              const itemReplies = repliesFor(item.id);

              return (
                <li key={item.id} className="card p-5 hover:shadow-md transition-all duration-300">

                  {/* ── Top row: badges + action buttons ─────────────────────── */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${CATEGORY_STYLES[item.category]}`}>
                          {item.category}
                        </span>
                        <StatusBadge category={item.category} status={item.status} />
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(item.submitted_at).toLocaleDateString()}
                        </span>
                        {item.resolved_at && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {item.category === 'Approval' ? 'Acknowledged' : 'Resolved'}{' '}
                            {new Date(item.resolved_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.content_text}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canUpdate && next && (
                        <button
                          onClick={() => updateStatus.mutate({ id: item.id, status: next })}
                          disabled={updateStatus.isPending}
                          className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-colors font-medium text-slate-700 shadow-sm"
                        >
                          Mark {next}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteFeedback.isPending}
                          className="text-xs px-3 py-1.5 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-colors font-medium shadow-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Threaded replies ──────────────────────────────────────── */}
                  {(itemReplies.length > 0 || canReply) && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">

                      {itemReplies.length > 0 && (
                        <ul className="space-y-3 thread-line">
                          {itemReplies.map(reply => (
                            <li key={reply.id} className="flex gap-3 relative">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 mt-0.5 shadow-sm ring-2 ring-white">
                                {(reply.sender_name ?? '?')[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xs font-bold text-slate-700">
                                    {reply.sender_name ?? 'Team'}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {new Date(reply.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{reply.content_text}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      {canReply && (
                        replyingTo === item.id ? (
                          <div className="flex gap-2 items-end bg-slate-50 rounded-xl p-3">
                            <textarea
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder="Write a reply…"
                              rows={2}
                              className="compose-box"
                            />
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button
                                onClick={() => handleReply(item.id)}
                                disabled={!replyText.trim() || createMessage.isPending}
                                className="text-xs px-3 py-1.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-sm"
                              >
                                Send
                              </button>
                              <button
                                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-white transition-colors font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setReplyingTo(item.id); setReplyText(''); }}
                            className="text-xs font-semibold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <span>↩</span> Reply
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
    </SectionCard>
  );
}