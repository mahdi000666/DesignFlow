import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Status Badge ─────────────────────────────────────────────────────────────

type ProjectStatus = 'Active' | 'Completed' | 'OnHold';
type TaskStatus    = 'Todo' | 'InProgress' | 'Completed';
type FeedbackStatus = 'Pending' | 'InProgress' | 'Resolved';
type FeedbackCategory = 'Revision' | 'Approval' | 'Question';

type AnyStatus = ProjectStatus | TaskStatus | FeedbackStatus | FeedbackCategory | string;

const STATUS_STYLES: Record<string, string> = {
  Active:     'badge-active',
  Completed:  'badge-done',
  OnHold:     'badge-hold',
  InProgress: 'badge-active',
  Todo:       'badge-pending',
  Pending:    'badge-pending',
  Resolved:   'badge-done',
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
  value: number;
  showLabel?: boolean;
  color?: string;
  height?: string;
}

export function ProgressBar({
  value,
  showLabel = false,
  color = 'bg-primary',
  height = 'h-1.5',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${height} rounded-full bg-slate-100 overflow-hidden`}>
        <div
          className={`${height} rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-slate-500 w-9 text-right">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-red-100 text-red-700',
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
  src?: string | null;
}

const SIZES = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' };

export function Avatar({ name, size = 'md', className = '', src }: AvatarProps) {
  const sizeClass = SIZES[size];
  if (src) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full flex-shrink-0 shadow-sm ring-2 ring-white overflow-hidden ${sizeClass} ${className}`}
      >
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold flex-shrink-0 shadow-sm ring-2 ring-white
                  ${sizeClass} ${nameToColor(name)} ${className}`}
    >
      {initials(name)}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  borderColor?: string;
  footer?: React.ReactNode;
}

export function KpiCard({
  label,
  value,
  change,
  changeLabel = 'vs last month',
  icon,
  prefix,
  suffix,
  borderColor,
  footer,
}: KpiCardProps) {
  const isPositive = (change ?? 0) >= 0;
  const isNeutral  = change === undefined || change === 0;

  return (
    <div className="kpi-card hover-lift">
      {borderColor && (
        <div
          className="absolute left-0 inset-y-0 w-1 rounded-l-xl"
          style={{ backgroundColor: borderColor }}
        />
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        {icon && (
          <span className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary shadow-sm">
            {icon}
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
        {prefix}<span>{value}</span>{suffix}
      </p>

      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isNeutral ? 'text-slate-400' : isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isNeutral ? <Minus size={12} /> : isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isPositive && change > 0 ? '+' : ''}{change}%</span>
          <span className="text-slate-400 font-normal">{changeLabel}</span>
        </div>
      )}

      {footer && (
        <div className="mt-3 pt-2.5 border-t border-slate-50">
          {footer}
        </div>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}

export function SectionCard({ title, action, children, className = '', noPad = false }: SectionCardProps) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pt-5 pb-4">
          {title && <h3 className="section-title mb-0">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
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
    <div className="card flex flex-col items-center justify-center py-12 px-6 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 shadow-sm">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-500 mb-3">{message}</p>
      {action}
    </div>
  );
}

// ─── Table wrapper ────────────────────────────────────────────────────────────

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <table className="data-table">{children}</table>
    </div>
  );
}