import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Status Badge ─────────────────────────────────────────────────────────────

type ProjectStatus = 'Active' | 'Completed' | 'OnHold';
type TaskStatus    = 'Todo' | 'InProgress' | 'Completed';
type FeedbackStatus = 'Pending' | 'InProgress' | 'Resolved';
type FeedbackCategory = 'Revision' | 'Approval' | 'Question';

type AnyStatus = ProjectStatus | TaskStatus | FeedbackStatus | FeedbackCategory | string;

const STATUS_STYLES: Record<string, string> = {
  // Project
  Active:     'badge-active',
  Completed:  'badge-done',
  OnHold:     'badge-hold',
  // Task
  InProgress: 'badge-active',
  Todo:       'badge-pending',
  // Feedback status
  Pending:    'badge-pending',
  Resolved:   'badge-done',
  // Feedback category
  Revision:   'badge-revision',
  Approval:   'badge-done',
  Question:   'badge-hold',
};

const STATUS_LABELS: Record<string, string> = {
  InProgress: 'In Progress',
  OnHold:     'On Hold',
};

export function StatusBadge({ value }: { value: AnyStatus }) {
  const cls   = STATUS_STYLES[value] ?? 'badge-pending';
  const label = STATUS_LABELS[value] ?? value;
  return <span className={cls}>{label}</span>;
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

type Priority = 'High' | 'Medium' | 'Low';

const PRIORITY_STYLES: Record<Priority, string> = {
  High:   'badge-high',
  Medium: 'badge-medium',
  Low:    'badge-low',
};

export function PriorityBadge({ value }: { value: Priority | string }) {
  const cls = PRIORITY_STYLES[value as Priority] ?? 'badge-pending';
  return <span className={cls}>{value}</span>;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number;        // 0–100
  showLabel?: boolean;
  color?: string;       // override fill color (Tailwind bg-* class or CSS color)
  height?: string;      // Tailwind h-* class
}

export function ProgressBar({
  value,
  showLabel = false,
  color = 'bg-brand-500',
  height = 'h-1.5',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  const fillColor =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-500' :
    color;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${height} rounded-full bg-[#e8edf5] overflow-hidden`}>
        <div
          className={`${height} rounded-full ${fillColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-ink-secondary w-9 text-right">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700',
];

function nameToColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 'w-7 h-7 text-2xs', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' };

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0
                  ${SIZES[size]} ${nameToColor(name)} ${className}`}
    >
      {initials(name)}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;         // e.g. +12.5 → +12.5%, negative = decrease
  changeLabel?: string;    // e.g. "vs last month"
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
}

export function KpiCard({ label, value, change, changeLabel = 'vs last month', icon, prefix, suffix }: KpiCardProps) {
  const isPositive = (change ?? 0) >= 0;
  const isNeutral  = change === undefined || change === 0;

  return (
    <div className="kpi-card animate-fade-in">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{label}</span>
        {icon && (
          <span className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500">
            {icon}
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-ink-primary leading-none">
        {prefix}<span>{value}</span>{suffix}
      </p>

      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isNeutral ? 'text-ink-muted' : isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isNeutral ? (
            <Minus size={12} />
          ) : isPositive ? (
            <TrendingUp size={12} />
          ) : (
            <TrendingDown size={12} />
          )}
          <span>{isPositive && change > 0 ? '+' : ''}{change}%</span>
          <span className="text-ink-muted font-normal">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}

export function SectionCard({ title, action, children, className = '', noPad = false }: SectionCardProps) {
  return (
    <div className={`card ${noPad ? '' : 'p-5'} ${className}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between ${noPad ? 'px-5 pt-5 pb-4' : 'mb-4'}`}>
          {title && <h3 className="section-title mb-0">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, message, action }: {
  icon?: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state gap-3">
      {icon && <div className="text-ink-muted opacity-40">{icon}</div>}
      <p className="text-sm">{message}</p>
      {action}
    </div>
  );
}

// ─── Table wrapper ────────────────────────────────────────────────────────────

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">{children}</table>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className="animate-spin text-brand-500"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
