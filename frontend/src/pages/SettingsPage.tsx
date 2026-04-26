import { useState } from 'react';
import AppShell from '../components/AppShell';
import { useMe, useUpdateMe, useChangePassword } from '../hooks/useUsers';
import type { MeData } from '../types/user';
import { useAuth } from '../hooks/useAuth';
import { Initials } from '../utils/format';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors placeholder:text-slate-400';

const readonlyCls =
  'w-full px-3 py-2.5 border border-slate-100 rounded-lg bg-slate-50 text-sm text-slate-500 cursor-not-allowed';

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileCard({ me }: { me: MeData }) {
  const { mutateAsync, isPending } = useUpdateMe();
  const [fullName, setFullName] = useState(me.full_name);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const { updateUser } = useAuth();

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
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <p className="text-sm font-semibold text-slate-800 mb-5">Profile</p>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {Initials(me.full_name)}
        </div>
        <div>
          <p className="text-slate-900 font-semibold text-sm">{me.full_name}</p>
          <p className="text-slate-400 text-xs mt-0.5">{me.email} · {me.role}</p>
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 px-3 py-2.5 rounded-lg text-sm border ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {feedback.msg}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Full name
          </label>
          <input
            className={inputCls}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Email
          </label>
          <input
            className={readonlyCls}
            value={me.email}
            readOnly
            title="Email cannot be changed"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending || fullName.trim() === me.full_name}
        className="mt-5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

// ─── Security section ─────────────────────────────────────────────────────────

function SecurityCard() {
  const { mutateAsync, isPending } = useChangePassword();

  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleUpdate = async () => {
    setFeedback(null);
    if (!current || !next) {
      setFeedback({ type: 'error', msg: 'Both fields are required.' });
      return;
    }
    if (next.length < 8) {
      setFeedback({ type: 'error', msg: 'New password must be at least 8 characters.' });
      return;
    }
    try {
      const res = await mutateAsync({ current, next });
      setFeedback({ type: 'success', msg: res.message });
      setCurrent('');
      setNext('');
    } catch (err: unknown) {
        const detail =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            ?? 'Failed to update password.';
      setFeedback({ type: 'error', msg: detail });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12">
      <p className="text-sm font-semibold text-slate-800 mb-5">Security</p>

      {feedback && (
        <div className={`mb-4 px-3 py-2.5 rounded-lg text-sm border ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {feedback.msg}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Current password
          </label>
          <input
            type="password"
            className={inputCls}
            placeholder="········"
            value={current}
            onChange={e => setCurrent(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            New password
          </label>
          <input
            type="password"
            className={inputCls}
            placeholder="········"
            value={next}
            onChange={e => setNext(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">Minimum 8 characters.</p>
        </div>
      </div>

      <button
        onClick={handleUpdate}
        disabled={isPending}
        className="mt-5 px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Updating…' : 'Update password'}
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: me, isLoading } = useMe();

  return (
    <AppShell title="Settings" breadcrumb="Account preferences and security">
      <div className="grid grid-cols-2 gap-5 items-start max-w-4xl">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-52" />
        ) : me ? (
          <ProfileCard me={me} />
        ) : null}
        <SecurityCard />
      </div>
    </AppShell>
  );
}