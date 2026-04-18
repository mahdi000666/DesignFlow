import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useProject } from '../../hooks/useProjects';
import { useCreateFeedback, useFeedback } from '../../hooks/useFeedback';
import { useMessages } from '../../hooks/useMessages';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import AppShell from '../../components/AppShell';
import FeedbackForm from '../../components/FeedbackForm';
import FeedbackList from '../../components/FeedbackList';
import FileUploadPanel from '../../components/FileUploadPanel';
import MessageBoard from '../../components/MessageBoard';
import type { Project } from '../../types/project';
import type { FeedbackPayload } from '../../types/feedback';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'feedback' | 'files' | 'messages';

const STATUS_BADGE: Record<Project['status'], string> = {
  Active:    'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  OnHold:    'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
};

const STATUS_DOT: Record<Project['status'], string> = {
  Active:    'bg-blue-500',
  Completed: 'bg-emerald-500',
  OnHold:    'bg-violet-500',
};

const barColor = (pct: number) =>
  pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#0d9488';

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">
      {count}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientProjectDetail() {
  const { id }    = useParams<{ id: string }>();
  const projectId = Number(id);

  const { data: project, isLoading } = useProject(projectId);
  const createFeedback               = useCreateFeedback(projectId);
  const { data: messages = [] }      = useMessages(projectId);
  const { data: feedback = [] }      = useFeedback(projectId);

  const { count: unreadMessages, markRead: markMessagesRead } =
    useUnreadCount(messages, projectId, 'messages');
  const { count: unreadFeedback, markRead: markFeedbackRead } =
    useUnreadCount(feedback, projectId, 'feedback');

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const handleFeedbackSubmit = (payload: FeedbackPayload) => {
    createFeedback.mutate(payload);
  };

  useEffect(() => { if (activeTab === 'messages') markMessagesRead(); }, [messages.length, activeTab, markMessagesRead]);
  useEffect(() => { if (activeTab === 'feedback') markFeedbackRead(); }, [feedback.length, activeTab, markFeedbackRead]);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'messages') markMessagesRead();
    if (tab === 'feedback') markFeedbackRead();
  };

  if (isLoading) {
    return <AppShell title="Project"><p className="text-sm text-slate-400">Loading…</p></AppShell>;
  }
  if (!project) {
    return <AppShell title="Project"><p className="text-sm text-rose-600">Project not found.</p></AppShell>;
  }

  const budgetPct = project.budget_hours && project.actual_hours != null
    ? Math.min(100, Math.round((project.actual_hours / Number(project.budget_hours)) * 100))
    : null;

  const tabContent = (tab: Tab): ReactNode => {
    switch (tab) {
      case 'overview':  return 'Overview';
      case 'files':     return 'Files';
      case 'feedback':  return <span className="flex items-center">Feedback<UnreadBadge count={unreadFeedback} /></span>;
      case 'messages':  return <span className="flex items-center">Messages<UnreadBadge count={unreadMessages} /></span>;
    }
  };

  const TABS: Tab[] = ['overview', 'feedback', 'files', 'messages'];

  return (
    <AppShell title={project.project_name} breadcrumb={`Projects / ${project.project_name}`}>

      {/* ── Hero card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-8 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[project.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[project.status]}`} />
                {project.status === 'OnHold' ? 'On Hold' : project.status}
              </span>
              {project.deadline && (
                <span className="text-sm text-slate-500">Due {fmtDate(project.deadline)}</span>
              )}
              {project.category && (
                <span className="text-sm text-slate-400">{project.category}</span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">{project.project_name}</h2>
            {project.description && (
              <p className="text-sm text-slate-500 leading-relaxed">{project.description}</p>
            )}
          </div>

          <div className="text-center shrink-0">
            <p className="font-mono text-lg font-semibold text-slate-900 leading-none">
              {project.actual_hours}h
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {project.budget_hours ? `of ${project.budget_hours}h` : 'logged'}
            </p>
          </div>
        </div>

        {budgetPct !== null && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-400 font-medium">Budget utilisation</span>
              <span className="text-xs font-semibold text-slate-600">{budgetPct}%</span>
            </div>
            <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${budgetPct}%`, backgroundColor: barColor(budgetPct) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'text-blue-700 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            {tabContent(tab)}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Assigned Designers
            </p>
            {project.assignments.length === 0 ? (
              <p className="text-sm text-slate-400">None assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {project.assignments.map(a => (
                  <li key={a.designer_id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600 shrink-0">
                      {a.designer_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-700">{a.designer_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Details
            </p>
            <dl className="space-y-2">
              {project.deadline && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Deadline</dt>
                  <dd className="text-slate-800 font-medium">{fmtDate(project.deadline)}</dd>
                </div>
              )}
              {project.category && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Category</dt>
                  <dd className="text-slate-800 font-medium">{project.category}</dd>
                </div>
              )}
              {project.budget_hours && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Budget hours</dt>
                  <dd className="font-mono text-slate-800 font-medium">{project.budget_hours}h</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {/* ── Tab: Feedback ────────────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-5">
          <FeedbackForm
            projectId={projectId}
            onSubmit={handleFeedbackSubmit}
            isLoading={createFeedback.isPending}
          />
          <FeedbackList projectId={projectId} canUpdate={false} />
        </div>
      )}

      {/* ── Tab: Files ───────────────────────────────────────────────────── */}
      {activeTab === 'files' && (
        <FileUploadPanel
          projectId={projectId}
          role="Client"
          isManager={false}
        />
      )}

      {/* ── Tab: Messages ────────────────────────────────────────────────── */}
      {activeTab === 'messages' && (
        <MessageBoard projectId={projectId} />
      )}
    </AppShell>
  );
}