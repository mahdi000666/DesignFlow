import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/clients';
import { AuthShell, AuthCard, AuthInput, AlertBox, AuthButton, PasswordRequirements } from '../../components/AuthComponents';
import { isPasswordValid } from '../../utils/auth';
import ResetIllustration from '../../assets/illustrations/reset-illustration.svg?react';
import { ErrorXIcon } from '../../components/Icons';

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
              <ErrorXIcon className="w-7 h-7 text-red-500" />
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