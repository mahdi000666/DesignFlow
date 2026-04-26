import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useProject, useUpdateProject, useDeleteProject } from '../../hooks/useProjects';
import { useTasks, useCreateTask } from '../../hooks/useTasks';
import { useTimeLogs, useDeleteTimeLog, useUpdateTimeLog } from '../../hooks/useTimeLogs';
import { useFiles } from '../../hooks/useFiles';
import { useMessages } from '../../hooks/useMessages';
import { useFeedback } from '../../hooks/useFeedback';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useAuth } from '../../hooks/useAuth';
import { useAISummary, useScopeCreep } from '../../hooks/useAnalytics';
import TaskForm from '../../components/TaskForm';
import TaskRow from '../../components/TaskRow';
import AssignDesignerPanel from '../../components/AssignDesignerPanel';
import TimeLogList from '../../components/TimeLogList';
import FileUploadPanel from '../../components/FileUploadPanel';
import FeedbackList from '../../components/FeedbackList';
import MessageBoard from '../../components/MessageBoard';
import AppShell from '../../components/AppShell';
import type { TaskPayload, Task } from '../../types/task';
import type { Project } from '../../types/project';
import { exportPDF } from '../../api/analytics';
import type { ScopeCreepItem } from '../../types/analytic';
import { STATUS_BADGE, STATUS_DOT, barColor, categoryClass, statusLabel } from '../../utils/project';
import UnreadBadge from '../../components/UnreadBadge';
import { formatTND } from '../../utils/format';

type Tab = 'tasks' | 'logs' | 'files' | 'feedback' | 'messages';

// ─── Markdown bold renderer (parses **text** → <strong>, orange for scope creep) ──

function renderSummary(text: string): ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const isScopeCreep = part.toLowerCase().includes('scope creep');
    return isScopeCreep
      ? <strong key={i} className="text-amber-600">{part}</strong>
      : <strong key={i}>{part}</strong>;
  });
}

// ─── AI Summary card ─────────────────────────────────────────────────────────

interface StoredSummary { summary: string; date: string }

