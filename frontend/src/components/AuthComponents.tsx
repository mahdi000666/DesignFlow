import type { ReactNode } from 'react';

// ─── Brand Mark (Logo + Title) ──────────────────────────────────────────────

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

// ─── Auth Input ─────────────────────────────────────────────────────────────

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
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  showToggle,
  onToggle,
  isToggled,
  onKeyDown,
}: AuthInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
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
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
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

// ─── Alert Box ──────────────────────────────────────────────────────────────

interface AlertBoxProps {
  children: ReactNode;
  variant: 'error' | 'success';
}

export function AlertBox({ children, variant }: AlertBoxProps) {
  const styles =
    variant === 'error'
      ? 'bg-red-50 border-red-200 text-red-600'
      : 'bg-green-50 border-green-200 text-green-600';

  return (
    <div className={`mb-5 px-3 py-2.5 rounded-lg border text-sm font-medium ${styles}`}>
      {children}
    </div>
  );
}

// ─── Auth Button ────────────────────────────────────────────────────────────

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

// ─── Password Requirements ──────────────────────────────────────────────────

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Include uppercase and lowercase letters', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'Include a number or symbol', met: /[0-9!@#$%^&*]/.test(password) },
  ];

  return (
    <div className="space-y-2 pt-1">
      {checks.map((check, i) => (
        <div key={i} className={`flex items-center gap-2 text-sm ${check.met ? 'text-green-600' : 'text-slate-400'}`}>
          {check.met ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span>{check.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Login Illustration (SVG) ───────────────────────────────────────────────

export function LoginIllustration() {
  return (
    <div className="relative w-full max-w-lg">
      <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-xl">
        {/* Desk */}
        <rect x="80" y="280" width="340" height="12" rx="6" fill="#1e293b" />
        <rect x="100" y="292" width="12" height="60" rx="2" fill="#334155" />
        <rect x="388" y="292" width="12" height="60" rx="2" fill="#334155" />
        {/* Person body */}
        <ellipse cx="250" cy="260" rx="45" ry="55" fill="#fbbf24" />
        <path d="M210 260 Q250 280 290 260 L290 320 L210 320Z" fill="#f59e0b" />
        {/* Person head */}
        <circle cx="250" cy="210" r="35" fill="#fbbf24" />
        <path d="M230 200 Q250 190 270 200" stroke="#d97706" strokeWidth="2" fill="none" />
        {/* Hair */}
        <path d="M215 200 Q220 170 250 170 Q280 170 285 200 Q285 180 270 175 Q250 165 230 175 Q215 180 215 200Z" fill="#1e293b" />
        {/* Arms */}
        <path d="M210 260 Q180 280 170 300" stroke="#fbbf24" strokeWidth="14" strokeLinecap="round" />
        <path d="M290 260 Q320 280 330 300" stroke="#fbbf24" strokeWidth="14" strokeLinecap="round" />
        {/* Laptop */}
        <path d="M180 280 L200 240 L300 240 L320 280Z" fill="#475569" />
        <rect x="200" y="240" width="100" height="60" rx="4" fill="#1e293b" />
        <rect x="205" y="245" width="90" height="50" rx="2" fill="#0f172a" />
        {/* Screen content */}
        <rect x="210" y="250" width="30" height="20" rx="2" fill="#6366f1" opacity="0.8" />
        <rect x="245" y="250" width="45" height="4" rx="2" fill="#64748b" />
        <rect x="245" y="258" width="35" height="4" rx="2" fill="#64748b" />
        <rect x="210" y="275" width="80" height="15" rx="2" fill="#334155" />
        {/* Chart on screen */}
        <polyline points="215,282 225,275 235,280 245,270 255,272 265,265 275,268 285,260" stroke="#22c55e" strokeWidth="2" fill="none" />
        {/* Chair */}
        <rect x="220" y="320" width="60" height="8" rx="4" fill="#334155" />
        <rect x="235" y="328" width="8" height="50" rx="2" fill="#475569" />
        <rect x="257" y="328" width="8" height="50" rx="2" fill="#475569" />
        <rect x="225" y="375" width="50" height="6" rx="3" fill="#475569" />
        {/* Floating chart elements */}
        <rect x="60" y="120" width="70" height="90" rx="8" fill="white" opacity="0.9" />
        <rect x="70" y="135" width="50" height="6" rx="3" fill="#e2e8f0" />
        <rect x="70" y="148" width="35" height="4" rx="2" fill="#e2e8f0" />
        <rect x="70" y="158" width="40" height="4" rx="2" fill="#e2e8f0" />
        <rect x="70" y="175" width="15" height="25" rx="2" fill="#6366f1" opacity="0.6" />
        <rect x="90" y="165" width="15" height="35" rx="2" fill="#6366f1" opacity="0.8" />
        <rect x="110" y="155" width="15" height="45" rx="2" fill="#6366f1" />
        {/* Floating pie chart */}
        <circle cx="400" cy="140" r="35" fill="white" opacity="0.9" />
        <circle cx="400" cy="140" r="25" fill="#6366f1" />
        <path d="M400 140 L400 115 A25 25 0 0 1 420 125Z" fill="#22c55e" />
        <path d="M400 140 L420 155 A25 25 0 0 1 400 165Z" fill="#f59e0b" />
        <circle cx="400" cy="140" r="12" fill="white" />
        {/* Small floating elements */}
        <circle cx="120" cy="80" r="8" fill="#6366f1" opacity="0.3" />
        <circle cx="380" cy="220" r="6" fill="#22c55e" opacity="0.4" />
        <rect x="420" y="100" width="20" height="20" rx="4" fill="#f59e0b" opacity="0.3" transform="rotate(15 430 110)" />
      </svg>
    </div>
  );
}

// ─── Activation Illustration (Envelope) ─────────────────────────────────────

export function ActivationIllustration() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Envelope body */}
        <rect x="10" y="35" width="80" height="50" rx="6" fill="#e0e7ff" />
        <rect x="10" y="35" width="80" height="50" rx="6" fill="url(#envGrad)" opacity="0.5" />
        {/* Envelope flap */}
        <path d="M10 35 L50 65 L90 35" fill="#c7d2fe" />
        <path d="M10 35 L50 65 L90 35" stroke="#a5b4fc" strokeWidth="1.5" fill="none" />
        {/* Letter peeking out */}
        <rect x="20" y="20" width="60" height="40" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
        <line x1="30" y1="32" x2="70" y2="32" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
        <line x1="30" y1="42" x2="60" y2="42" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
        <line x1="30" y1="52" x2="50" y2="52" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
        {/* Seal */}
        <circle cx="50" cy="58" r="8" fill="#6366f1" />
        <path d="M46 58 L49 61 L54 55" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="envGrad" x1="10" y1="35" x2="90" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="1" stopColor="#6366f1" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
