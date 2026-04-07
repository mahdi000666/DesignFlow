import { useParams } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useProject } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { useTimeLogs, useCreateTimeLog } from '../../hooks/useTimeLogs';
import { useFiles } from '../../hooks/useFiles';
import { useAuth } from '../../hooks/useAuth';
import TimeLogForm from '../../components/TimeLogForm';
import TimeLogList from '../../components/TimeLogList';
import FileUploadPanel from '../../components/FileUploadPanel';
import FeedbackList from '../../components/FeedbackList';
import TaskRow from '../../components/TaskRow';
import AppShell from '../../components/AppShell';
import type { Task } from '../../types/task';
import type { TimeLogPayload } from '../../types/timelog';
import type { Project } from '../../types/project';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Tab = 'tasks' | 'log' | 'files' | 'feedback';

const STATUS_BADGE: Record<Project['status'], string> = {
  Active:    'bg-success-light text-success',
  Completed: 'bg-surface2 text-ink3',
  OnHold:    'bg-amber-light text-amber-dark',
};

const barColor = (pct: number) =>
  pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-amber' : 'bg-teal';

// ─── Component ───────────────────────────────────────────────────────────────

export default function DesignerProjectDetail() {
  const { id }    = useParams<{ id: string }>();
  const projectId = Number(id);
  const { user }  = useAuth();

  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: tasks = [], isLoading: loadingTasks } = useTasks(projectId);
  const { data: logs  = []                          } = useTimeLogs(projectId);
  const { data: files = []                          } = useFiles(projectId);

  const createTimeLog = useCreateTimeLog(projectId);

  const [activeTab,   setActiveTab]   = useState<Tab>('tasks');
  const [showLogForm, setShowLogForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'All'>('All');

  // Logged hours per task from time logs.
  const taskLogMap = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const log of logs) {
      map[log.task] = (map[log.task] ?? 0) + Number(log.hours_spent);
    }
    return map;
  }, [logs]);

  // Flatten top-level + subtasks for the time log task selector.
  const allTasks = tasks.flatMap(t => [t, ...t.subtasks]);

  const handleLogTime = (payload: TimeLogPayload) => {
    createTimeLog.mutate(payload, { onSuccess: () => setShowLogForm(false) });
  };

  const filteredTasks = statusFilter === 'All'
    ? tasks
    : tasks.filter(t => t.status === statusFilter);

  if (loadingProject) {
    return <AppShell title="Project"><p className="font-sans text-[13px] text-ink3">Loading…</p></AppShell>;
  }
  if (!project) {
    return <AppShell title="Project"><p className="font-sans text-[13px] text-danger">Project not found.</p></AppShell>;
  }

  const budgetPct = project.budget_hours && project.actual_hours != null
    ? Math.min(100, Math.round((project.actual_hours / Number(project.budget_hours)) * 100))
    : null;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'tasks',    label: `Tasks (${tasks.length})`   },
    { id: 'log',      label: `Time Logs (${logs.length})` },
    { id: 'files',    label: `Files (${files.length})`   },
    { id: 'feedback', label: 'Feedback'                   },
  ];

  return (
    <AppShell title={project.project_name} breadcrumb={project.client_name}>

      {/* ── Hero card ───────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className={`inline-block px-2 py-[3px] rounded font-sans text-[11px] font-semibold ${STATUS_BADGE[project.status]}`}>
            {project.status}
          </span>
          <span className="font-sans text-[13px] text-ink2">
            {project.client_name}
            {project.deadline && <> · Due {project.deadline}</>}
          </span>
        </div>
        <h2 className="font-serif text-[22px] font-normal text-ink mb-4">{project.project_name}</h2>
        {budgetPct !== null && (
          <div>
            <div className="font-sans text-[11px] text-ink3 mb-[6px]">Budget utilisation · {budgetPct}%</div>
            <div className="bg-surface2 rounded-full h-[6px] overflow-hidden">
              <div className={`h-full rounded-full ${barColor(budgetPct)}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-[18px] py-[10px] font-sans text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'text-ink border-amber'
                : 'text-ink3 border-transparent hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Tasks ───────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div>
          <div className="flex items-center justify-end mb-4">
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

          {loadingTasks ? (
            <p className="font-sans text-[13px] text-ink3">Loading tasks…</p>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg px-4 py-8 text-center">
              <p className="font-sans text-[13px] text-ink3">No tasks yet.</p>
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
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowLogForm(v => !v)}
              className="px-[14px] py-[6px] rounded bg-ink text-white font-sans text-[12px] font-medium border border-ink hover:bg-[#333] transition-colors"
            >
              {showLogForm ? 'Cancel' : '+ Log time'}
            </button>
          </div>
          {showLogForm && (
            <div className="bg-surface border border-border rounded-lg p-4 mb-4">
              <TimeLogForm tasks={allTasks} isLoading={createTimeLog.isPending} onSubmit={handleLogTime} />
            </div>
          )}
          <TimeLogList logs={logs} isManager={false} />
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
        <FeedbackList projectId={projectId} canUpdate={true} />
      )}
    </AppShell>
  );
}