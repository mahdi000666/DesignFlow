import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/clients';
import { BrandMark, AuthInput, AlertBox, AuthButton, PasswordRequirements } from '../../components/AuthComponents';

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

  const allMet =
    password.length >= 8 &&
    /[a-z]/.test(password) && /[A-Z]/.test(password) &&
    /[0-9!@#$%^&*()_\-+=[\]{}|;:'",./<>?`~\\]/.test(password);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
          <BrandMark />
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <p className="text-slate-500 text-sm mb-4">This reset link is invalid or has expired.</p>
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-600 transition-colors">
              Request a new link →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const handleSubmit = async () => {
    setError('');
    if (!allMet)              return setError('Please satisfy all password requirements.');
    if (password !== confirm)  return setError('Passwords do not match.');

    setLoading(true);
    try {
      await apiClient.post('/auth/password-reset/confirm/', { token, password });
      navigate('/login', { state: { passwordReset: true }, replace: true });
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
        <BrandMark />
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-primary to-indigo-400" />

          <div className="px-10 py-9">
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

              <PasswordRequirements password={password} />

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

              <div className="pt-1">
                <AuthButton onClick={handleSubmit} loading={loading}>
                  Reset Password
                </AuthButton>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
