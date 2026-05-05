import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { getAllFeedback } from '../../api/feedbacks';
import { getAllMessages } from '../../api/messages';
import { getAllFiles } from '../../api/files';
import AppShell from '../../components/AppShell';
import { KpiCard } from '../../components/Ui';
import { STATUS_BADGE, STATUS_DOT, barColor, statusLabel, categoryClass } from '../../utils/project';
import { formatTND } from '../../utils/format';
import {
  FolderOpen, MessageSquare, DollarSign,
  Calendar, Bell, FileText, CheckCircle2,
} from 'lucide-react';

// ─── Recent update item type ──────────────────────────────────────────────────

type UpdateKind = 'message' | 'file' | 'feedback_resolved' | 'feedback_update';

interface UpdateItem {
  kind:      UpdateKind;
  title:     string;
  subtitle:  string;
  date:      string;
  projectName: string;
}

const UPDATE_META: Record<UpdateKind, { icon: React.ReactNode; color: string; bg: string }> = {
  message:           { icon: <MessageSquare size={13} />, color: '#6366f1', bg: '#eef2ff' },
  file:              { icon: <FileText      size={13} />, color: '#0891b2', bg: '#e0f2fe' },
  feedback_resolved: { icon: <CheckCircle2  size={13} />, color: '#16a34a', bg: '#dcfce7' },
  feedback_update:   { icon: <Bell          size={13} />, color: '#d97706', bg: '#fef3c7' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const { user } = useAuth();
  const userId   = user?.user_id ?? 0;
  const { data: projects = [], isLoading } = useProjects();

  const { data: allFeedback = [] } = useQuery({
    queryKey: ['feedback-all'],
    queryFn:  getAllFeedback,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['messages-all'],
    queryFn:  getAllMessages,
  });

  const { data: allFiles = [] } = useQuery({
    queryKey: ['files-all'],
    queryFn:  getAllFiles,
  });

  // ── KPI values ────────────────────────────────────────────────────────────

  const totalContractValue = projects.reduce(
    (sum, p) => sum + (p.budget_amount != null ? Number(p.budget_amount) : 0), 0,
  );

  const pendingFeedback = allFeedback.filter(
    f => (f.status === 'Pending' || f.status === 'InProgress') && f.category !== 'Approval',
  ).length;

  const unreadMessages = allMessages.filter(
    m => !m.is_read && Number(m.sender) !== Number(userId),
  ).length;

  // ── Recent updates ────────────────────────────────────────────────────────

  const recentUpdates: UpdateItem[] = (() => {
    const projectMap = new Map(projects.map(p => [p.id, p.project_name]));
    const items: UpdateItem[] = [];

    allMessages
      .filter(m => Number(m.sender) !== Number(userId))
      .forEach(m => items.push({
        kind:        'message',
        title:       `Message from ${m.sender_name}`,
        subtitle:    m.content_text.length > 72 ? m.content_text.slice(0, 72) + '…' : m.content_text,
        date:        m.created_at,
        projectName: projectMap.get(m.project) ?? 'Project',
      }));

    allFiles
      .filter(f => Number(f.uploaded_by) !== Number(userId))
      .forEach(f => items.push({
        kind:        'file',
        title:       f.file_type === 'deliverable' ? 'New deliverable ready' : 'File uploaded',
        subtitle:    f.file_name,
        date:        f.uploaded_at,
        projectName: projectMap.get(f.project) ?? 'Project',
      }));

    allFeedback
      .filter(f => f.status === 'Resolved' && f.resolved_at)
      .forEach(f => items.push({
        kind:        'feedback_resolved',
        title:       'Feedback resolved',
        subtitle:    f.content_text.length > 72 ? f.content_text.slice(0, 72) + '…' : f.content_text,
        date:        f.resolved_at!,
        projectName: projectMap.get(f.project) ?? 'Project',
      }));

    allFeedback
      .filter(f => f.status === 'InProgress')
      .forEach(f => items.push({
        kind:        'feedback_update',
        title:       'Feedback in progress',
        subtitle:    f.content_text.length > 72 ? f.content_text.slice(0, 72) + '…' : f.content_text,
        date:        f.submitted_at,
        projectName: projectMap.get(f.project) ?? 'Project',
      }));

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  })();

  return (
    <AppShell title="Dashboard">
      <div className="mb-5">
        <p className="text-sm text-slate-500">
          Welcome back, <span className="font-medium text-slate-700">{user?.full_name}</span>
        </p>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <KpiCard
          label="My Projects"
          value={projects.length}
          icon={<FolderOpen size={15} />}
          borderColor="#22c55e"
        />
        <KpiCard
          label="Pending Feedback"
          value={pendingFeedback}
          icon={<MessageSquare size={15} />}
          borderColor="#f59e0b"
        />
        <KpiCard
          label="Total Contract Value"
          value={formatTND(totalContractValue)}
          icon={<DollarSign size={15} />}
          borderColor="#3b82f6"
        />
        <KpiCard
          label="Unread Messages"
          value={unreadMessages}
          icon={<Bell size={15} />}
          borderColor="#6366f1"
        />
      </div>

      {/* ── Main grid: Projects + Recent Updates ──────────────────────────── */}
      <div className="grid grid-cols-[1fr_340px] gap-3.5">

        {/* Project list */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="section-title mb-0">My Projects</p>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-400 px-4 py-6">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-slate-400 px-4 py-10 text-center">No projects yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {projects.map(p => {
                const pct = p.budget_hours && p.actual_hours != null
                  ? Math.min(100, Math.round((p.actual_hours / Number(p.budget_hours)) * 100))
                  : null;

                return (
                  <Link
                    key={p.id}
                    to={`/client/projects/${p.id}`}
                    className="block px-5 py-4 hover:bg-slate-50/70 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors">
                          {p.project_name}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                          {statusLabel(p.status)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-2.5">
                      {p.category && (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${categoryClass(p.category)}`}>
                          {p.category}
                        </span>
                      )}
                      {p.deadline && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <Calendar size={11} />
                          Due {p.deadline}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        {pct !== null ? (
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor(pct) }} />
                        ) : (
                          <div className="h-full" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {p.budget_hours ? (
                          <span className="font-mono text-xs text-slate-500">
                            {Math.round(p.actual_hours)} / {Math.round(Number(p.budget_hours))} h
                          </span>
                        ) : null}
                        {p.budget_amount != null && (
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {formatTND(Number(p.budget_amount))}
                          </span>
                        )}
                      </div>
                    </div>

                    {p.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-1">{p.description}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Updates */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="section-title mb-0">Recent Updates</p>
          </div>

          {recentUpdates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
              <Bell size={22} className="mb-2 opacity-40" />
              No recent activity
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentUpdates.map((item, i) => {
                const meta = UPDATE_META[item.kind];
                return (
                  <li key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
                    <div
                      className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(item.date)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.projectName}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}