import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useProject } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { useCreateFeedback, useFeedback } from '../../hooks/useFeedback';
import { useFiles } from '../../hooks/useFiles';
import { useMessages, useReplies } from '../../hooks/useMessages';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useAuth } from '../../hooks/useAuth';
import AppShell from '../../components/AppShell';
import FeedbackForm from '../../components/FeedbackForm';
import FeedbackList from '../../components/FeedbackList';
import FileUploadPanel from '../../components/FileUploadPanel';
import MessageBoard from '../../components/MessageBoard';
import type { FeedbackPayload } from '../../types/feedback';
import { barColor, categoryClass } from '../../utils/project';
import UnreadBadge from '../../components/UnreadBadge';
import { formatEHR, formatTND, Initials } from '../../utils/format';

type Tab = 'overview' | 'feedback' | 'files' | 'messages';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientProjectDetail() {
  const { id }    = useParams<{ id: string }>();
  const projectId = Number(id);
  const { user }  = useAuth();
  const userId    = user?.user_id ?? 0;

  const { data: project, isLoading } = useProject(projectId);
  const { data: tasks = [] }         = useTasks(projectId);
  const createFeedback               = useCreateFeedback(projectId);
  const { data: messages = [] }      = useMessages(projectId);
  const { data: feedback = [] }      = useFeedback(projectId);
  const { data: files    = [] }      = useFiles(projectId);
  const { data: replies  = [] }      = useReplies(projectId);

  const { count: unreadMessages, markRead: markMessagesRead } =
    useUnreadCount(messages, projectId, 'messages', userId);
  const { count: unreadFeedback, markRead: markFeedbackRead } =
    useUnreadCount(feedback, projectId, 'feedback', userId);
  const { count: unreadReplies,  markRead: markRepliesRead } =
    useUnreadCount(replies, projectId, 'replies', userId);
  const { count: unreadFiles,    markRead: markFilesRead } =
    useUnreadCount(files, projectId, 'files', userId);

  const unreadFeedbackTab = unreadFeedback + unreadReplies;

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (activeTab === 'feedback') { markFeedbackRead(); markRepliesRead(); }
  }, [feedback.length, replies.length, activeTab, markFeedbackRead, markRepliesRead]);
  useEffect(() => { if (activeTab === 'messages') markMessagesRead(); }, [messages.length, activeTab, markMessagesRead]);
  useEffect(() => { if (activeTab === 'files')    markFilesRead();    }, [files.length,    activeTab, markFilesRead]);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'feedback') { markFeedbackRead(); markRepliesRead(); }
    if (tab === 'messages') markMessagesRead();
    if (tab === 'files')    markFilesRead();
  };

  if (isLoading) {
    return <AppShell title="Project"><p className="text-sm text-slate-400">Loading…</p></AppShell>;
  }
  if (!project) {
    return <AppShell title="Project"><p className="text-sm text-rose-600">Project not found.</p></AppShell>;
  }

  // ── Derived metrics ────────────────────────────────────────────────────────

  const budgetPct = project.budget_hours && project.actual_hours != null
    ? Math.min(100, (project.actual_hours / Number(project.budget_hours)) * 100)
    : null;
  const budgetPctRounded = budgetPct != null ? Math.round(budgetPct) : null;

  const remaining = project.budget_hours && project.actual_hours != null
    ? Math.max(0, Number(project.budget_hours) - project.actual_hours)
    : null;

  const targetEHR = project.budget_amount && project.budget_hours
    ? Number(project.budget_amount) / Number(project.budget_hours)
    : null;
  const currentEHR = project.budget_amount && project.actual_hours > 0
    ? Number(project.budget_amount) / project.actual_hours
    : null;
  const ehrGood = currentEHR != null && targetEHR != null ? currentEHR >= targetEHR : true;

  // Feedback stats
  const resolvedFeedback = feedback.filter(f => f.status === 'Resolved').length;
  const openFeedback     = feedback.filter(f => f.status !== 'Resolved').length;
  const deliverableFiles = files.filter(f => f.file_type === 'deliverable').length;

  // Task completion
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const totalTasks     = tasks.length;
  const taskPct        = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const category = categoryClass(project.category);

  const tabContent = (tab: Tab): ReactNode => {
    switch (tab) {
      case 'overview':  return 'Overview';
      case 'files':     return <span className="flex items-center">Files<UnreadBadge count={unreadFiles} /></span>;
      case 'feedback':  return <span className="flex items-center">Feedback<UnreadBadge count={unreadFeedbackTab} /></span>;
      case 'messages':  return <span className="flex items-center">Messages<UnreadBadge count={unreadMessages} /></span>;
    }
  };

  const TABS: Tab[] = ['overview', 'feedback', 'files', 'messages'];

  return (
    <AppShell title={project.project_name} breadcrumb={`Projects / ${project.project_name}`}>

      {/* ── Meta chips ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {project.deadline && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
              <rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M4.5 1v3M10.5 1v3M1.5 6h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Due {project.deadline}
          </span>
        )}
        {project.category && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${category}`}>
            {project.category}
          </span>
        )}
        {project.budget_amount != null && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {formatTND(Number(project.budget_amount))} contract value
          </span>
        )}
      </div>

      {/* ── 3 KPI cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Project Progress */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 relative overflow-hidden">
          <div className="absolute left-0 inset-y-0 w-1 rounded-l-xl bg-blue-500" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Project Progress</p>
          <p className="font-mono text-2xl font-bold text-slate-900 leading-none mb-1">
            {budgetPctRounded != null ? `${budgetPctRounded}%` : '—'}
          </p>
          <p className="text-xs text-slate-400">
            {project.actual_hours != null && project.budget_hours
              ? `${Math.round(project.actual_hours)} of ${Math.round(Number(project.budget_hours))} h Used`
              : 'No budget set'}
          </p>
        </div>

        {/* My Feedback */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 relative overflow-hidden">
          <div className="absolute left-0 inset-y-0 w-1 rounded-l-xl bg-amber-400" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">My Feedback</p>
          <p className="font-mono text-2xl font-bold text-slate-900 leading-none mb-1">{feedback.length}</p>
          <p className="text-xs text-slate-400">{resolvedFeedback} Resolved · {openFeedback} Open</p>
        </div>

        {/* Files Shared */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 relative overflow-hidden">
          <div className="absolute left-0 inset-y-0 w-1 rounded-l-xl bg-emerald-500" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Files Shared</p>
          <p className="font-mono text-2xl font-bold text-slate-900 leading-none mb-1">{files.length}</p>
          <p className="text-xs text-slate-400">{deliverableFiles} Deliverable{deliverableFiles !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Budget Progress card ──────────────────────────────────────────── */}
      {project.budget_hours && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Budget Progress</p>
              <p className="text-xs text-slate-400 mt-0.5">Hours consumed vs contracted budget</p>
            </div>
            <div className="flex items-center gap-6">
              {[
                { label: 'LOGGED',    value: `${Math.round(project.actual_hours)} h`,                cls: 'text-slate-900' },
                { label: 'BUDGET',    value: `${Math.round(Number(project.budget_hours))} h`,        cls: 'text-slate-900' },
                { label: 'REMAINING', value: `${Math.round(remaining ?? 0)} h`,                      cls: remaining != null && remaining < 10 ? 'text-rose-600' : 'text-blue-700' },
                { label: 'CONTRACT',  value: project.budget_amount != null ? formatTND(Number(project.budget_amount)) : '—', cls: 'text-slate-900' },
              ].map(col => (
                <div key={col.label} className="text-right border-l border-slate-100 pl-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{col.label}</p>
                  <p className={`font-mono text-base font-bold leading-tight mt-0.5 ${col.cls}`}>{col.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-slate-100 rounded-full h-3 overflow-hidden mb-1">
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${Math.min(budgetPct ?? 0, 100)}%`, backgroundColor: barColor(budgetPct ?? 0) }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>0 h</span>
            <span className="font-mono font-semibold" style={{ color: barColor(budgetPct ?? 0) }}>
              {Math.round(project.actual_hours)} h · {budgetPctRounded}%
            </span>
            <span>{Math.round(Number(project.budget_hours))} h</span>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
                Logged — {Math.round(project.actual_hours)} h
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-200 inline-block" />
                Remaining — {Math.round(remaining ?? 0)} h
              </span>
            </div>
            {targetEHR != null && currentEHR != null && (
              <p className="text-xs text-slate-400">
                Target EHR:{' '}
                <span className={`font-semibold ${ehrGood ? 'line-through text-slate-400' : 'text-rose-600'}`}>
                  {formatEHR(targetEHR)}
                </span>
                {' · '}
                Current EHR:{' '}
                <span className={`font-semibold ${ehrGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatEHR(currentEHR)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
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
        <div className="space-y-6">
          {/* Description */}
          {project.description && (
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-2">Project Description</p>
              <p className="text-sm text-slate-500 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Task Completion */}
          {totalTasks > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-3">Task Completion</p>
              <div className="flex items-center gap-4 mb-1">
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{ width: `${taskPct}%`, backgroundColor: '#3b82f6' }}
                  />
                </div>
                <span className="font-mono text-sm font-semibold text-slate-700 shrink-0">
                  {completedTasks} / {totalTasks}
                </span>
              </div>
              <p className="text-xs text-slate-400">{taskPct}% of tasks complete</p>
            </div>
          )}

          {/* Assigned Designers */}
          {project.assignments.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-3">Assigned Designers</p>
              <div className="flex flex-wrap gap-3">
                {project.assignments.map(a => {
                  const initials = Initials(a.designer_name);
                  // Cycle through accent colours by designer_id
                  const colours = [
                    'bg-violet-500', 'bg-teal-500', 'bg-blue-500',
                    'bg-rose-500', 'bg-amber-500', 'bg-emerald-500',
                  ];
                  const colour = colours[a.designer_id % colours.length];
                  return (
                    <div
                      key={a.designer_id}
                      className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5"
                    >
                      <div className={`w-9 h-9 rounded-full ${colour} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{a.designer_name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Feedback ────────────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-5">
          <FeedbackForm
            projectId={projectId}
            onSubmit={(payload: FeedbackPayload) => createFeedback.mutate(payload)}
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