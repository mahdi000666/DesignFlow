import { useState } from 'react';
import { KeyRound, User } from 'lucide-react';
import AppShell from '../components/AppShell';
import { useMe, useUpdateMe, useChangePassword, useUploadAvatar } from '../hooks/useUsers';
import type { MeData } from '../types/user';
import { useAuth } from '../hooks/useAuth';
import { Initials } from '../utils/format';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-sm text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors placeholder:text-slate-400';

const readonlyCls =
  'w-full px-3 py-2.5 border border-slate-100 rounded-lg bg-slate-50 text-sm text-slate-400 cursor-not-allowed select-none';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
      {children}
    </label>
  );
}

function Alert({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <div className={`px-3 py-2.5 rounded-lg text-sm border ${
      type === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-rose-50 border-rose-200 text-rose-700'
    }`}>
      {msg}
    </div>
  );
}

function CardHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Profile Card ─────────────────────────────────────────────────────────────

function ProfileCard({ me }: { me: MeData }) {
  const { mutateAsync, isPending } = useUpdateMe();
  const [fullName, setFullName]   = useState(me.full_name);
  const [feedback, setFeedback]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const { updateUser }            = useAuth();

  const handleSave = async () => {
    setFeedback(null);
    try {
      await mutateAsync({ full_name: fullName.trim() });
      updateUser({ full_name: fullName.trim() });
      setFeedback({ type: 'success', msg: 'Profile updated.' });
    } catch {
      setFeedback({ type: 'error', msg: 'Failed to save changes. Please try again.' });
    }
  };

  return (
    <div className="card overflow-hidden flex flex-col">
      <CardHeader icon={<User size={15} />} title="Profile" subtitle="Update your display name" />
      <div className="p-5 space-y-4 flex-1">
        {feedback && <Alert type={feedback.type} msg={feedback.msg} />}

        <div className="space-y-1.5">
          <Label>Full name</Label>
          <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Email</Label>
          <input className={readonlyCls} value={me.email} readOnly title="Email cannot be changed" />
          <p className="text-xs text-slate-400">Email address cannot be changed.</p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={handleSave}
          disabled={isPending || fullName.trim() === me.full_name}
          className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Security Card ────────────────────────────────────────────────────────────

function SecurityCard() {
  const { mutateAsync, isPending } = useChangePassword();
  const [current,  setCurrent]    = useState('');
  const [next,     setNext]       = useState('');
  const [feedback, setFeedback]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleUpdate = async () => {
    setFeedback(null);
    if (!current || !next) { setFeedback({ type: 'error', msg: 'Both fields are required.' }); return; }
    if (next.length < 8)   { setFeedback({ type: 'error', msg: 'New password must be at least 8 characters.' }); return; }
    try {
      const res = await mutateAsync({ current, next });
      setFeedback({ type: 'success', msg: res.message });
      setCurrent(''); setNext('');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to update password.';
      setFeedback({ type: 'error', msg: detail });
    }
  };

  const strength = Math.min(4, Math.floor(next.length / 3));
  const strengthLabel = next.length === 0 ? '' : next.length < 6 ? 'Too short' : next.length < 9 ? 'Fair' : next.length < 12 ? 'Good' : 'Strong';
  const strengthColor = strength <= 1 ? 'bg-rose-400' : strength <= 2 ? 'bg-amber-400' : strength <= 3 ? 'bg-primary' : 'bg-emerald-500';

  return (
    <div className="card overflow-hidden flex flex-col">
      <CardHeader icon={<KeyRound size={15} />} title="Security" subtitle="Change your login password" />
      <div className="p-5 space-y-4 flex-1">
        {feedback && <Alert type={feedback.type} msg={feedback.msg} />}

        <div className="space-y-1.5">
          <Label>Current password</Label>
          <input type="password" className={inputCls} placeholder="········" value={current} onChange={e => setCurrent(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>New password</Label>
          <input type="password" className={inputCls} placeholder="········" value={next} onChange={e => setNext(e.target.value)} />
          <p className="text-xs text-slate-400">Minimum 8 characters.</p>
        </div>

        {/* Strength bar */}
        {next.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-slate-100'}`} />
              ))}
            </div>
            <p className="text-[10px] text-slate-400">{strengthLabel}</p>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={handleUpdate}
          disabled={isPending}
          className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const ROLE_CHIP: Record<string, string> = {
  Manager:  'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200',
  Designer: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
  Client:   'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200',
};

export default function SettingsPage() {
  const { data: me, isLoading } = useMe();
  const { mutate: uploadAvatar, isPending: uploading } = useUploadAvatar();

  return (
    <AppShell title="Settings">

      {/* ── Avatar strip — lives outside both cards ────────────────────── */}
      {me && (
        <div className="flex items-center gap-4 bg-white border border-slate-100 rounded-xl px-5 py-4 shadow-sm mb-5">
          <label className="relative w-12 h-12 rounded-full cursor-pointer group shrink-0">
            {me.avatar_url ? (
              <img src={me.avatar_url} alt={me.full_name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                {Initials(me.full_name)}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-[9px] font-semibold">{uploading ? '…' : 'Edit'}</span>
            </div>
            <input
              type="file" accept="image/*" className="sr-only"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
            />
          </label>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{me.full_name}</p>
            <p className="text-xs text-slate-600 mt-0.5 truncate">{me.email}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${ROLE_CHIP[me.role] ?? 'bg-slate-100 text-slate-600'}`}>
            {me.role}
          </span>
        </div>
      )}

      {/* ── Side-by-side cards, equal height ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-5 items-stretch max-w-4xl mx-auto w-full">
        {isLoading ? (
          <div className="card p-6 animate-pulse h-64" />
        ) : me ? (
          <ProfileCard me={me} />
        ) : null}
        <SecurityCard />
      </div>
    </AppShell>
  );
}