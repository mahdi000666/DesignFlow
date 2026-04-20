import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useProject, useUpdateProject, useDeleteProject } from '../../hooks/useProjects';
import { useTasks, useCreateTask } from '../../hooks/useTasks';
import { useTimeLogs, useDeleteTimeLog, useUpdateTimeLog  } from '../../hooks/useTimeLogs';
import { useFiles } from '../../hooks/useFiles';
import { useMessages } from '../../hooks/useMessages';
import { useFeedback } from '../../hooks/useFeedback';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useAuth } from '../../hooks/useAuth';
import { useAISummary } from '../../hooks/useAnalytics';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Tab = 'tasks' | 'logs' | 'files' | 'feedback' | 'messages';

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

const formatTND = (n: number) =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')} TND`;

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

// ─── AI Summary card ─────────────────────────────────────────────────────────

function AISummaryCard({ projectId }: { projectId: number }) {
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading, isError, refetch, isFetching } = useAISummary(
    enabled ? projectId : undefined
  );

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          AI Project Health Summary
        </p>
        {enabled && data && (
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors"
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      {!enabled && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-blue-600">
            Generate an AI-powered health narrative for this project.
          </p>
          <button
            onClick={() => setEnabled(true)}
            className="shrink-0 ml-4 bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors"
          >
            Generate Summary
          </button>
        </div>
      )}

      {enabled && isLoading  && <p className="text-sm text-blue-600">Analysing project data…</p>}
      {enabled && isError    && <p className="text-sm text-rose-600">Failed to generate summary. Check that GROQ_API_KEY is configured.</p>}
      {enabled && data       && <p className="text-sm text-slate-700 leading-relaxed">{data.summary}</p>}
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

  const budgetPct = project.budget_hours && project.actual_hours != null
    ? Math.min(100, Math.round((project.actual_hours / Number(project.budget_hours)) * 100))
    : null;

  const ehr = project.budget_amount && project.actual_hours > 0
    ? Number(project.budget_amount) / project.actual_hours
    : null;

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
              Assign Designer
            </button>
          )}
          <a
            href={`/api/reports/export/?format=pdf&project=${projectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors"
          >
            Export Report
          </a>
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
      {showAssignPanel && isManager && (
        <div className="mb-6">
          <AssignDesignerPanel project={project} />
        </div>
      )}

      {/* ── Hero card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-8 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-3 flex-wrap">
              {isManager ? (
                <select
                  value={project.status}
                  onChange={e => updateProject.mutate({ status: e.target.value as Project['status'] })}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-0 outline-none cursor-pointer ${STATUS_BADGE[project.status]}`}
                >
                  <option value="Active" className="bg-white text-slate-700">Active</option>
                  <option value="Completed" className="bg-white text-slate-700">Completed</option>
                  <option value="OnHold" className="bg-white text-slate-700">On Hold</option>
                </select>
              ) : (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[project.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[project.status]}`} />
                  {project.status === 'OnHold' ? 'On Hold' : project.status}
                </span>
              )}
              <span className="text-sm text-slate-500">
                {project.client_name}
                {project.deadline && <> · Due {fmtDate(project.deadline)}</>}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">{project.project_name}</h2>
            {project.description && (
              <p className="text-sm text-slate-500 leading-relaxed">{project.description}</p>
            )}
          </div>

          <div className="flex items-start gap-8 shrink-0">
            <div className="text-center">
              <p className="font-mono text-lg font-semibold text-amber-600 leading-none">
                {project.budget_amount != null ? formatTND(Number(project.budget_amount)) : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Budget</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-lg font-semibold text-slate-900 leading-none">
                {project.actual_hours}h
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {project.budget_hours ? `of ${project.budget_hours}h` : 'logged'}
              </p>
            </div>
            {ehr !== null && (
              <div className="text-center">
                <p className="font-mono text-lg font-semibold text-teal-700 leading-none">
                  {formatTND(ehr)}
                </p>
                <p className="text-xs text-slate-400 mt-1">EHR</p>
              </div>
            )}
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
                style={{ width: `${Math.min(budgetPct, 100)}%`, backgroundColor: barColor(budgetPct) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── AI Summary card (Manager only) ──────────────────────────────── */}
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
          <div className="flex justify-end gap-3 mb-4">
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
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 w-36">Type</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 w-28">Estimated</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 w-24">Logged</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 w-32">Status</th>
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
        <TimeLogList
          logs={logs}
          isManager={isManager}
          onDelete={id => deleteTimeLog.mutate(id)}
          onUpdate={(id, payload) => updateTimeLog.mutate({ id, payload })}
        />
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