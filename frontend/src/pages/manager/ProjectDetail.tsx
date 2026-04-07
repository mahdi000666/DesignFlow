import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useProject, useUpdateProject, useDeleteProject } from '../../hooks/useProjects';
import { useTasks, useCreateTask } from '../../hooks/useTasks';
import { useTimeLogs, useDeleteTimeLog } from '../../hooks/useTimeLogs';
import { useFiles } from '../../hooks/useFiles';
import { useAuth } from '../../hooks/useAuth';
import TaskForm from '../../components/TaskForm';
import TaskRow from '../../components/TaskRow';
import AssignDesignerPanel from '../../components/AssignDesignerPanel';
import TimeLogList from '../../components/TimeLogList';
import FileUploadPanel from '../../components/FileUploadPanel';
import FeedbackList from '../../components/FeedbackList';
import AppShell from '../../components/AppShell';
import type { TaskPayload, Task } from '../../types/task';
import type { Project } from '../../types/project';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Tab = 'tasks' | 'logs' | 'files' | 'feedback';

const STATUS_BADGE: Record<Project['status'], string> = {
  Active:    'bg-success-light text-success',
  Completed: 'bg-surface2 text-ink3',
  OnHold:    'bg-amber-light text-amber-dark',
};

const barColor = (pct: number) =>
  pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-amber' : 'bg-teal';

