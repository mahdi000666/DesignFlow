import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/clients';
import { AuthShell, AuthCard, AuthInput, AlertBox, AuthButton, PasswordRequirements } from '../../components/AuthComponents';
import { isPasswordValid } from '../../utils/auth';

// Minimal lock illustration
function ResetIllustration() {
  return (
    <div className="w-40 h-32">
      <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="80" cy="65" r="60" fill="#eef2ff" />
        <circle cx="80" cy="65" r="44" fill="#e0e7ff" />
        {/* Shackle */}
        <path d="M62 65 V52 Q62 35 80 35 Q98 35 98 52 V65" stroke="#a5b4fc" strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* Body */}
        <rect x="52" y="62" width="56" height="42" rx="8" fill="#6366f1" />
        {/* Keyhole */}
        <circle cx="80" cy="80" r="7" fill="#eef2ff" />
        <rect x="77" y="82" width="6" height="10" rx="3" fill="#eef2ff" />
      </svg>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Token validation state
  const [tokenError,   setTokenError]   = useState('');
  const [tokenLoading, setTokenLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setTokenError('No token found in the URL.');
      setTokenLoading(false);
      return;
    }
    apiClient
      .get(`/auth/password-reset-info/?token=${token}`)
      .then(() => setTokenLoading(false))
      .catch((err) => {
        const data = err.response?.data as { detail?: string } | undefined;
        setTokenError(data?.detail ?? 'This reset link is invalid or has expired.');
        setTokenLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    setError('');
    if (!isPasswordValid(password)) {
      return setError('Please satisfy all password requirements.');
    }
    if (password !== confirm) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/password-reset/confirm/', { token, password });
      navigate('/login', { state: { passwordReset: true }, replace: true });
    } catch (err) {
      const e = err as { response?: { data?: { token?: string[]; password?: string[]; detail?: string } } };
      const d = e.response?.data;
      setError(d?.token?.[0] ?? d?.password?.[0] ?? d?.detail ?? 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenLoading) {
    return (
      <AuthShell>
        <p className="text-sm text-slate-400">Verifying reset link…</p>
      </AuthShell>
    );
  }

  if (tokenError) {
    return (
      <AuthShell>
        <AuthCard accent="error">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Link unavailable</h1>
            <p className="text-sm text-slate-500 leading-relaxed">{tokenError}</p>
            <Link to="/forgot-password" className="mt-6 text-sm font-medium text-primary hover:text-primary-600 transition-colors">
              Request a new link →
            </Link>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard>
        <div className="flex justify-center mb-7">
          <ResetIllustration />
        </div>

        <h1 className="text-xl font-bold text-slate-900 text-center mb-1.5">
          Set a new password
        </h1>
        <p className="text-sm text-slate-500 text-center mb-7 leading-relaxed">
          Choose a strong password for your account.
        </p>

        {error && <AlertBox variant="error">{error}</AlertBox>}

        <div className="space-y-4">
          <AuthInput
            type={showPwd ? 'text' : 'password'}
            label="New Password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            showToggle
            isToggled={showPwd}
            onToggle={() => setShowPwd(p => !p)}
          />

          <AuthInput
            type={showConf ? 'text' : 'password'}
            label="Confirm Password"
            value={confirm}
            onChange={setConfirm}
            placeholder="••••••••"
            showToggle
            isToggled={showConf}
            onToggle={() => setShowConf(p => !p)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          <PasswordRequirements password={password} />

          <div className="pt-1">
            <AuthButton onClick={handleSubmit} loading={loading}>
              Reset Password
            </AuthButton>
          </div>
        </div>
      </AuthCard>
    </AuthShell>
  );
}