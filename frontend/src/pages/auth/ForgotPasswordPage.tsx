import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/clients';
import { AuthShell, AuthCard, AuthInput, AlertBox, AuthButton } from '../../components/AuthComponents';
import { isEmailValid } from '../../utils/auth';
import SentIllustration from '../../assets/illustrations/sent.svg?react';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async () => {
    setError('');
    const trimmed = email.trim();

    if (!trimmed) {
      return setError('Please enter your email address.');
    }
    if (!isEmailValid(trimmed)) {
      return setError('Please enter a valid email address.');
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/password-reset/', { email: trimmed });
      setSent(true);
    } catch {
      // Always show success to avoid email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard>
        {sent ? (
          // ── Success state ──
          <div className="text-center">
            <div className="flex justify-center mb-7">
              <SentIllustration />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h1>
            <p className="text-sm text-slate-500 leading-relaxed mb-8">
              If an account exists for <span className="font-medium text-slate-700">{email}</span>,
              you'll receive a password reset link within a few minutes.
            </p>
            <Link
              to="/login"
              className="text-sm font-medium text-primary hover:text-primary-600 transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          // ── Request state ──
          <>
            <h1 className="text-xl font-bold text-slate-900 text-center mb-1.5">
              Forgot your password?
            </h1>
            <p className="text-sm text-slate-500 text-center mb-7 leading-relaxed">
              Enter your email and we'll send you a reset link.
            </p>

            {error && <AlertBox variant="error">{error}</AlertBox>}

            <div className="space-y-5">
              <AuthInput
                type="email"
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="your@email.com"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />

              <AuthButton onClick={handleSubmit} loading={loading}>
                Send Reset Link
              </AuthButton>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              Remember it?{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary-600 transition-colors">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </AuthCard>
    </AuthShell>
  );
}