import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../api/clients';
import { useAuth } from '../../hooks/useAuth';
import { BrandMark, AuthInput, AlertBox, AuthButton, LoginIllustration } from '../../components/AuthComponents';

// Role → dashboard path mapping.
const ROLE_HOME: Record<string, string> = {
  Manager:  '/manager',
  Designer: '/designer',
  Client:   '/client',
};

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [remember,   setRemember]   = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const justActivated = (location.state as { activated?: boolean } | null)?.activated === true;

  const handleSubmit = async () => {
    setError('');
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
      {/* Left Side — Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-28">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="mb-10">
            <BrandMark />
          </div>

          {/* Welcome */}
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-8">Sign in to continue to your account.</p>

          {/* Alerts */}
          {justActivated && (
            <AlertBox variant="success">
              Account activated — you can now sign in.
            </AlertBox>
          )}
          {error && <AlertBox variant="error">{error}</AlertBox>}

          {/* Form */}
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
              onToggle={() => setShowPwd(!showPwd)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => {/* TODO: forgot password flow */}}
                className="text-sm font-medium text-primary hover:text-primary-600 transition-colors"
              >
                Forgot password?
              </button>
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

      {/* Right Side — Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-100 to-indigo-200 items-center justify-center relative overflow-hidden">
        <div className="absolute top-10 right-10 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <LoginIllustration />
      </div>
    </div>
  );
}