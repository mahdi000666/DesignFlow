import { useParams } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useProject } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { useTimeLogs, useCreateTimeLog, useUpdateTimeLog } from '../../hooks/useTimeLogs';
import { useFiles } from '../../hooks/useFiles';
import { useMessages } from '../../hooks/useMessages';
import { useFeedback } from '../../hooks/useFeedback';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useAuth } from '../../hooks/useAuth';
import TimeLogForm from '../../components/TimeLogForm';
import TimeLogList from '../../components/TimeLogList';
import FileUploadPanel from '../../components/FileUploadPanel';
import FeedbackList from '../../components/FeedbackList';
import MessageBoard from '../../components/MessageBoard';
import TaskRow from '../../components/TaskRow';
import AppShell from '../../components/AppShell';
import { KpiCard } from '../../components/Ui';
import type { Task } from '../../types/task';
import type { TimeLogPayload } from '../../types/timelog';
import { formatEHR, formatTND } from '../../utils/format';
import { STATUS_BADGE, STATUS_DOT, barColor, statusLabel, categoryClass } from '../../utils/project';
import UnreadBadge from '../../components/UnreadBadge';
import {
  Calendar, User, Tag, Clock, CheckCircle2, Activity, FolderOpen, ListTodo, Timer, BarChart3,
} from 'lucide-react';

type Tab = 'tasks' | 'log' | 'files' | 'feedback' | 'messages';

export default function DesignerProjectDetail() {
  const { id }    = useParams<{ id: string }>();
  const projectId = Number(id);
  const { user }  = useAuth();
  const userId = Number(user?.user_id ?? 0);

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
  const { count: unreadTasks, markRead: markTasksRead } =
    useUnreadCount(tasks, projectId, 'tasks', userId);
  const { count: unreadFiles, markRead: markFilesRead } =
    useUnreadCount(files, projectId, 'files', userId);

  const createTimeLog = useCreateTimeLog(projectId);
  const updateTimeLog = useUpdateTimeLog(projectId);

  const [activeTab,    setActiveTab]    = useState<Tab>('tasks');
  const [showLogForm,  setShowLogForm]  = useState(false);
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'All'>('All');

  const taskLogMap = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const log of logs) {
      map[log.task] = (map[log.task] ?? 0) + Number(log.hours_spent);
    }
    return map;
  }, [logs]);

  const allTasks = tasks.flatMap(t => [t, ...t.subtasks]);

  const handleLogTime = (payload: TimeLogPayload) => {
    createTimeLog.mutate(payload, { onSuccess: () => setShowLogForm(false) });
  };

  useEffect(() => { if (activeTab === 'messages') markMessagesRead(); }, [messages.length, activeTab, markMessagesRead]);
  useEffect(() => { if (activeTab === 'feedback') markFeedbackRead(); }, [feedback.length,     activeTab, markFeedbackRead]);
  useEffect(() => { if (activeTab === 'tasks')    markTasksRead();    }, [tasks.length,         activeTab, markTasksRead]);
  useEffect(() => { if (activeTab === 'files')    markFilesRead();    }, [files.length,          activeTab, markFilesRead]);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'messages') markMessagesRead();
    if (tab === 'feedback') markFeedbackRead();
    if (tab === 'tasks')    markTasksRead();
    if (tab === 'files')    markFilesRead();
  };

  const filteredTasks = statusFilter === 'All'
    ? tasks
    : tasks.filter(t => t.status === statusFilter);

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
  const ehrGood = currentEHR != null && targetEHR != null ? currentEHR >= targetEHR : true;

  const myLogs        = useMemo(() => logs.filter(l => l.designer_user_id === userId), [logs, userId]);
  const myHours       = myLogs.reduce((sum, l) => sum + Number(l.hours_spent), 0);

  const taskDoneCount = tasks.filter(t => t.status === 'Completed').length;
  const taskOpenCount = tasks.length - taskDoneCount;
  const taskTodoCount = tasks.filter(t => t.status === 'Todo').length;
  const taskInProgressCount = tasks.filter(t => t.status === 'InProgress').length;

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
    <AppShell title={project.project_name}>

      {/* ── Meta chips ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap mb-6">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_BADGE[project.status]}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[project.status]}`} />
          {statusLabel(project.status)}
        </span>

        {project.deadline && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 border border-blue-100 text-blue-700 shadow-sm">
            <Calendar size={12} />
            {project.deadline}
          </span>
        )}

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-violet-50 border border-violet-100 text-violet-700 shadow-sm">
          <User size={12} />
          {project.client_name}
        </span>

        {project.category && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${categoryClass(project.category)}`}>
            <Tag size={12} className="opacity-70" />
            {project.category}
          </span>
        )}
      </div>

      {/* ── 3 KPI cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <KpiCard
          label="My Tasks"
          value={tasks.length}
          icon={<FolderOpen size={15} />}
        />
        <KpiCard
          label="My Hours Logged"
          value={`${myHours.toFixed(1)} h`}
          icon={<Clock size={15} />}
        />
        <KpiCard
          label="Budget Utilisation"
          value={budgetPctRounded != null ? `${budgetPctRounded}%` : '—'}
          icon={<BarChart3 size={15} />}
        />
        <KpiCard
          label="Tasks Done"
          value={taskDoneCount}
          icon={<CheckCircle2 size={15} />}
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
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">

              {taskTodoCount > 0 && (
                <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                  <ListTodo size={14} className="text-slate-500" />
                  <span className="text-xs font-medium text-slate-600">{taskTodoCount} Todo</span>
                </div>
              )}

              {taskDoneCount > 0 && (
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">{taskDoneCount} Done</span>
                </div>
              )}

              {taskInProgressCount > 0 && (
                <div className="inline-flex items-center gap-1.5 bg-primary-50 border border-primary-100 rounded-lg px-3 py-1.5">
                  <Activity size={14} className="text-primary" />
                  <span className="text-xs font-medium text-primary-700">{taskInProgressCount} In Progress</span>
                </div>
              )}

              <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                <Clock size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500">Open</span>
                <span className="text-xs font-mono font-semibold text-slate-700">{taskOpenCount}</span>
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer transition-colors hover:bg-slate-50"
            >
              <option value="All">All statuses</option>
              <option value="Todo">Todo</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

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
                      isManager={false}
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

      {/* ── Tab: Log Time ────────────────────────────────────────────────── */}
      {activeTab === 'log' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary">
                <Timer size={15} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">My Hours Logged</p>
                <p className="font-mono text-lg font-bold text-slate-900 leading-none">{myHours.toFixed(1)} h</p>
              </div>
            </div>
            <button
              onClick={() => setShowLogForm(v => !v)}
              className={
                showLogForm
                  ? 'border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors'
                  : 'bg-primary text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors'
              }
            >
              {showLogForm ? 'Cancel' : '+ Log time'}
            </button>
          </div>
          {showLogForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
              <TimeLogForm tasks={allTasks} isLoading={createTimeLog.isPending} onSubmit={handleLogTime} />
            </div>
          )}
          <TimeLogList
            logs={logs}
            isManager={false}
            currentUserId={Number(user?.user_id)}
            onUpdate={(id, payload) => updateTimeLog.mutate({ id, payload })}
          />
        </div>
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
        <FeedbackList projectId={projectId} canUpdate={true} canReply={true} />
      )}

      {/* ── Tab: Messages ────────────────────────────────────────────────── */}
      {activeTab === 'messages' && (
        <MessageBoard projectId={projectId} />
      )}
    </AppShell>
  );
}