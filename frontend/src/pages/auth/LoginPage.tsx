import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import apiClient from '../../api/clients';
import { useAuth } from '../../hooks/useAuth';
import { BrandMark, AuthInput, AlertBox, AuthButton } from '../../components/AuthComponents';
import { isEmailValid } from '../../utils/auth';
import LoginIllustration from '../../assets/illustrations/login.svg?react';

const ROLE_HOME: Record<string, string> = {
  Manager:  '/manager',
  Designer: '/designer',
  Client:   '/client',
};

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const justActivated = (location.state as { activated?: boolean } | null)?.activated === true;
  const justReset = (location.state as { passwordReset?: boolean } | null)?.passwordReset === true;

  const handleSubmit = async () => {
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return setError('Please enter your email address.');
    }
    if (!isEmailValid(trimmedEmail)) {
      return setError('Please enter a valid email address.');
    }
    if (password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/token/', { email, password });
      const decoded  = login(data.access, data.refresh);
      navigate(ROLE_HOME[decoded.role] ?? '/', { replace: true });
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail ?? 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* ── Left: Form ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-28">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-10">
            <BrandMark />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-8">Sign in to continue to your account.</p>

          {justActivated && (
            <AlertBox variant="success">
              Account activated — you can now sign in.
            </AlertBox>
          )}
          {justReset && <AlertBox variant="success">Password updated — you can now sign in.</AlertBox>}
          {error && <AlertBox variant="error">{error}</AlertBox>}

          <div className="space-y-5">
            <AuthInput
              type="email"
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="your@email.com"
            />

            <AuthInput
              type={showPwd ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              showToggle
              isToggled={showPwd}
              onToggle={() => setShowPwd(p => !p)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-600 transition-colors">
                Forgot password?
              </Link>
            </div>

            <AuthButton onClick={handleSubmit} loading={loading}>
              Sign In
            </AuthButton>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <span className="font-medium text-primary">Contact your manager</span>
          </p>
        </div>
      </div>

      {/* ── Right: Illustration ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-indigo-800 via-indigo-600 to-indigo-400 items-center justify-center relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-28 -right-20 w-96 h-96 rounded-full bg-white/6" />
        <div className="absolute -bottom-14 -left-14 w-64 h-64 rounded-full bg-white/6" />
        <div className="absolute bottom-28 right-20 w-40 h-40 rounded-full bg-white/6" />

        <div className="relative z-10 flex flex-col items-center px-10 max-w-md">
          <LoginIllustration />
          <div className="mt-8 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight mb-2">
              Manage your design projects
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Track budgets, timelines, and team performance<br />
              all in one streamlined workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}