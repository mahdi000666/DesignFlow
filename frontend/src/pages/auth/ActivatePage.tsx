import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'Manager' | 'Designer' | 'Client';

interface TokenInfo {
  role:      Role;
  full_name: string;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-[14px] py-[10px] border border-border-strong rounded bg-surface font-sans text-[14px] text-ink outline-none focus:border-amber transition-colors placeholder:text-ink3';

const labelCls =
  'block font-sans text-[11px] uppercase tracking-[0.6px] text-ink3 mb-[6px]';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActivatePage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const token          = searchParams.get('token') ?? '';

  // Token info — fetched on mount to determine which fields to show.
  const [tokenInfo,     setTokenInfo]     = useState<TokenInfo | null>(null);
  const [tokenError,    setTokenError]    = useState('');
  const [tokenLoading,  setTokenLoading]  = useState(true);

  // Form fields
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  // Designer fields
  const [spec,       setSpec]       = useState('');
  const [hoursPerWk, setHoursPerWk] = useState('');
  // Client fields
  const [phone,      setPhone]      = useState('');
  const [industry,   setIndustry]   = useState('');

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // ── Fetch role on mount ────────────────────────────────────────────────────
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

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');

    if (password !== confirm) { setError('Passwords do not match.');              return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      await apiClient.post('/auth/activate/', {
        token,
        password,
        // Role-specific fields — backend ignores them if role doesn't match.
        ...(tokenInfo?.role === 'Designer' && {
          specialization:           spec,
          available_hours_per_week: hoursPerWk ? parseInt(hoursPerWk, 10) : null,
        }),
        ...(tokenInfo?.role === 'Client' && {
          phone,
          industry,
        }),
      });
      navigate('/login', { state: { activated: true } });
    } catch (err) {
      const e   = err as { response?: { data?: { token?: string[]; password?: string[]; detail?: string } } };
      const d   = e.response?.data;
      const msg = d?.token?.[0] ?? d?.password?.[0] ?? d?.detail ?? 'Activation failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Render: loading / error / form ────────────────────────────────────────
  if (tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="font-sans text-[13px] text-ink3">Verifying invitation…</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="bg-surface border border-border rounded-lg px-8 py-6 max-w-sm w-full text-center">
          <div className="font-serif text-[20px] text-ink mb-2">Invalid link</div>
          <p className="font-sans text-[13px] text-ink3">{tokenError}</p>
        </div>
      </div>
    );
  }

  const role = tokenInfo!.role;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="font-serif text-[30px] text-ink tracking-tight">DesignOps</div>
          <div className="font-sans text-[10px] uppercase tracking-[2px] text-ink3 mt-1">
            Analytics Platform
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-8">
          <div className="mb-6">
            <h1 className="font-serif text-[20px] font-normal text-ink">
              Welcome, {tokenInfo!.full_name}
            </h1>
            <p className="font-sans text-[13px] text-ink3 mt-1">
              Set your password to activate your {role} account.
            </p>
          </div>

          {error && (
            <div className="mb-5 px-3 py-[10px] rounded bg-danger-light border border-danger/20 font-sans text-[13px] text-danger">
              {error}
            </div>
          )}

          <div className="space-y-4">

            {/* ── Password ───────────────────────────────────────────────── */}
            <div>
              <label className={labelCls}>New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className={inputCls}
              />
            </div>

            {/* ── Designer profile fields ───────────────────────────────── */}
            {role === 'Designer' && (
              <>
                <hr className="border-border" />
                <p className="font-sans text-[11px] uppercase tracking-[0.6px] text-ink3">
                  Your profile — you can update these later
                </p>

                <div>
                  <label className={labelCls}>Specialization</label>
                  <input
                    type="text"
                    value={spec}
                    onChange={e => setSpec(e.target.value)}
                    placeholder="e.g. Branding & Identity"
                    className={inputCls}
                  />
                  <p className="font-sans text-[11px] text-ink3 mt-[6px]">
                    Other examples: UI/UX Design · Motion Graphics · Packaging
                  </p>
                </div>

                <div>
                  <label className={labelCls}>Available hours per week</label>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={hoursPerWk}
                    onChange={e => setHoursPerWk(e.target.value)}
                    placeholder="e.g. 40"
                    className={inputCls}
                  />
                  <p className="font-sans text-[11px] text-ink3 mt-[6px]">
                    Your total billable capacity. Used for utilisation tracking.
                  </p>
                </div>
              </>
            )}

            {/* ── Client profile fields ─────────────────────────────────── */}
            {role === 'Client' && (
              <>
                <hr className="border-border" />
                <p className="font-sans text-[11px] uppercase tracking-[0.6px] text-ink3">
                  Your profile — you can update these later
                </p>

                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +216 98 123 456"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Industry</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    placeholder="e.g. Food & Beverage"
                    className={inputCls}
                  />
                  <p className="font-sans text-[11px] text-ink3 mt-[6px]">
                    Other examples: Retail · Healthcare · Technology · Finance
                  </p>
                </div>
              </>
            )}

          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full px-[14px] py-[10px] rounded bg-ink text-white font-sans text-[13px] font-medium border border-ink hover:bg-[#333] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Activating…' : 'Activate account'}
          </button>
        </div>

      </div>
    </div>
  );
}