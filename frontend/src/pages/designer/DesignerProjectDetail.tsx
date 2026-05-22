import { useParams } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useProject } from '../../hooks/useProjects';
import { useTasks, useUpdateTask } from '../../hooks/useTasks';
import { useTimeLogs, useActiveTimers, useTimerMutations } from '../../hooks/useTimeLogs';
import { useFiles } from '../../hooks/useFiles';
import { useMessages, useMarkMessagesRead } from '../../hooks/useMessages';
import { useFeedback } from '../../hooks/useFeedback';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useAuth } from '../../hooks/useAuth';
import TimeLogList from '../../components/TimeLogList';
import FileUploadPanel from '../../components/FileUploadPanel';
import FeedbackList from '../../components/FeedbackList';
import MessageBoard from '../../components/MessageBoard';
import AppShell from '../../components/AppShell';
import KanbanBoard from '../../components/KanbanBoard';
import KanbanTaskCard from '../../components/KanbanTaskCard';
import { KpiCard, UnreadBadge } from '../../components/Ui';
import { formatEHR, formatTND } from '../../utils/format';
import { STATUS_BADGE, STATUS_DOT, barColor, statusLabel, categoryClass } from '../../utils/project';
import {
  Calendar, User, Tag, Clock, CheckCircle2, FolderOpen, BarChart3,
} from 'lucide-react';
import type { Task } from '../../types/task';

type Tab = 'tasks' | 'log' | 'files' | 'feedback' | 'messages';

