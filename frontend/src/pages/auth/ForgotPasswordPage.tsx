import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/clients';
import { BrandMark, AuthInput, AlertBox, AuthButton } from '../../components/AuthComponents';

// Illustration — abstract envelope sent
function SentIllustration() {
  return (
    <div className="w-40 h-32">
      <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="80" cy="65" r="60" fill="#eef2ff" />
        <circle cx="80" cy="65" r="44" fill="#e0e7ff" />
        {/* Envelope */}
        <rect x="30" y="48" width="90" height="60" rx="7" fill="white" stroke="#c7d2fe" strokeWidth="1.5" />
        <path d="M30 48 L75 76 L120 48" stroke="#c7d2fe" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Lines inside */}
        <line x1="45" y1="90" x2="95" y2="90" stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round" />
        <line x1="45" y1="98" x2="80" y2="98" stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round" />
        {/* Checkmark badge */}
        <circle cx="112" cy="46" r="13" fill="#6366f1" />
        <path d="M106 46 L110 50 L118 41" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) return setError('Please enter your email address.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return setError('Please enter a valid email address.');
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/password-reset/', { email });
      setSent(true);
    } catch {
      // Always show success to avoid email enumeration
      setSent(true);
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
          </div>
        </div>
      </main>
    </div>
  );
}