function AISummaryCard({ projectId }: { projectId: number }) {
  const SKEY = `ai-summary-${projectId}`;

  const [stored, setStored] = useState<StoredSummary | null>(() => {
    try { return JSON.parse(localStorage.getItem(SKEY) ?? 'null'); }
    catch { return null; }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [fetchError,   setFetchError]   = useState(false);

  // disabled by default — triggered manually via refetch()
  const { refetch } = useAISummary(projectId);

  const save = (summary: string) => {
    const entry: StoredSummary = { summary, date: new Date().toISOString() };
    setStored(entry);
    localStorage.setItem(SKEY, JSON.stringify(entry));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setFetchError(false);
    try {
      const result = await refetch();
      if (result.data?.summary) save(result.data.summary);
      else setFetchError(true);
    } catch {
      setFetchError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = async () => {
    localStorage.removeItem(SKEY);
    setStored(null);
    await handleGenerate();
  };

  const generatedLabel = stored?.date
    ? new Date(stored.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="text-white">
              <path d="M8.5 1.5L3 8.5h4.5L6.5 13.5l6-7H8L8.5 1.5z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">AI Project Health Narrative</p>
            <p className="text-xs text-slate-400 mt-0.5">Generated from live metrics</p>
          </div>
        </div>
        {stored && (
          <button
            onClick={handleRefresh}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 15 15" fill="none" className={isGenerating ? 'animate-spin' : ''}>
              <path d="M13 7.5A5.5 5.5 0 112.5 5M2.5 2v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh
          </button>
        )}
      </div>

      <div className="px-5 py-5">
        {!stored && !isGenerating && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Generate an AI-powered health narrative for this project.</p>
            <button
              onClick={handleGenerate}
              className="shrink-0 ml-4 bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors"
            >
              Generate Summary
            </button>
          </div>
        )}
        {isGenerating && <p className="text-sm text-slate-500">Analysing project data…</p>}
        {fetchError   && <p className="text-sm text-rose-600">Failed to generate summary. Check that GROQ_API_KEY is configured.</p>}
        {stored && (
          <>
            <p className="text-sm text-slate-700 leading-relaxed">{renderSummary(stored.summary)}</p>
            {generatedLabel && (
              <p className="text-xs text-slate-400 text-right mt-4">Generated {generatedLabel}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, subtitle, borderColor,
}: { label: string; value: ReactNode; subtitle: string; borderColor: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl px-5 py-4 relative overflow-hidden`}>
      <div className={`absolute left-0 inset-y-0 w-1 rounded-l-xl`} style={{ backgroundColor: borderColor }} />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">{label}</p>
      <p className="font-mono text-2xl font-bold text-slate-900 leading-none mb-1">{value}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id }    = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isManager = user?.role === 'Manager';
  const userId    = user?.user_id ?? 0;

  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: rawTasks = [], isLoading: loadingTasks } = useTasks(projectId);
  const tasks = useMemo(() => [...rawTasks].sort((a, b) => a.id - b.id), [rawTasks]);
  const { data: logs     = [] } = useTimeLogs(projectId);
  const { data: files    = [] } = useFiles(projectId);
  const { data: messages = [] } = useMessages(projectId);
  const { data: feedback = [] } = useFeedback(projectId);

  // Scope creep data for this project
  const { data: scopeCreepData = [] } = useScopeCreep({ project: projectId });
  const scopeEntry = (scopeCreepData as ScopeCreepItem[])[0] as ScopeCreepItem | undefined;

  const { count: unreadMessages, markRead: markMessagesRead } =
    useUnreadCount(messages, projectId, 'messages', userId);
  const { count: unreadFeedback, markRead: markFeedbackRead } =
    useUnreadCount(feedback, projectId, 'feedback', userId);
  const { count: unreadFiles, markRead: markFilesRead } =
    useUnreadCount(files, projectId, 'files', userId);

  const createTask    = useCreateTask(projectId);
  const updateProject = useUpdateProject(projectId);
  const deleteProject = useDeleteProject();
  const deleteTimeLog = useDeleteTimeLog(projectId);
  const updateTimeLog = useUpdateTimeLog(projectId);

  const [activeTab,       setActiveTab]       = useState<Tab>('tasks');
  const [showTaskForm,    setShowTaskForm]     = useState(false);
  const [showAssignPanel, setShowAssignPanel]  = useState(false);
  const [statusFilter,    setStatusFilter]     = useState<Task['status'] | 'All'>('All');

  const taskLogMap = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const log of logs) {
      map[log.task] = (map[log.task] ?? 0) + Number(log.hours_spent);
    }
    return map;
  }, [logs]);

  useEffect(() => { if (activeTab === 'messages') markMessagesRead(); }, [messages.length, activeTab, markMessagesRead]);
  useEffect(() => { if (activeTab === 'feedback') markFeedbackRead(); }, [feedback.length,      activeTab, markFeedbackRead]);
  useEffect(() => { if (activeTab === 'files')    markFilesRead();    }, [files.length,         activeTab, markFilesRead]);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'messages') markMessagesRead();
    if (tab === 'feedback') markFeedbackRead();
    if (tab === 'files')    markFilesRead();
  };

  if (loadingProject) {
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

  const targetEHR = project.budget_amount && project.budget_hours
    ? Number(project.budget_amount) / Number(project.budget_hours)
    : null;

  const currentEHR = project.budget_amount && project.actual_hours > 0
    ? Number(project.budget_amount) / project.actual_hours
    : null;

  const remaining = project.budget_hours && project.actual_hours != null
    ? Math.max(0, Number(project.budget_hours) - project.actual_hours)
    : null;

  const ehrGood = currentEHR != null && targetEHR != null ? currentEHR >= targetEHR : true;

  const revisions = feedback.filter(f => f.category === 'Revision').length;
  const approvals  = feedback.filter(f => f.category === 'Approval').length;
  const revRatio   = approvals > 0 ? (revisions / approvals).toFixed(1) : null;

  // scopeCreepIndex
  const scopeCreepIndex = scopeEntry != null ? Math.round(scopeEntry.scope_creep_index) : null;
  const unplannedCount = scopeEntry?.unplanned_tasks ?? 0;
  const totalTaskCount = scopeEntry?.total_tasks ?? tasks.length;

  const handleCreateTask = (payload: TaskPayload) => {
    createTask.mutate(payload, { onSuccess: () => setShowTaskForm(false) });
  };

  const handleDelete = () => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    deleteProject.mutate(project.id, { onSuccess: () => navigate('/manager/projects') });
  };

  const parentTaskOptions = tasks.map(t => ({ id: t.id, task_name: t.task_name }));

  const filteredTasks = statusFilter === 'All'
    ? tasks
    : tasks.filter(t => t.status === statusFilter);

  // ── Task tab stats ─────────────────────────────────────────────────────────
  const taskCompletedCount  = tasks.filter(t => t.status === 'Completed').length;
  const taskInProgressCount = tasks.filter(t => t.status === 'InProgress').length;
  const taskUnplannedCount  = tasks.filter(t => t.is_unplanned).length;
  const taskTotalEstimated  = tasks.reduce(
    (sum, t) => sum + (t.estimated_hours != null ? Number(t.estimated_hours) : 0), 0,
  );

  // ── Time log stats ─────────────────────────────────────────────────────────
  const totalLogged = logs.reduce((sum, l) => sum + Number(l.hours_spent), 0);

  const tabContent = (tab: Tab): ReactNode => {
    switch (tab) {
      case 'tasks':    return `Tasks (${tasks.length})`;
      case 'logs':     return `Time Logs (${logs.length})`;
      case 'files':    return <span className="flex items-center">Files ({files.length})<UnreadBadge count={unreadFiles} /></span>;
      case 'feedback': return <span className="flex items-center">Feedback<UnreadBadge count={unreadFeedback} /></span>;
      case 'messages': return <span className="flex items-center">Messages<UnreadBadge count={unreadMessages} /></span>;
    }
  };

  const TABS: Tab[] = ['tasks', 'logs', 'files', 'feedback', 'messages'];

  const category = categoryClass(project.category);

  return (
    <AppShell
      title={project.project_name}
      breadcrumb={`Projects / ${project.project_name}`}
      actions={
        <div className="flex items-center gap-2">
          {isManager && (
            <button
              onClick={() => setShowAssignPanel(v => !v)}
              className="border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              + Assign Designer
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            className="border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => exportPDF(projectId)}
            className="bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors"
          >
            Export PDF
          </button>
          {isManager && (
            <button
              onClick={handleDelete}
              className="border border-rose-200 text-rose-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-rose-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      }
    >
      {/* Assign Designer modal */}
      {showAssignPanel && isManager && (
        <AssignDesignerPanel
          project={project}
          onClose={() => setShowAssignPanel(false)}
        />
      )}

      {/* ── Project description ───────────────────────────────────────────── */}
      {project.description && (
        <p className="text-sm text-slate-500 -mt-2 mb-5 leading-relaxed max-w-3xl">
          {project.description}
        </p>
      )}

      {/* ── Meta chips row ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {/* Status — editable for manager */}
        {isManager ? (
          <select
            value={project.status}
            onChange={e => updateProject.mutate({ status: e.target.value as Project['status'] })}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-0 outline-none cursor-pointer ${STATUS_BADGE[project.status]}`}
          >
            <option value="Active" className="bg-white text-slate-700">● Active</option>
            <option value="Completed" className="bg-white text-slate-700">● Completed</option>
            <option value="OnHold" className="bg-white text-slate-700">● On Hold</option>
          </select>
        ) : (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[project.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[project.status]}`} />
            {project.status === 'OnHold' ? 'On Hold' : project.status}
          </span>
        )}

        {/* Deadline */}
        {project.deadline && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
              <rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M4.5 1v3M10.5 1v3M1.5 6h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {project.deadline}
          </span>
        )}

        {/* Client */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M2 13.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          {project.client_name}
        </span>

        {/* Category */}
        {project.category && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${category}`}>
            {project.category}
          </span>
        )}

        {/* Designers count */}
        {project.assignments.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {project.assignments.length} designer{project.assignments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── 4 Metric cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {/* Budget Utilisation */}
        <MetricCard
          label="Budget Utilisation"
          value={budgetPctRounded != null ? `${budgetPctRounded}%` : '—'}
          subtitle={project.actual_hours != null && project.budget_hours
            ? `${Math.round(project.actual_hours)} of ${Math.round(Number(project.budget_hours))} h used`
            : 'No budget set'}
          borderColor="#3b82f6"
        />

        {/* Effective Hourly Rate */}
        <MetricCard
          label="Eff. Hourly Rate"
          value={currentEHR != null ? `${formatTND(currentEHR)} TND` : '—'}
          subtitle={
            targetEHR != null && currentEHR != null
              ? `Target ${formatTND(targetEHR)} TND · ${currentEHR >= targetEHR ? '+' : '−'}${Math.abs(Math.round(currentEHR - targetEHR))} ${currentEHR >= targetEHR ? 'above' : 'below'}`
              : 'No budget set'
          }
          borderColor={currentEHR != null && targetEHR != null
            ? (currentEHR >= targetEHR ? '#10b981' : '#ef4444')
            : '#10b981'}
        />

        {/* Scope Creep Index */}
        <MetricCard
          label="Scope Creep Index"
          value={scopeCreepIndex != null ? `${scopeCreepIndex}%` : '—'}
          subtitle={scopeEntry != null
            ? `${unplannedCount} of ${totalTaskCount} tasks unplanned`
            : 'No task data'}
          borderColor="#f59e0b"
        />

        {/* Rev : Approval Ratio */}
        <MetricCard
          label="Rev : Approval Ratio"
          value={
            revRatio != null
              ? <span>{revRatio} <span className="text-slate-400 text-lg">: 1</span></span>
              : approvals === 0 && revisions === 0 ? '—' : `${revisions} : 0`
          }
          subtitle={`${revisions} revision${revisions !== 1 ? 's' : ''} · ${approvals} approval${approvals !== 1 ? 's' : ''}`}
          borderColor="#ef4444"
        />
      </div>

      {/* ── Budget Progress card ──────────────────────────────────────────── */}
      {project.budget_hours && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          {/* Header row */}
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
                {
                  label: 'CONTRACT', value: project.budget_amount != null
                    ? `${formatTND(Number(project.budget_amount))} TND`
                    : '—', cls: 'text-slate-900'
                },
              ].map(col => (
                <div key={col.label} className="text-right border-l border-slate-100 pl-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{col.label}</p>
                  <p className={`font-mono text-base font-bold leading-tight mt-0.5 ${col.cls}`}>{col.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative mb-1">
            <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${Math.min(budgetPct ?? 0, 100)}%`,
                  backgroundColor: barColor(budgetPct ?? 0),
                }}
              />
            </div>
          </div>

          {/* Bar labels */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>0 h</span>
            <span className="font-mono font-semibold" style={{ color: barColor(budgetPct ?? 0) }}>
              {Math.round(project.actual_hours)} h · {budgetPctRounded}%
            </span>
            <span>{Math.round(Number(project.budget_hours))} h</span>
          </div>

          {/* Legend + EHR */}
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
                  {Math.round(targetEHR)} TND
                </span>
                {' · '}
                Current EHR:{' '}
                <span className={`font-semibold ${ehrGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {Math.round(currentEHR)} TND
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── AI Summary (Manager only) ─────────────────────────────────────── */}
      {isManager && <AISummaryCard projectId={projectId} />}

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

      {/* ── Tab: Tasks ───────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            {/* Stats — left side */}
            <p className="text-sm text-slate-500 shrink-0">
              <span className="font-medium text-slate-700">{tasks.length} Task{tasks.length !== 1 ? 's' : ''}</span>
              {taskCompletedCount > 0  && <> · <span className="text-emerald-600">{taskCompletedCount} Completed</span></>}
              {taskInProgressCount > 0 && <> · <span className="text-blue-600">{taskInProgressCount} In Progress</span></>}
              {taskUnplannedCount > 0  && <> · <span className="text-rose-600">{taskUnplannedCount} Unplanned</span></>}
              {taskTotalEstimated > 0  && (
                <> <span className="text-slate-300 mx-1">|</span> Total estimated{' '}
                  <span className="font-mono font-semibold text-slate-700">{taskTotalEstimated} h</span>
                </>
              )}
            </p>

            {/* Controls — right side */}
            <div className="flex items-center gap-3 shrink-0">
              {isManager && (
                <button
                  onClick={() => setShowTaskForm(v => !v)}
                  className={
                    showTaskForm
                      ? 'border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors'
                      : 'bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors'
                  }
                >
                  {showTaskForm ? 'Cancel' : '+ Add Task'}
                </button>
              )}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer transition-colors hover:bg-slate-50"
              >
                <option value="All">All statuses</option>
                <option value="Todo">Todo</option>
                <option value="InProgress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {showTaskForm && isManager && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">New task</p>
              <TaskForm
                projectId={projectId}
                onSubmit={handleCreateTask}
                isLoading={createTask.isPending}
                parentTaskOptions={parentTaskOptions}
              />
            </div>
          )}

          {loadingTasks ? (
            <p className="text-sm text-slate-400">Loading tasks…</p>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-10 text-center">
              <p className="text-sm text-slate-400">
                {statusFilter !== 'All' ? 'No tasks match this status.' : 'No tasks yet.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-7 py-3 text-left   text-xs font-semibold uppercase tracking-wide text-slate-400">Task</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 w-32">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 w-28">Estimated</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 w-24">Logged</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 w-28">Variance</th>
                    <th className="w-36" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      projectId={projectId}
                      isManager={isManager}
                      loggedHours={taskLogMap[task.id] ?? 0}
                      taskLogMap={taskLogMap}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Time Logs ───────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div>
          <div className="flex items-center mb-4">
            <p className="text-sm text-slate-500">
              Total logged{' '}
              <span className="font-mono font-semibold text-slate-900">{totalLogged.toFixed(1)} h</span>
            </p>
          </div>
          <TimeLogList
            logs={logs}
            isManager={isManager}
            onDelete={id => deleteTimeLog.mutate(id)}
            onUpdate={(id, payload) => updateTimeLog.mutate({ id, payload })}
          />
        </div>
      )}

      {/* ── Tab: Files ───────────────────────────────────────────────────── */}
      {activeTab === 'files' && (
        <FileUploadPanel
          projectId={projectId}
          role={user?.role ?? 'Manager'}
          isManager={isManager}
        />
      )}

      {/* ── Tab: Feedback ────────────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <FeedbackList projectId={projectId} canUpdate={true} canReply={true} />
      )}

      {/* ── Tab: Messages ────────────────────────────────────────────────── */}
      {activeTab === 'messages' && (
        <MessageBoard projectId={projectId} />
      )}
    </AppShell>
  );
}