export default function DesignerProjectDetail() {
  const { id }    = useParams<{ id: string }>();
  const projectId = Number(id);
  const { user }  = useAuth();
  const { data: activeSessions = [] } = useActiveTimers();
  const timerMutations = useTimerMutations(projectId);
  const sessionByTask = useMemo(
    () => Object.fromEntries(activeSessions.map(s => [s.task, s])),
    [activeSessions],
  );
  const userId = Number(user?.user_id ?? 0);

  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: rawTasks = [], isLoading: loadingTasks } = useTasks(projectId);
  const tasks = useMemo(() => [...rawTasks].sort((a, b) => a.id - b.id), [rawTasks]);
  const updateTask = useUpdateTask(projectId);
  const { data: logs     = [] } = useTimeLogs(projectId);
  const { data: files    = [] } = useFiles(projectId);
  const { data: messages = [] } = useMessages(projectId);
  const { data: feedback = [] } = useFeedback(projectId);

  const markMessagesReadMutation = useMarkMessagesRead(projectId);
  const unreadMessages = messages.filter(
    m => !m.is_read && Number(m.sender) !== Number(userId),
  ).length;
  const { count: unreadFeedback, markRead: markFeedbackRead } =
    useUnreadCount(feedback, projectId, 'feedback', userId);
  const { count: unreadTasks, markRead: markTasksRead } =
    useUnreadCount(tasks, projectId, 'tasks', userId);
  const { count: unreadFiles, markRead: markFilesRead } =
    useUnreadCount(files, projectId, 'files', userId);

  const [activeTab,    setActiveTab]    = useState<Tab>('tasks');
  const [pendingStopTaskId,  setPendingStopTaskId]  = useState<number | null>(null);
  const [pendingStopCompletesTask, setPendingStopCompletesTask] = useState(false);
  const [stopDescription,    setStopDescription]    = useState('');

  const taskLogMap = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const log of logs) {
      map[log.task] = (map[log.task] ?? 0) + Number(log.hours_spent);
    }
    return map;
  }, [logs]);

  useEffect(() => {
    if (activeTab === 'messages' && unreadMessages > 0) {
      markMessagesReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, activeTab]);
  useEffect(() => { if (activeTab === 'feedback') markFeedbackRead(); }, [feedback.length,     activeTab, markFeedbackRead]);
  useEffect(() => { if (activeTab === 'tasks')    markTasksRead();    }, [tasks.length,         activeTab, markTasksRead]);
  useEffect(() => { if (activeTab === 'files')    markFilesRead();    }, [files.length,          activeTab, markFilesRead]);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    //if (tab === 'messages') markMessagesReadMutation.mutate();
    if (tab === 'feedback') markFeedbackRead();
    if (tab === 'tasks')    markTasksRead();
    if (tab === 'files')    markFilesRead();
  };

  const resetStopModal = () => {
    setPendingStopTaskId(null);
    setPendingStopCompletesTask(false);
    setStopDescription('');
  };

  const handleStop = (taskId: number, completesTask = false) => {
    setPendingStopTaskId(taskId);
    setPendingStopCompletesTask(completesTask);
    setStopDescription('');
  };

  const confirmStop = () => {
    if (pendingStopTaskId == null) return;
    const taskId = pendingStopTaskId;
    const shouldComplete = pendingStopCompletesTask;

    timerMutations.stop.mutate(
      { taskId, description: stopDescription },
      {
        onSuccess: () => {
          if (shouldComplete) {
            updateTask.mutate({ id: taskId, payload: { status: 'Completed' } });
          }
          resetStopModal();
        },
      },
    );
  };

  const handleStatusChange = (taskId: number, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    if (newStatus === 'InProgress' && !sessionByTask[taskId]) {
      timerMutations.start.mutate(taskId);
    }

    if (newStatus === 'Completed' && sessionByTask[taskId]) {
      // Completion is persisted only after the stop request creates the final time log.
      handleStop(taskId, true);
      return;
    }

    updateTask.mutate({ id: taskId, payload: { status: newStatus } });
  };

  const budgetPct = project?.budget_hours && project?.actual_hours != null
    ? Math.min(100, (project.actual_hours / Number(project.budget_hours)) * 100)
    : null;
  const budgetPctRounded = budgetPct != null ? Math.round(budgetPct) : null;

  const remaining = project?.budget_hours && project?.actual_hours != null
    ? Math.max(0, Number(project.budget_hours) - project.actual_hours)
    : null;

  const targetEHR = project?.budget_amount && project?.budget_hours
    ? Number(project.budget_amount) / Number(project.budget_hours)
    : null;
  const currentEHR = project?.budget_amount && project?.actual_hours != null && project.actual_hours > 0
    ? Number(project.budget_amount) / project.actual_hours
    : null;

  const myLogs        = useMemo(() => logs.filter(l => l.designer_user_id === userId), [logs, userId]);
  const myHours       = myLogs.reduce((sum, l) => sum + Number(l.hours_spent), 0);

  const taskDoneCount = tasks.filter(t => t.status === 'Completed').length;

  if (loadingProject) {
    return <AppShell title="Project"><p className="text-sm text-slate-400">Loading…</p></AppShell>;
  }
  if (!project) {
    return <AppShell title="Project"><p className="text-sm text-rose-600">Project not found.</p></AppShell>;
  }

  const tabContent = (tab: Tab): ReactNode => {
    switch (tab) {
      case 'tasks':    return <span className="flex items-center">Tasks ({tasks.length})<UnreadBadge count={unreadTasks} /></span>;
      case 'log':      return `Time Logs (${logs.length})`;
      case 'files':    return <span className="flex items-center">Files ({files.length})<UnreadBadge count={unreadFiles} /></span>;
      case 'feedback': return <span className="flex items-center">Feedback<UnreadBadge count={unreadFeedback} /></span>;
      case 'messages': return <span className="flex items-center">Messages<UnreadBadge count={unreadMessages} /></span>;
    }
  };

  const TABS: Tab[] = ['tasks', 'log', 'files', 'feedback', 'messages'];

  return (
    <AppShell title={project.project_name} breadcrumb={project.description || undefined}>

      {/* ── Meta chips ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap mb-6">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_BADGE[project.status]}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[project.status]}`} />
          {statusLabel(project.status)}
        </span>

        {project.category && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-xs ${categoryClass(project.category)}`}>
            <Tag size={12} className="opacity-70" />
            {project.category}
          </span>
        )}

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
      </div>

      {/* ── 4 KPI cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <KpiCard
          label="My Tasks"
          value={tasks.length}
          icon={<FolderOpen size={15} />}
          borderColor="#6366f1"
        />
        <KpiCard
          label="My Hours Logged"
          value={`${myHours.toFixed(1)} h`}
          icon={<Clock size={15} />}
          borderColor="#22c55e"
        />
        <KpiCard
          label="Budget Utilisation"
          value={budgetPctRounded != null ? `${budgetPctRounded}%` : '—'}
          icon={<BarChart3 size={15} />}
          borderColor="#f59e0b"
        />
        <KpiCard
          label="Tasks Done"
          value={taskDoneCount}
          icon={<CheckCircle2 size={15} />}
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
            {targetEHR != null && currentEHR != null && (
              <p className="text-xs text-slate-400">
                Target EHR:{' '}
                <span className="font-semibold text-slate-700">
                  {formatEHR(targetEHR)}
                </span>
                {' · '}
                Current EHR (interim):{' '}
                <span className="font-semibold text-amber-600">
                  {formatEHR(currentEHR)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

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
          <KanbanBoard
            tasks={tasks}
            onStatusChange={handleStatusChange}
            isLoading={loadingTasks}
            renderCard={(task, columnColor) => (
              <KanbanTaskCard
                task={task}
                columnColor={columnColor}
                isManager={false}
                loggedHours={taskLogMap[task.id] ?? 0}
                session={sessionByTask[task.id]}
                onPause={() => timerMutations.pause.mutate(task.id)}
                onResume={() => timerMutations.resume.mutate(task.id)}
                onStop={() => handleStop(task.id)}
                isPending={timerMutations.isPending}
              />
            )}
          />
        </div>
      )}

      {/* ── Tab: Log Time ────────────────────────────────────────────────── */}
      {activeTab === 'log' && (
        <TimeLogList
          logs={logs}
          isManager={false}
        />
      )}

      {/* ── Tab: Files ───────────────────────────────────────────────────── */}
      {activeTab === 'files' && (
        <FileUploadPanel
          projectId={projectId}
          role={user?.role ?? 'Designer'}
          isManager={false}
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
      {/* ── Stop & Log description modal ─────────────────────────────── */}
      {pendingStopTaskId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">What did you work on?</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a short note describing what you completed. You can leave it blank.
            </p>
            <textarea
              autoFocus
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 resize-none placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
              placeholder="e.g. Finished hero section layout adjustments…"
              value={stopDescription}
              onChange={e => setStopDescription(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirmStop(); }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={resetStopModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStop}
                disabled={timerMutations.isPending}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Stop & Log
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
