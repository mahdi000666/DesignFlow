import type { ReactNode } from 'react';
import { PASSWORD_REQUIREMENTS } from '../utils/auth';
import Logo from '../assets/icons/logo.svg?react';
import { EyeOpenIcon, EyeOffIcon } from './Icons';

// ─── Brand Mark ──────────────────────────────────────────────────────────────

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <Logo />
      </div>
      <div>
        <span className="text-xl font-bold text-slate-900">DesignFlow</span>
        <p className="text-xs text-slate-500 -mt-0.5">Design agency operations platform</p>
      </div>
    </div>
  );
}

// ─── Auth Input ──────────────────────────────────────────────────────────────

interface AuthInputProps {
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  showToggle?: boolean;
  onToggle?: () => void;
  isToggled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function AuthInput({
  type = 'text', value, onChange, placeholder, label,
  showToggle, onToggle, isToggled, onKeyDown,
}: AuthInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary transition-colors"
        />
        {showToggle && (
          <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            {isToggled ? <EyeOffIcon /> : <EyeOpenIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Alert Box ───────────────────────────────────────────────────────────────

interface AlertBoxProps {
  children: ReactNode;
  variant: 'error' | 'success';
}

export function AlertBox({ children, variant }: AlertBoxProps) {
  const styles = variant === 'error'
    ? 'bg-red-50 border-red-200 text-red-600'
    : 'bg-green-50 border-green-200 text-green-600';
  return (
    <div className={`mb-5 px-3 py-2.5 rounded-lg border text-sm font-medium ${styles}`}>
      {children}
    </div>
  );
}

// ─── Auth Button ─────────────────────────────────────────────────────────────

interface AuthButtonProps {
  children: ReactNode;
  onClick: () => void;
  loading?: boolean;
}

export function AuthButton({ children, onClick, loading }: AuthButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-600 focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}

// ─── Auth Shell ──────────────────────────────────────────────────────────────

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
        <BrandMark />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}

// ─── Auth Card ───────────────────────────────────────────────────────────────

interface AuthCardProps {
  children: ReactNode;
  accent?: 'primary' | 'error';
}

export function AuthCard({ children, accent = 'primary' }: AuthCardProps) {
  const bar =
    accent === 'error'
      ? 'bg-linear-to-r from-red-400 to-rose-400'
      : 'bg-linear-to-r from-primary to-indigo-400';
  return (
    <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className={`h-[3px] ${bar}`} />
      <div className="px-10 py-9">{children}</div>
    </div>
  );
}

// ─── Password Requirements (3-state) ─────────────────────────────────────────

type ReqState = 'neutral' | 'met' | 'unmet';

function ReqDot({ state }: { state: ReqState }) {
  if (state === 'met') return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-green-500">
      <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
        <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
  if (state === 'unmet') return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500">
      <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
        <path d="M3 3l8 8M11 3l-8 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
  return <span className="flex h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-slate-300" />;
}

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  return (
    <div className="space-y-2 py-1">
      {PASSWORD_REQUIREMENTS.map((c, i) => {
        const met = c.test(password);
        const s: ReqState = !password ? 'neutral' : met ? 'met' : 'unmet';
        return (
          <div key={i} className={`flex items-center gap-2.5 text-sm ${
            s === 'met' ? 'text-green-600' : s === 'unmet' ? 'text-red-500' : 'text-slate-400'
          }`}>
            <ReqDot state={s} />
            <span>{c.label}</span>
          </div>
        );
      })}
    </div>
  );
}