import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/clients';

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'Manager' | 'Designer' | 'Client';

interface TokenInfo {
  role:      Role;
  full_name: string;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-[14px] py-[10px] border border-slate-200 rounded-lg bg-surface font-sans text-[14px] text-ink outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-ink3';

const labelCls =
  'block font-sans text-[11px] uppercase tracking-[0.6px] text-ink3 mb-[6px]';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Must contain at least one letter — allows "3D Motion", "Henry VIII".
const hasLetter = (s: string) => /[a-zA-Z]/.test(s);

/**
 * Validates a Tunisian phone number.
 * After stripping + and spaces, accepts:
 *   - 8 digits  (local)          e.g. 98 123 456
 *   - 11 digits starting with 216 (international) e.g. +216 98 123 456
 */
const isValidTunisianPhone = (s: string) => {
  const digits = s.replace(/[+ ]/g, '');
  return digits.length === 8 || (digits.length === 11 && digits.startsWith('216'));
};

// ─── Shared brand mark ───────────────────────────────────────────────────────

function BrandMark() {
  return (
    <div className="flex flex-col items-center mb-8 gap-3">
      <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
        <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
          <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.55" />
          <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.55" />
          <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
        </svg>
      </div>
      <div className="text-center">
        <div className="font-display text-[26px] text-ink leading-tight">DesignOps</div>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActivatePage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const token          = searchParams.get('token') ?? '';

  const [tokenInfo,     setTokenInfo]     = useState<TokenInfo | null>(null);
  const [tokenError,    setTokenError]    = useState('');
  const [tokenLoading,  setTokenLoading]  = useState(true);

  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [spec,       setSpec]       = useState('');
  const [hoursPerWk, setHoursPerWk] = useState('');
  const [phone,      setPhone]      = useState('');
  const [industry,   setIndustry]   = useState('');

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

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

    // ── Password ──────────────────────────────────────────────────────────
    if (!password)           { setError('Password is required.');                   return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.');                 return; }

    // ── Designer ──────────────────────────────────────────────────────────
    if (tokenInfo?.role === 'Designer') {
      if (!hoursPerWk) {
        setError('Available hours per week is required.');
        return;
      }
      const hrs = parseInt(hoursPerWk, 10);
      if (isNaN(hrs) || hrs < 1 || hrs > 80) {
        setError('Available hours must be a whole number between 1 and 80.');
        return;
      }
      if (spec && !hasLetter(spec)) {
        setError('Specialization must contain at least one letter.');
        return;
      }
    }

    // ── Client ────────────────────────────────────────────────────────────
    if (tokenInfo?.role === 'Client') {
      // Phone is required — manager needs a way to contact the client.
      if (!phone) {
        setError('Phone number is required.');
        return;
      }
      if (!isValidTunisianPhone(phone)) {
        setError('Enter a valid number — 8 digits local (98 123 456) or international (+216 98 123 456).');
        return;
      }
      // Industry is optional but must read like a word if provided.
      if (industry && !hasLetter(industry)) {
        setError('Industry must contain at least one letter.');
        return;
      }
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/activate/', {
        token,
        password,
        ...(tokenInfo?.role === 'Designer' && {
          specialization:           spec.trim(),
          available_hours_per_week: parseInt(hoursPerWk, 10),
        }),
        ...(tokenInfo?.role === 'Client' && {
          phone:    phone.trim(),
          industry: industry.trim(),
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
        <div className="w-full max-w-sm">
          <BrandMark />
          <div className="bg-surface border border-border rounded-lg px-8 py-6 text-center">
            <div className="font-sans text-[15px] font-semibold text-ink mb-1.5">Invalid link</div>
            <p className="font-sans text-[13px] text-ink3">{tokenError}</p>
          </div>
        </div>
      </div>
    );
  }

  const role = tokenInfo!.role;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-12">
      <div className="w-full max-w-sm">

        <BrandMark />

        <div className="bg-surface border border-border rounded-lg p-8">
          <div className="mb-6">
            <h1 className="font-sans text-[15px] font-semibold text-ink">
              Welcome, {tokenInfo!.full_name}
            </h1>
            <p className="font-sans text-[13px] text-ink3 mt-0.5">
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

                <div>
                  <label className={labelCls}>
                    Specialization{' '}
                    <span className="normal-case tracking-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={spec}
                    onChange={e => setSpec(e.target.value)}
                    placeholder="e.g. Branding & Identity"
                    className={inputCls}
                  />
                </div>

                <div>
                  {/* Required — used in the designer utilisation metric */}
                  <label className={labelCls}>Available hours per week</label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={hoursPerWk}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) setHoursPerWk(val);
                    }}
                    placeholder="e.g. 40"
                    className={inputCls}
                  />
                </div>
              </>
            )}

            {/* ── Client profile fields ─────────────────────────────────── */}
            {role === 'Client' && (
              <>
                <hr className="border-border" />

                <div>
                  {/* Required — manager needs a way to contact the client */}
                  <label className={labelCls}>Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => {
                      const val = e.target.value;
                      // Only allow digits, spaces, and + sign
                      if (val === '' || /^[0-9+ ]*$/.test(val)) setPhone(val);
                    }}
                    placeholder="e.g. 98 123 456 or +216 98 123 456"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Industry{' '}
                    <span className="normal-case tracking-normal">(Optional)</span>
                  </label>
                  {/* Free text — "Fortune 500", "3PL Logistics" are valid industry names */}
                  <input
                    type="text"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    placeholder="e.g. Food & Beverage"
                    className={inputCls}
                  />
                </div>
              </>
            )}

          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full px-3.5 py-2 rounded-lg bg-blue-700 text-white font-sans text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Activating…' : 'Activate account'}
          </button>
        </div>

      </div>
    </div>
  );
}