const formatTND = (n: number) =>
  `${Math.round(n).toLocaleString()} TND`;

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id }    = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isManager = user?.role === 'Manager';

  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: tasks = [],   isLoading: loadingTasks } = useTasks(projectId);
  const { data: logs  = []                            } = useTimeLogs(projectId);
  const { data: files = []                            } = useFiles(projectId);

  const createTask    = useCreateTask(projectId);
  const updateProject = useUpdateProject(projectId);
  const deleteProject = useDeleteProject();
  const deleteTimeLog = useDeleteTimeLog(projectId);

  const [activeTab,       setActiveTab]       = useState<Tab>('tasks');
  const [showTaskForm,    setShowTaskForm]     = useState(false);
  const [showAssignPanel, setShowAssignPanel]  = useState(false);
  const [statusFilter,    setStatusFilter]     = useState<Task['status'] | 'All'>('All');

  // Pre-compute logged hours per task (and subtask) from all time logs.
  const taskLogMap = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const log of logs) {
      map[log.task] = (map[log.task] ?? 0) + Number(log.hours_spent);
    }
    return map;
  }, [logs]);

  if (loadingProject) {
    return <AppShell title="Project"><p className="font-sans text-[13px] text-ink3">Loading…</p></AppShell>;
  }
  if (!project) {
    return <AppShell title="Project"><p className="font-sans text-[13px] text-danger">Project not found.</p></AppShell>;
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

  // Tab labels with counts
  const tabLabel = (tab: Tab) => {
    switch (tab) {
      case 'tasks':    return `Tasks (${tasks.length})`;
      case 'logs':     return `Time Logs (${logs.length})`;
      case 'files':    return `Files (${files.length})`;
      case 'feedback': return 'Feedback';
    }
  };

  const TABS: Tab[] = ['tasks', 'logs', 'files', 'feedback'];

  return (
    <AppShell
      title={project.project_name}
      breadcrumb={`Projects / ${project.project_name}`}
      actions={
        <div className="flex items-center gap-3">
          {isManager && (
            <button
              onClick={() => setShowAssignPanel(v => !v)}
              className="px-[14px] py-[6px] rounded bg-transparent font-sans text-[12px] text-ink2 border border-border-strong hover:bg-surface2 transition-colors"
            >
              Assign Designer
            </button>
          )}
          <a
            href={`/api/reports/export/?format=pdf&project=${projectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-[14px] py-[6px] rounded bg-ink text-white font-sans text-[12px] font-medium border border-ink hover:bg-[#333] transition-colors"
          >
            Export Report
          </a>
          {isManager && (
            <button
              onClick={handleDelete}
              className="px-[14px] py-[6px] rounded bg-transparent font-sans text-[12px] text-danger border border-danger/30 hover:bg-danger-light transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      }
    >
      {/* ── Assign designer panel (toggled) ─────────────────────────────── */}
      {showAssignPanel && isManager && (
        <div className="mb-6">
          <AssignDesignerPanel project={project} />
        </div>
      )}

      {/* ── Hero card ───────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between gap-8">

          {/* Left: meta + name + description + budget bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {/* Status badge (editable for manager) */}
              {isManager ? (
                <select
                  value={project.status}
                  onChange={e => updateProject.mutate({ status: e.target.value as Project['status'] })}
                  className={`inline-block px-2 py-[3px] rounded font-sans text-[11px] font-semibold border-0 outline-none cursor-pointer ${STATUS_BADGE[project.status]}`}
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="OnHold">On Hold</option>
                </select>
              ) : (
                <span className={`inline-block px-2 py-[3px] rounded font-sans text-[11px] font-semibold ${STATUS_BADGE[project.status]}`}>
                  {project.status}
                </span>
              )}
              <span className="font-sans text-[13px] text-ink2">
                {project.client_name}
                {project.deadline && (
                  <> · Due {fmtDate(project.deadline)}</>
                )}
              </span>
            </div>

            <h2 className="font-serif text-[22px] font-normal text-ink mb-2">
              {project.project_name}
            </h2>

            {project.description && (
              <p className="font-sans text-[13px] text-ink2 mb-4 leading-relaxed">
                {project.description}
              </p>
            )}

            {budgetPct !== null && (
              <div>
                <div className="font-sans text-[11px] text-ink3 mb-[6px]">
                  Budget utilisation · {budgetPct}%
                </div>
                <div className="bg-surface2 rounded-full h-[6px] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] ${barColor(budgetPct)}`}
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: key metrics */}
          <div className="flex items-start gap-8 shrink-0 text-center">
            <div>
              <div className="font-serif text-[20px] font-normal text-amber leading-none">
                {project.budget_amount != null ? formatTND(Number(project.budget_amount)) : '—'}
              </div>
              <div className="font-sans text-[11px] text-ink3 mt-1">Budget</div>
            </div>
            <div>
              <div className="font-serif text-[20px] font-normal text-ink leading-none">
                {project.actual_hours}h
              </div>
              <div className="font-sans text-[11px] text-ink3 mt-1">
                {project.budget_hours ? `of ${project.budget_hours}h logged` : 'logged'}
              </div>
            </div>
            {ehr !== null && (
              <div>
                <div className="font-serif text-[20px] font-normal text-teal leading-none">
                  {formatTND(ehr)}
                </div>
                <div className="font-sans text-[11px] text-ink3 mt-1">EHR</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-[18px] py-[10px] font-sans text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'text-ink border-amber'
                : 'text-ink3 border-transparent hover:text-ink'
            }`}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {/* ── Tab: Tasks ───────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div>
          {/* Toolbar */}

          <div className="flex items-center gap-3 mb-4">
          {isManager && (
              <button
                onClick={() => setShowTaskForm(v => !v)}
                className="px-[14px] py-[6px] rounded bg-ink text-white font-sans text-[12px] font-medium border border-ink hover:bg-[#333] transition-colors"
              >
                {showTaskForm ? 'Cancel' : '+ Add Task'}
              </button>
            )}
            
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-[14px] py-[6px] rounded bg-surface font-sans text-[12px] text-ink2 border border-border-strong outline-none focus:border-amber hover:bg-surface2 cursor-pointer transition-colors"
            >
              <option value="All">All statuses</option>
              <option value="Todo">Todo</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Inline create form */}
          {showTaskForm && isManager && (
            <div className="bg-surface border border-border rounded-lg p-4 mb-4">
              <p className="font-sans text-[11px] uppercase tracking-[0.6px] text-ink3 mb-3">New task</p>
              <TaskForm
                projectId={projectId}
                onSubmit={handleCreateTask}
                isLoading={createTask.isPending}
                parentTaskOptions={parentTaskOptions}
              />
            </div>
          )}

          {/* Task table */}
          {loadingTasks ? (
            <p className="font-sans text-[13px] text-ink3">Loading tasks…</p>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg px-4 py-8 text-center">
              <p className="font-sans text-[13px] text-ink3">
                {statusFilter !== 'All' ? 'No tasks match this status.' : 'No tasks yet.'}
              </p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface2 border-b border-border">
                    <th className="w-12 px-4 py-3" />
                    {['Task', 'Type', 'Estimated', 'Logged', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-sans text-[11px] font-semibold uppercase tracking-[0.5px] text-ink3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
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
        <FeedbackList projectId={projectId} canUpdate={true} />
      )}
    </AppShell>
  );
}