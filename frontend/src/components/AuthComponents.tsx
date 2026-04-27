import type { ReactNode } from 'react';

// ─── Brand Mark ──────────────────────────────────────────────────────────────

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
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
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
        {showToggle && (
          <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            {isToggled ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
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
      className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Loading…' : children}
    </button>
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
  const checks = [
    { label: 'At least 8 characters',          met: password.length >= 8 },
  ];

  return (
    <div className="space-y-2 py-1">
      {checks.map((c, i) => {
        const s: ReqState = !password ? 'neutral' : c.met ? 'met' : 'unmet';
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

// ─── Login Illustration (neutral) ────────────────────────────────────────────

export function LoginIllustration() {
  return (
    <div className="relative w-full max-w-sm">
      <svg viewBox="0 0 340 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        {/* Desk */}
        <rect x="40" y="210" width="260" height="10" rx="5" fill="rgba(255,255,255,0.25)" />
        <rect x="80" y="220" width="12" height="40" rx="4" fill="rgba(255,255,255,0.20)" />
        <rect x="248" y="220" width="12" height="40" rx="4" fill="rgba(255,255,255,0.20)" />

        {/* Monitor */}
        <rect x="110" y="130" width="140" height="90" rx="8" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
        <rect x="114" y="134" width="132" height="82" rx="5" fill="rgba(255,255,255,0.10)" />
        {/* Screen bars */}
        <rect x="120" y="185" width="14" height="25" rx="3" fill="rgba(255,255,255,0.55)" />
        <rect x="140" y="175" width="14" height="35" rx="3" fill="rgba(255,255,255,0.75)" />
        <rect x="160" y="165" width="14" height="45" rx="3" fill="white" opacity={0.9} />
        <rect x="180" y="178" width="14" height="32" rx="3" fill="rgba(255,255,255,0.65)" />
        <rect x="200" y="168" width="14" height="42" rx="3" fill="rgba(255,255,255,0.80)" />
        <rect x="220" y="180" width="14" height="30" rx="3" fill="rgba(255,255,255,0.55)" />
        {/* Monitor stand */}
        <rect x="173" y="220" width="14" height="8" rx="2" fill="rgba(255,255,255,0.20)" />
        <rect x="162" y="228" width="36" height="5" rx="2.5" fill="rgba(255,255,255,0.20)" />

        {/* Person — body */}
        <ellipse cx="90" cy="200" rx="22" ry="14" fill="rgba(255,255,255,0.20)" />
        {/* Person — head */}
        <circle cx="90" cy="175" r="16" fill="rgba(255,255,255,0.30)" />
        {/* Person — hair */}
        <path d="M74 172 Q90 155 106 172 Q104 162 90 158 Q76 162 74 172Z" fill="rgba(255,255,255,0.55)" />
        {/* Person — arms */}
        <path d="M100 195 Q120 188 130 185" stroke="rgba(255,255,255,0.35)" strokeWidth="8" strokeLinecap="round" />
        <path d="M78 198 Q68 195 62 198" stroke="rgba(255,255,255,0.30)" strokeWidth="7" strokeLinecap="round" />
        {/* Chair */}
        <path d="M68 212 Q70 225 72 240" stroke="rgba(255,255,255,0.25)" strokeWidth="5" strokeLinecap="round" />
        <path d="M112 212 Q110 225 108 240" stroke="rgba(255,255,255,0.25)" strokeWidth="5" strokeLinecap="round" />
        <path d="M60 215 Q90 220 120 215" stroke="rgba(255,255,255,0.30)" strokeWidth="5" strokeLinecap="round" />

        {/* Decorative card — progress bar (top-left) */}
        <rect x="10" y="85" width="80" height="54" rx="8" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
        <rect x="20" y="98"  width="32" height="5" rx="2.5" fill="rgba(255,255,255,0.40)" />
        <rect x="20" y="110" width="60" height="5" rx="2.5" fill="rgba(255,255,255,0.20)" />
        <rect x="20" y="110" width="43" height="5" rx="2.5" fill="rgba(255,255,255,0.75)" />
        <rect x="20" y="122" width="46" height="4" rx="2"   fill="rgba(255,255,255,0.25)" />

        {/* Decorative card — status list (top-right) */}
        <rect x="258" y="58" width="72" height="72" rx="8" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
        <circle cx="272" cy="79"  r="4" fill="rgba(255,255,255,0.80)" />
        <rect x="281" y="76"  width="38" height="5" rx="2.5" fill="rgba(255,255,255,0.50)" />
        <circle cx="272" cy="95"  r="4" fill="rgba(255,255,255,0.55)" />
        <rect x="281" y="92"  width="30" height="5" rx="2.5" fill="rgba(255,255,255,0.35)" />
        <circle cx="272" cy="111" r="4" fill="rgba(255,255,255,0.40)" />
        <rect x="281" y="108" width="34" height="5" rx="2.5" fill="rgba(255,255,255,0.28)" />
      </svg>
    </div>
  );
}

// ─── Activation Illustration ──────────────────────────────────────────────────

export function ActivationIllustration() {
  return (
    <div className="w-40 h-32">
      <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Background circles */}
        <circle cx="80" cy="65" r="60" fill="#eef2ff" />
        <circle cx="80" cy="65" r="44" fill="#e0e7ff" />
        {/* Envelope body */}
        <rect x="34" y="50" width="92" height="62" rx="7" fill="white" stroke="#c7d2fe" strokeWidth="1.5" />
        {/* Envelope flap (open) */}
        <path d="M34 50 L80 80 L126 50" stroke="#c7d2fe" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 50 Q34 38 46 38 L80 55 L114 38 Q126 38 126 50Z" fill="#eef2ff" stroke="#c7d2fe" strokeWidth="1.5" />
        {/* Letter paper 1 */}
        <rect x="54" y="14" width="52" height="44" rx="5" fill="white" stroke="#a5b4fc" strokeWidth="1.5" transform="rotate(-8 54 14)" />
        <line x1="60" y1="30" x2="84" y2="28" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" transform="rotate(-8 60 30)" />
        <line x1="60" y1="37" x2="92" y2="35" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" transform="rotate(-8 60 37)" />
        <line x1="60" y1="44" x2="86" y2="42" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" transform="rotate(-8 60 44)" />
        {/* Letter paper 2 */}
        <rect x="72" y="10" width="52" height="44" rx="5" fill="white" stroke="#818cf8" strokeWidth="1.5" transform="rotate(6 72 10)" />
        <line x1="82" y1="26" x2="106" y2="29" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" transform="rotate(6 82 26)" />
        <line x1="82" y1="33" x2="114" y2="36" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" transform="rotate(6 82 33)" />
        {/* Lock */}
        <circle cx="80" cy="81" r="10" fill="#6366f1" />
        <path d="M77 81 Q77 77 80 77 Q83 77 83 81 L83 85 L77 85 Z" fill="white" />
        <rect x="76" y="81" width="8" height="6" rx="2" fill="white" />
        <circle cx="80" cy="84" r="1.5" fill="#6366f1" />
      </svg>
    </div>
  );
}