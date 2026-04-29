import { useState } from 'react';
import AppShell from '../../components/AppShell';
import { useTeam, useInviteUser } from '../../hooks/useUsers';
import type { DesignerCard, TeamUser } from '../../types/user';
import { formatEHR, Initials  } from '../../utils/format';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  '#7c3aed', // violet
  '#0d9488', // teal
  '#dc2626', // red
  '#d97706', // amber
  '#1d4ed8', // blue
  '#15803d', // green
  '#db2777', // pink
  '#0891b2', // cyan
];

function avatarColor(id: number): string {
  return AVATAR_PALETTE[id % AVATAR_PALETTE.length];
}

function utilColor(pct: number): string {
  if (pct > 90) return '#ef4444';
  if (pct > 75) return '#f59e0b';
  return '#10b981';
}

function utilTextClass(pct: number): string {
  if (pct > 90) return 'text-rose-600';
  if (pct > 75) return 'text-amber-600';
  return 'text-emerald-600';
}

const ROLE_BADGE: Record<string, string> = {
  Manager:  'bg-blue-50  text-blue-700  border-blue-200',
  Designer: 'bg-violet-50 text-violet-700 border-violet-200',
  Client:   'bg-teal-50  text-teal-700  border-teal-200',
};

// ─── Invite modal ─────────────────────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void;
}

function InviteModal({ onClose }: InviteModalProps) {
  const { mutateAsync, isPending } = useInviteUser();

  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [role,        setRole]        = useState<'Designer' | 'Client'>('Designer');
  const [hourlyRate,  setHourlyRate]  = useState('');
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');

  const inputCls =
    'w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors placeholder:text-slate-400';

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required.');
      return;
    }
    if (role === 'Designer' && !hourlyRate) {
      setError('Hourly rate is required for Designer accounts.');
      return;
    }

    try {
      await mutateAsync({
        full_name:   fullName.trim(),
        email:       email.trim(),
        role,
        ...(role === 'Designer' ? { hourly_rate: parseFloat(hourlyRate) } : {}),
      });
      setSuccess('Invitation sent! The user will receive an email to set their password.');
      setFullName(''); setEmail(''); setHourlyRate('');
    } catch (err: unknown) {
        const errData = (err as { response?: { data?: unknown } })?.response?.data;
        if (errData && typeof errData === 'object') {
            const msgs = Object.values(errData as Record<string, unknown>).flat().join(' ');
            setError(msgs);
        } else {
            setError('Failed to send invitation. Please try again.');
        }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900 text-base">Invite User</h2>
            <p className="text-xs text-slate-400 mt-0.5">An activation email will be sent automatically.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-3 py-2.5 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2.5 text-sm">
              {success}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full name</label>
            <input
              className={inputCls}
              placeholder="e.g. Sarah Chen"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
            <input
              type="email"
              className={inputCls}
              placeholder="sarah@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</label>
            <select
              className={inputCls}
              value={role}
              onChange={e => setRole(e.target.value as 'Designer' | 'Client')}
            >
              <option value="Designer">Designer</option>
              <option value="Client">Client</option>
            </select>
          </div>

          {role === 'Designer' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Hourly rate (TND) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                placeholder="75.00"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? 'Sending…' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Designer card ────────────────────────────────────────────────────────────

function DesignerCardComponent({ d }: { d: DesignerCard }) {
  const pct   = d.utilization_pct ?? 0;
  const color = avatarColor(d.designer_id);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
          style={{ backgroundColor: color }}
        >
          {Initials(d.designer_name)}
        </div>
        <div className="min-w-0">
          <p className="text-slate-900 font-semibold text-sm leading-tight truncate">
            {d.designer_name}
          </p>
          <p className="text-slate-400 text-xs mt-0.5 truncate">
            {d.specialization || 'No specialization'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Hourly rate</span>
          <span className="font-mono font-semibold text-slate-900">
            {d.hourly_rate ? formatEHR(parseFloat(d.hourly_rate)) : '—'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Availability</span>
          <span className="font-mono font-semibold text-slate-900">
            {d.available_hours_per_week ? `${d.available_hours_per_week} h/week` : '—'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">This week logged</span>
          <span className="font-mono font-semibold text-slate-900">
            {d.logged_hours_this_week.toFixed(0)} h
          </span>
        </div>
      </div>

      {/* Utilisation bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-400">Utilisation</span>
          <span className={`text-xs font-mono font-semibold ${d.utilization_pct !== null ? utilTextClass(pct) : 'text-slate-400'}`}>
            {d.utilization_pct !== null ? `${pct.toFixed(0)}%` : '—'}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width:           `${Math.min(pct, 100)}%`,
              backgroundColor: utilColor(pct),
            }}
          />
        </div>
      </div>

      {/* Active projects */}
      {d.active_projects.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Active Projects
          </p>
          <div className="space-y-1">
            {d.active_projects.map(name => (
              <p key={name} className="text-xs text-slate-600 truncate">{name}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── All users table ──────────────────────────────────────────────────────────

function UserRow({ u, onInvite }: { u: TeamUser; onInvite: () => void }) {
  const color = avatarColor(u.id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = onInvite; // suppress unused warning — button is in header
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ backgroundColor: color }}
          >
            {Initials(u.full_name)}
          </div>
          <span className="text-sm text-slate-800 font-medium">{u.full_name}</span>
        </div>
      </td>
      <td className="py-3 pr-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ROLE_BADGE[u.role] ?? ''}`}>
          {u.role}
        </span>
      </td>
      <td className="py-3 pr-4 text-sm text-slate-500">{u.email}</td>
      <td className="py-3 pr-4 text-sm text-slate-500">
        {u.specialization || <span className="text-slate-300">—</span>}
      </td>
      <td className="py-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {u.is_active ? 'Active' : 'Pending'}
        </span>
      </td>
    </tr>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [showInvite, setShowInvite] = useState(false);
  const { data, isLoading }         = useTeam();

  const designers = data?.designers ?? [];
  const users     = data?.users     ?? [];

  const InviteBtn = (
    <button
      onClick={() => setShowInvite(true)}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      Invite User
    </button>
  );

  return (
    <AppShell
      title="Team"
      actions={InviteBtn}
    >
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      {/* Designer cards */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-52 animate-pulse" />
          ))}
        </div>
      ) : designers.length > 0 ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {designers.map(d => <DesignerCardComponent key={d.designer_id} d={d} />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400 mb-6">
          No designers yet. Invite one to get started.
        </div>
      )}

      {/* All users table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">All Users</h2>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Invite User
          </button>
        </div>

        <div className="px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name</th>
                <th className="py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Role</th>
                <th className="py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</th>
                <th className="py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Specialisation</th>
                <th className="py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <UserRow key={u.id} u={u} onInvite={() => setShowInvite(true)} />
              ))}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}