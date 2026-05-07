import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { useTeam, useInviteUser } from '../../hooks/useUsers';
import type { DesignerCard, TeamUser } from '../../types/user';
import { formatEHR, Initials } from '../../utils/format';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  '#6366f1', '#0d9488', '#dc2626', '#d97706',
  '#7c3aed', '#15803d', '#db2777', '#0891b2',
];
const avatarColor = (id: number) => AVATAR_PALETTE[id % AVATAR_PALETTE.length];
const utilFill    = (pct: number) => pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#6366f1';
const utilTextCls = (pct: number) =>
  pct > 90 ? 'text-rose-600' : pct > 75 ? 'text-amber-600' : 'text-primary';

const ROLE_BADGE: Record<string, string> = {
  Manager:  'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200',
  Designer: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
  Client:   'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200',
};

const inputCls =
  'w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-sm text-slate-800 outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors placeholder:text-slate-400';

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useInviteUser();
  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [role,       setRole]       = useState<'Designer' | 'Client'>('Designer');
  const [hourlyRate, setHourlyRate] = useState('');
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!fullName.trim() || !email.trim()) { setError('Full name and email are required.'); return; }
    if (role === 'Designer' && !hourlyRate) { setError('Hourly rate is required for Designer accounts.'); return; }
    try {
      await mutateAsync({
        full_name: fullName.trim(), email: email.trim(), role,
        ...(role === 'Designer' ? { hourly_rate: parseFloat(hourlyRate) } : {}),
      });
      setSuccess('Invitation sent! The user will receive an email to set their password.');
      setFullName(''); setEmail(''); setHourlyRate('');
    } catch (err: unknown) {
      const d = (err as { response?: { data?: unknown } })?.response?.data;
      if (d && typeof d === 'object') setError(Object.values(d as Record<string, unknown>).flat().join(' '));
      else setError('Failed to send invitation. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Invite User</h2>
            <p className="text-xs text-slate-400 mt-0.5">An activation email will be sent automatically.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1 hover:bg-slate-100">
            <X size={15} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {error   && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-3 py-2.5 text-sm">{error}</div>}
          {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2.5 text-sm">{success}</div>}
          {[
            { label: 'Full name', el: <input className={inputCls} placeholder="e.g. Yassine Trabelsi" value={fullName} onChange={e => setFullName(e.target.value)} /> },
            { label: 'Email',     el: <input type="email" className={inputCls} placeholder="yassine@example.com" value={email} onChange={e => setEmail(e.target.value)} /> },
            { label: 'Role',      el: <select className={inputCls} value={role} onChange={e => setRole(e.target.value as 'Designer' | 'Client')}><option value="Designer">Designer</option><option value="Client">Client</option></select> },
          ].map(f => (
            <div key={f.label} className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{f.label}</label>
              {f.el}
            </div>
          ))}
          {role === 'Designer' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Hourly rate (TND) <span className="text-rose-400">*</span>
              </label>
              <input type="number" min="0" step="0.01" className={inputCls} placeholder="75.00"
                value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
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
    <div className="card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 overflow-hidden"
          style={d.avatar_url ? {} : { backgroundColor: color }}>
          {d.avatar_url
            ? <img src={d.avatar_url} alt={d.designer_name} className="w-full h-full object-cover" />
            : Initials(d.designer_name)
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{d.designer_name}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{d.specialization || 'No specialization'}</p>
        </div>
      </div>

      {/* Stats — restored original row layout */}
      <div className="space-y-1.5">
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
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Utilisation</span>
          <span className={`text-xs font-mono font-semibold ${d.utilization_pct !== null ? utilTextCls(pct) : 'text-slate-400'}`}>
            {d.utilization_pct !== null ? `${pct.toFixed(0)}%` : '—'}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: utilFill(pct) }} />
        </div>
      </div>

      {/* Active projects */}
      {d.active_projects.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Active Projects</p>
          <div className="flex flex-wrap gap-1.5">
            {d.active_projects.map(name => (
              <span key={name} className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 truncate max-w-full">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User table row ───────────────────────────────────────────────────────────

function UserRow({ u }: { u: TeamUser }) {
  const color = avatarColor(u.id);
  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 overflow-hidden"
            style={u.avatar_url ? {} : { backgroundColor: color }}>
            {u.avatar_url
              ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
              : Initials(u.full_name)
            }
          </div>
          <span className="text-sm font-medium text-slate-800">{u.full_name}</span>
        </div>
      </td>
      <td className="py-3 pr-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
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

  return (
    <AppShell
      title="Team"
      actions={
        <button onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-600 transition-colors">
          <Plus size={14} /> Invite User
        </button>
      }
    >
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[1, 2, 3].map(i => <div key={i} className="card p-5 h-56 animate-pulse" />)}
        </div>
      ) : designers.length > 0 ? (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {designers.map(d => <DesignerCardComponent key={d.designer_id} d={d} />)}
        </div>
      ) : (
        <div className="card p-10 text-center text-sm text-slate-400 mb-5">
          No designers yet. Invite one to get started.
        </div>
      )}

      {/* All users table — no invite button, title centered */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 text-center">
          <p className="text-sm font-semibold text-slate-900">All Users</p>
        </div>
        <div className="px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Name', 'Role', 'Email', 'Specialisation', 'Status'].map(h => (
                  <th key={h} className="py-3 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => <UserRow key={u.id} u={u} />)}
              {!isLoading && users.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}