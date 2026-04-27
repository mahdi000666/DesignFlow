import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/clients';
import {
  BrandMark, AuthInput, AlertBox, AuthButton,
  ActivationIllustration, PasswordRequirements,
} from '../../components/AuthComponents';

type Role = 'Manager' | 'Designer' | 'Client';
interface TokenInfo { role: Role; full_name: string; }

const hasLetter          = (s: string) => /[a-zA-Z]/.test(s);
const isValidTunisianPhone = (s: string) => {
  const d = s.replace(/[+ ]/g, '');
  return d.length === 8 || (d.length === 11 && d.startsWith('216'));
};

// ─── Shared page shell ────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
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

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ accent = 'primary', children }: { accent?: 'primary' | 'error'; children: React.ReactNode }) {
  const bar = accent === 'error'
    ? 'bg-gradient-to-r from-red-400 to-rose-400'
    : 'bg-gradient-to-r from-primary to-indigo-400';
  return (
    <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className={`h-[3px] ${bar}`} />
      <div className="px-10 py-9">{children}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivatePage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token') ?? '';

  // Token validation state
  const [tokenInfo,    setTokenInfo]    = useState<TokenInfo | null>(null);
  const [tokenError,   setTokenError]   = useState('');
  const [tokenLoading, setTokenLoading] = useState(true);

  // Password fields
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);

  // Designer profile fields
  const [spec,       setSpec]       = useState('');
  const [hoursPerWk, setHoursPerWk] = useState('');

  // Client profile fields
  const [phone,    setPhone]    = useState('');
  const [industry, setIndustry] = useState('');

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Validate token on mount — if already used or expired, show error card immediately
  useEffect(() => {
    if (!token) {
      setTokenError('No token found in the URL. Check your invitation email.');
      setTokenLoading(false);
      return;
    }
    apiClient
      .get<TokenInfo>(`/auth/activate-info/?token=${token}`)
      .then(res => setTokenInfo(res.data))
      .catch(err => {
        const data = err.response?.data as { detail?: string } | undefined;
        setTokenError(data?.detail ?? 'This invitation link is invalid or has expired.');
      })
      .finally(() => setTokenLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    setError('');
    const role = tokenInfo!.role;

    // ── Password ──────────────────────────────────────────────────────────
    if (!password)            return setError('Password is required.');
    if (password.length < 8)  return setError('Password must be at least 8 characters.');
    if (password !== confirm)  return setError('Passwords do not match.');

    // ── Designer ──────────────────────────────────────────────────────────
    if (role === 'Designer') {
      if (!hoursPerWk) return setError('Available hours per week is required.');
      const hrs = parseInt(hoursPerWk, 10);
      if (isNaN(hrs) || hrs < 1 || hrs > 80)
        return setError('Available hours must be a whole number between 1 and 80.');
      if (spec && !hasLetter(spec))
        return setError('Specialization must contain at least one letter.');
    }

    // ── Client ────────────────────────────────────────────────────────────
    if (role === 'Client') {
      if (!phone) return setError('Phone number is required.');
      if (!isValidTunisianPhone(phone))
        return setError('Enter a valid number — 8 digits local (98 123 456) or international (+216 98 123 456).');
      if (industry && !hasLetter(industry))
        return setError('Industry must contain at least one letter.');
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/activate/', {
        token,
        password,
        ...(role === 'Designer' && {
          specialization:           spec.trim(),
          available_hours_per_week: parseInt(hoursPerWk, 10),
        }),
        ...(role === 'Client' && {
          phone:    phone.trim(),
          industry: industry.trim(),
        }),
      });
      navigate('/login', { state: { activated: true }, replace: true });
    } catch (err) {
      const e = err as { response?: { data?: { token?: string[]; password?: string[]; detail?: string } } };
      const d = e.response?.data;
      setError(d?.token?.[0] ?? d?.password?.[0] ?? d?.detail ?? 'Activation failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (tokenLoading) {
    return (
      <Shell>
        <p className="text-sm text-slate-400">Verifying invitation…</p>
      </Shell>
    );
  }

  // ── Token invalid / expired / already used — no form shown ───────────────

  if (tokenError) {
    return (
      <Shell>
        <Card accent="error">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Link unavailable</h1>
            <p className="text-sm text-slate-500 leading-relaxed">{tokenError}</p>
          </div>
        </Card>
      </Shell>
    );
  }

  // ── Activation form ───────────────────────────────────────────────────────

  const role = tokenInfo!.role;

  return (
    <Shell>
      <Card>
        <div className="flex justify-center mb-7">
          <ActivationIllustration />
        </div>

        <h1 className="text-xl font-bold text-slate-900 text-center mb-1">
          Welcome, {tokenInfo!.full_name}
        </h1>
        <p className="text-sm text-slate-500 text-center mb-7 leading-relaxed">
          Set your password to activate your {role} account.
        </p>

        {error && <AlertBox variant="error">{error}</AlertBox>}

        <div className="space-y-4">
          {/* Password */}
          <AuthInput
            type={showPwd ? 'text' : 'password'}
            label="New Password"
            value={password}
            onChange={setPassword}
            placeholder="Min. 8 characters"
            showToggle
            isToggled={showPwd}
            onToggle={() => setShowPwd(p => !p)}
          />

          <AuthInput
            type={showConf ? 'text' : 'password'}
            label="Confirm Password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repeat password"
            showToggle
            isToggled={showConf}
            onToggle={() => setShowConf(p => !p)}
          />

          <PasswordRequirements password={password} />

          {/* Designer profile fields */}
          {role === 'Designer' && (
            <>
              <hr className="border-slate-100" />
              <AuthInput
                label="Specialization (Optional)"
                value={spec}
                onChange={setSpec}
                placeholder="e.g. Branding & Identity"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Available hours per week
                </label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={hoursPerWk}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d+$/.test(v)) setHoursPerWk(v);
                  }}
                  placeholder="e.g. 40"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </>
          )}

          {/* Client profile fields */}
          {role === 'Client' && (
            <>
              <hr className="border-slate-100" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^[0-9+ ]*$/.test(v)) setPhone(v);
                  }}
                  placeholder="e.g. 98 123 456 or +216 98 123 456"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <AuthInput
                label="Industry (Optional)"
                value={industry}
                onChange={setIndustry}
                placeholder="e.g. Food & Beverage"
              />
            </>
          )}

          <div className="pt-1">
            <AuthButton onClick={handleSubmit} loading={loading}>
              Activate Account
            </AuthButton>
          </div>
        </div>
      </Card>
    </Shell>
  );
}