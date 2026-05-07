import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useProject, useUpdateProject, useDeleteProject } from '../../hooks/useProjects';
import { useTasks, useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import { useTimeLogs, useDeleteTimeLog, useUpdateTimeLog } from '../../hooks/useTimeLogs';
import { useFiles } from '../../hooks/useFiles';
import { useMessages, useMarkMessagesRead } from '../../hooks/useMessages';
import { useFeedback } from '../../hooks/useFeedback';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useAuth } from '../../hooks/useAuth';
import { useAISummary, useScopeCreep } from '../../hooks/useAnalytics';
import TaskForm from '../../components/TaskForm';
import AssignDesignerPanel from '../../components/AssignDesignerPanel';
import TimeLogList from '../../components/TimeLogList';
import FileUploadPanel from '../../components/FileUploadPanel';
import FeedbackList from '../../components/FeedbackList';
import MessageBoard from '../../components/MessageBoard';
import KanbanBoard from '../../components/KanbanBoard';
import KanbanTaskCard from '../../components/KanbanTaskCard';
import AppShell from '../../components/AppShell';
import { KpiCard, UnreadBadge } from '../../components/Ui';
import ProjectForm from '../../components/ProjectForm';
import type { TaskPayload } from '../../types/task';
import type { ProjectPayload } from '../../types/project';
import { exportPDF } from '../../api/analytics';
import type { ScopeCreepItem } from '../../types/analytic';
import { STATUS_BADGE, STATUS_DOT, barColor, statusLabel, categoryClass } from '../../utils/project';
import { formatEHR, formatTND } from '../../utils/format';
import {
  BarChart3, DollarSign, AlertTriangle, MessageSquare,
  Calendar, User, Tag, Users, Clock,
  AlertCircle, ChevronDown, X,
} from 'lucide-react';

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
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
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
              className="shrink-0 ml-4 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-600 transition-colors"
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id }    = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isManager = user?.role === 'Manager';
  const userId = Number(user?.user_id ?? 0);

  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: rawTasks = [], isLoading: loadingTasks } = useTasks(projectId);
  const tasks = useMemo(() => [...rawTasks].sort((a, b) => a.id - b.id), [rawTasks]);
  const { data: logs     = [] } = useTimeLogs(projectId);
  const { data: files    = [] } = useFiles(projectId);
  const { data: messages = [] } = useMessages(projectId);
  const { data: feedback = [] } = useFeedback(projectId);

  const { data: scopeCreepData = [] } = useScopeCreep({ project: projectId });
  const scopeEntry = (scopeCreepData as ScopeCreepItem[])[0] as ScopeCreepItem | undefined;

  const markMessagesReadMutation = useMarkMessagesRead(projectId);
  const unreadMessages = messages.filter(
    m => !m.is_read && Number(m.sender) !== Number(userId),
  ).length;
  const { count: unreadFeedback, markRead: markFeedbackRead } =
    useUnreadCount(feedback, projectId, 'feedback', userId);
  const { count: unreadFiles, markRead: markFilesRead } =
    useUnreadCount(files, projectId, 'files', userId);

  const createTask    = useCreateTask(projectId);
  const updateTask    = useUpdateTask(projectId);
  const updateProject = useUpdateProject(projectId);
  const deleteProject = useDeleteProject();
  const deleteTimeLog = useDeleteTimeLog(projectId);
  const updateTimeLog = useUpdateTimeLog(projectId);

  const [activeTab,       setActiveTab]       = useState<Tab>('tasks');
  const [showTaskForm,    setShowTaskForm]     = useState(false);
  const [showAssignPanel, setShowAssignPanel]  = useState(false);
  const [showEditForm,    setShowEditForm]     = useState(false);
  const [statusOpen,      setStatusOpen]       = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const taskLogMap = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const log of logs) {
      map[log.task] = (map[log.task] ?? 0) + Number(log.hours_spent);
    }
    return map;
  }, [logs]);

  // Close status dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    if (statusOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [statusOpen]);

  useEffect(() => {
    if (activeTab === 'messages' && unreadMessages > 0) {
      markMessagesReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, activeTab]);
  useEffect(() => { if (activeTab === 'feedback') markFeedbackRead(); }, [feedback.length,      activeTab, markFeedbackRead]);
  useEffect(() => { if (activeTab === 'files')    markFilesRead();    }, [files.length,         activeTab, markFilesRead]);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    //if (tab === 'messages') markMessagesReadMutation.mutate();
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

  const scopeCreepIndex = scopeEntry != null ? Math.round(scopeEntry.scope_creep_index) : null;

  const handleCreateTask = (payload: TaskPayload) => {
    createTask.mutate(payload, { onSuccess: () => setShowTaskForm(false) });
  };

  const handleDelete = () => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    deleteProject.mutate(project.id, { onSuccess: () => navigate('/manager/projects') });
  };

  const handleUpdateProject = (payload: ProjectPayload) => {
    updateProject.mutate(payload, { onSuccess: () => setShowEditForm(false) });
  };

  const parentTaskOptions = tasks.map(t => ({ id: t.id, task_name: t.task_name }));

  // ── Task tab stats ─────────────────────────────────────────────────────────
  const taskUnplannedCount  = tasks.filter(t => t.is_unplanned).length;
  const taskTotalEstimated  = tasks.reduce(
    (sum, t) => sum + (t.estimated_hours != null ? Number(t.estimated_hours) : 0), 0,
  );

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

    const editDefaults = {
    project_name:  project.project_name,
    client:        String(project.client),
    description:   project.description,
    budget_hours:  project.budget_hours != null ? String(project.budget_hours) : '',
    budget_amount: project.budget_amount != null ? String(project.budget_amount) : '',
    deadline:      project.deadline ?? '',
    status:        project.status,
    category:      project.category,
  };

  return (
    <AppShell
      title={project.project_name}
      breadcrumb={project.description || undefined}
      actions={
        <div className="flex items-center gap-2">
          {isManager && (
            <button
              onClick={() => setShowAssignPanel(v => !v)}
              className="bg-primary text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              + Assign Designer
            </button>
          )}
          <button
            onClick={() => exportPDF(projectId)}
            className="bg-white text-primary border border-primary-200 px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-50 transition-colors"
          >
            Export PDF
          </button>
          {isManager && (
            <>
              <button
                onClick={() => setShowEditForm(v => !v)}
                className={
                  showEditForm
                    ? 'border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors'
                    : 'bg-white text-primary border border-primary-200 px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-50 transition-colors'
                }
              >
                {showEditForm ? 'Cancel' : 'Edit'}
              </button>
              <button
                onClick={handleDelete}
                className="border border-rose-200 text-rose-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-rose-50 transition-colors"
              >
                Delete
              </button>
            </>
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

      {/* ── Meta chips row ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap mb-6">
        {/* Status — custom dropdown for manager */}
        {isManager ? (
          <div className="relative" ref={statusRef}>
            <button
              onClick={() => setStatusOpen(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-90 ${STATUS_BADGE[project.status]}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[project.status]}`} />
              {statusLabel(project.status)}
              <ChevronDown size={12} className={`transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 min-w-[140px] overflow-hidden">
                {(['Active', 'Completed', 'OnHold'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      updateProject.mutate({ status: s });
                      setStatusOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors ${s === project.status ? 'bg-slate-50 text-slate-900' : 'text-slate-600'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[s]}`} />
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_BADGE[project.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[project.status]}`} />
            {statusLabel(project.status)}
          </span>
        )}

        {/* Category */}
        {project.category && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-xs ${categoryClass(project.category)}`}>
            <Tag size={12} className="opacity-70" />
            {project.category}
          </span>
        )}

        {/* Deadline */}
        {project.deadline && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600">
            <Calendar size={12} className="text-blue-500" />
            {project.deadline}
          </span>
        )}

        {/* Client */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600">
          <User size={12} className="text-purple-500" />
          {project.client_name}
        </span>

        {/* Designers count */}
        {project.assignments.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600">
            <Users size={12} className="text-indigo-400" />
            {project.assignments.length} designer{project.assignments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Edit Form ─────────────────────────────────────────────────────── */}
      {showEditForm && isManager && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Edit Project</h3>
            <button
              onClick={() => setShowEditForm(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <ProjectForm
            onSubmit={handleUpdateProject}
            isLoading={updateProject.isPending}
            defaults={editDefaults}
          />
        </div>
      )}

      {/* ── 4 KPI cards (ManagerDashboard style) ──────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <KpiCard
          label="Budget Utilisation"
          value={budgetPctRounded != null ? `${budgetPctRounded}%` : '—'}
          icon={<BarChart3 size={15} />}
          borderColor="#6366f1"
        />
        <KpiCard
          label="Eff. Hourly Rate"
          value={currentEHR != null ? formatEHR(currentEHR) : '—'}
          icon={<DollarSign size={15} />}
          borderColor="#22c55e"
        />
        <KpiCard
          label="Scope Creep Index"
          value={scopeCreepIndex != null ? `${scopeCreepIndex}%` : '—'}
          icon={<AlertTriangle size={15} />}
          borderColor="#f59e0b"
        />
        <KpiCard
          label="Rev : Approval Ratio"
          value={revRatio != null ? `${revRatio} : 1` : approvals === 0 && revisions === 0 ? '—' : `${revisions} : 0`}
          icon={<MessageSquare size={15} />}
          borderColor="#3b82f6"
        />
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
                {
                  label: 'CONTRACT', value: project.budget_amount != null
                    ? `${formatTND(Number(project.budget_amount))}`
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

      {/* ── AI Summary (Manager only) ─────────────────────────────────────── */}
      {isManager && <AISummaryCard projectId={projectId} />}

      {/* ── Tabs (centered) ───────────────────────────────────────────────── */}
      <div className="flex justify-center border-b border-slate-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'text-primary border-primary'
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
          {/* ── Stats + controls bar ─────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {taskUnplannedCount > 0 && (
                <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-100 rounded-lg px-3 py-1.5">
                  <AlertCircle size={14} className="text-rose-600" />
                  <span className="text-xs font-medium text-rose-700">{taskUnplannedCount} Unplanned</span>
                </div>
              )}
              {taskTotalEstimated > 0 && (
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-xs">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-500">Est.</span>
                  <span className="text-xs font-mono font-semibold text-slate-700">{taskTotalEstimated} h</span>
                </div>
              )}
            </div>

            {isManager && (
              <button
                onClick={() => setShowTaskForm(v => !v)}
                className={
                  showTaskForm
                    ? 'border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors'
                    : 'bg-primary text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors'
                }
              >
                {showTaskForm ? 'Cancel' : '+ Add Task'}
              </button>
            )}
          </div>

          {/* ── Inline task form ─────────────────────────────────────────── */}
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

          {/* ── Kanban board ─────────────────────────────────────────────── */}
          <KanbanBoard
            tasks={tasks}
            onStatusChange={(id, status) =>
              updateTask.mutate({ id, payload: { status } })
            }
            isLoading={loadingTasks}
            renderCard={task => (
              <KanbanTaskCard
                task={task}
                isManager={true}
                loggedHours={taskLogMap[task.id] ?? 0}
              />
            )}
          />
        </div>
      )}

      {/* ── Tab: Time Logs ───────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div>
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
         <div className="space-y-5">
        <FeedbackList projectId={projectId} canUpdate={true} canReply={true} />
         </div>
      )}

      {/* ── Tab: Messages ────────────────────────────────────────────────── */}
      {activeTab === 'messages' && (
        <MessageBoard projectId={projectId} />
      )}
    </AppShell>
  );
}