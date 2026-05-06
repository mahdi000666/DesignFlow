import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useProject } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { useCreateFeedback, useFeedback } from '../../hooks/useFeedback';
import { useFiles } from '../../hooks/useFiles';
import { useMessages, useReplies, useMarkMessagesRead } from '../../hooks/useMessages';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useAuth } from '../../hooks/useAuth';
import AppShell from '../../components/AppShell';
import { KpiCard, Avatar } from '../../components/Ui';
import FeedbackForm from '../../components/FeedbackForm';
import FeedbackList from '../../components/FeedbackList';
import FileUploadPanel from '../../components/FileUploadPanel';
import MessageBoard from '../../components/MessageBoard';
import type { FeedbackPayload } from '../../types/feedback';
import { STATUS_BADGE, STATUS_DOT, barColor, statusLabel, categoryClass } from '../../utils/project';
import UnreadBadge from '../../components/UnreadBadge';
import { formatTND } from '../../utils/format';
import {
  Calendar, Tag, DollarSign, BarChart3, MessageSquare,
  CheckCircle2,
} from 'lucide-react';

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

  const markMessagesReadMutation = useMarkMessagesRead(projectId);
  const unreadMessages = messages.filter(
    m => !m.is_read && Number(m.sender) !== Number(userId),
  ).length;
  const { count: unreadFeedback, markRead: markFeedbackRead } =
    useUnreadCount(feedback, projectId, 'feedback', userId);
  const { count: unreadReplies,  markRead: markRepliesRead } =
    useUnreadCount(replies, projectId, 'replies', userId);
  const { count: unreadFiles,    markRead: markFilesRead } =
    useUnreadCount(files, projectId, 'files', userId);

  const unreadFeedbackTab = unreadFeedback + unreadReplies;

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  useEffect(() => {
    if (activeTab === 'feedback') { markFeedbackRead(); markRepliesRead(); }
  }, [feedback.length, replies.length, activeTab, markFeedbackRead, markRepliesRead]);
  useEffect(() => {
    if (activeTab === 'messages' && unreadMessages > 0) {
      markMessagesReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, activeTab]);
  useEffect(() => { if (activeTab === 'files')    markFilesRead();    }, [files.length,    activeTab, markFilesRead]);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    //if (tab === 'messages') markMessagesReadMutation.mutate();
    if (tab === 'feedback') { markFeedbackRead(); markRepliesRead(); }
    if (tab === 'files') markFilesRead();
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

  // Task completion
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const totalTasks     = tasks.length;
  const taskPct        = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const openFeedbackCount = feedback.filter(
    f => f.status !== 'Resolved' && f.category !== 'Approval',
  ).length;

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
    <AppShell title={project.project_name}>

      {/* ── Meta chips ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap mb-6">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_BADGE[project.status]}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[project.status]}`} />
          {statusLabel(project.status)}
        </span>

        {project.category && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${categoryClass(project.category)}`}>
            <Tag size={12} className="opacity-70" />
            {project.category}
          </span>
        )}
        {project.budget_amount != null && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm">
            <DollarSign size={12} />
            {formatTND(Number(project.budget_amount))}
          </span>
        )}

        {project.deadline && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600">
            <Calendar size={12} className="text-blue-500" />
            {project.deadline}
          </span>
        )}

        
      </div>

      {/* ── 3 KPI cards ───────────────────────────────────────────────────── */}
      <div className="flex justify-center mb-4">
        <div className="grid grid-cols-3 gap-3.5">
          <KpiCard
            label="Budget Utilisation"
            value={budgetPctRounded != null ? `${budgetPctRounded}%` : '—'}
            icon={<BarChart3 size={15} />}
            borderColor="#22c55e"
          />
          <KpiCard
            label="Open Feedback"
            value={openFeedbackCount}
            icon={<MessageSquare size={15} />}
            borderColor="#f59e0b"
          />
          <KpiCard
            label="Task Completion"
            value={totalTasks > 0 ? `${taskPct}%` : '—'}
            icon={<CheckCircle2 size={15} />}
            borderColor="#3b82f6"
          />
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
                { label: 'REMAINING', value: `${Math.round(remaining ?? 0)} h`,                      cls: remaining != null && remaining < 10 ? 'text-rose-600' : 'text-primary' },
                { label: 'CONTRACT',  value: project.budget_amount != null ? formatTND(Number(project.budget_amount)) : '—', cls: 'text-slate-900' },
              ].map(col => (
                <div key={col.label} className="text-right border-l border-slate-100 pl-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{col.label}</p>
                  <p className={`font-mono text-base font-bold leading-tight mt-0.5 ${col.cls}`}>{col.value}</p>
                </div>
              ))}
            </div>
          </div>

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
                <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
                Logged — {Math.round(project.actual_hours)} h
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-200 inline-block" />
                Remaining — {Math.round(remaining ?? 0)} h
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs (centered) ───────────────────────────────────────────────── */}
      <div className="flex justify-center border-b border-slate-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              activeTab === tab
                ? 'text-primary border-primary'
                : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            {tabContent(tab)}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-3.5">
          {/* Description */}
          {project.description && (
            <div className="card p-5 col-span-2">
              <p className="section-title mb-3">Project Description</p>
              <p className="text-sm text-slate-500 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Assigned Designers — full width */}
          {project.assignments.length > 0 && (
            <div className="card p-5 col-span-2">
              <p className="section-title mb-4">Assigned Designers</p>
              <div className="flex flex-wrap gap-3">
                {project.assignments.map(a => (
                  <div
                    key={a.designer_id}
                    className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100"
                  >
                    <Avatar name={a.designer_name} size="sm" src={a.avatar_url} />
                    <p className="text-sm font-medium text-slate-800">{a.designer_name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Feedback ────────────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-5">
          <div className="flex items-center justify-end">
            <button
              onClick={() => setShowFeedbackForm(v => !v)}
              className={
                showFeedbackForm
                  ? 'border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors'
                  : 'bg-primary text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors'
              }
            >
              {showFeedbackForm ? 'Cancel' : '+ Submit Feedback'}
            </button>
          </div>
          {showFeedbackForm && (
            <FeedbackForm
              projectId={projectId}
              onSubmit={(payload: FeedbackPayload) => {
                createFeedback.mutate(payload, { onSuccess: () => setShowFeedbackForm(false) });
              }}
              isLoading={createFeedback.isPending}
            />
          )}
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
