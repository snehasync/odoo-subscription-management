import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Modal } from '../components/Modal';
import { Shield, Briefcase, Users, Lock, Mail, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Signup form
  const [signupData, setSignupData] = useState({
    fullName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
  });
  const [signupError, setSignupError] = useState<string | null>(null);

  // Forgot password
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setLoginError(res.error || 'Invalid credentials');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (signupData.password.length <= 8) {
      setSignupError('Password must be more than 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(signupData.password)) {
      setSignupError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[a-z]/.test(signupData.password)) {
      setSignupError('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\/\\`~]/.test(signupData.password)) {
      setSignupError('Password must contain at least one special character.');
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await register({
      email: signupData.email,
      password: signupData.password,
      fullName: signupData.fullName,
      company: signupData.company,
      role: 'CUSTOMER',
    });
    setLoading(false);

    if (!res.success) {
      setSignupError(res.error || 'Registration failed.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/auth/forgot-password', { email: forgotEmail });
    setForgotNotice(res.message || 'If registered, reset link dispatched.');
    if (res.data?.devToken) {
      setDevResetToken(res.data.devToken);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devResetToken) return;

    const res = await api.post('/auth/reset-password', {
      token: devResetToken,
      newPassword: newResetPassword,
    });

    if (res.success) {
      setResetSuccess(true);
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setResetSuccess(false);
        setDevResetToken(null);
      }, 2000);
    } else {
      alert(`Reset error: ${res.error?.message || 'Failed'}`);
    }
  };

  const handleQuickLogin = (role: 'ADMIN' | 'STAFF' | 'CUSTOMER') => {
    if (role === 'ADMIN') {
      setEmail('admin@brightloop.io');
      setPassword('Admin@12345!');
    } else if (role === 'STAFF') {
      setEmail('staff1@brightloop.io');
      setPassword('Staff@12345!');
    } else {
      setEmail('billing@acme.com');
      setPassword('Customer@12345!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-blue-600/30 to-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30">
            <span className="text-3xl font-black">⚡</span>
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-black tracking-tight text-white">
          Brightloop
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Automated Subscription Management &amp; Invoicing Platform
        </p>

        {/* 1-Click Quick Demo Switcher */}
        <div className="mt-6 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 backdrop-blur-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
            Demo 1-Click Autofill Credentials
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN')}
              className="flex flex-col items-center p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-colors text-[11px]"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400 mb-1" />
              <span className="font-bold">Admin</span>
              <span className="text-[9px] text-slate-400">Full System</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('STAFF')}
              className="flex flex-col items-center p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-colors text-[11px]"
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-400 mb-1" />
              <span className="font-bold">Staff</span>
              <span className="text-[9px] text-slate-400">Operations</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('CUSTOMER')}
              className="flex flex-col items-center p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-colors text-[11px]"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400 mb-1" />
              <span className="font-bold">Customer</span>
              <span className="text-[9px] text-slate-400">Portal View</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          {/* Mode Switcher */}
          <div className="flex border-b border-slate-700 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setLoginError(null);
              }}
              className={`flex-1 pb-3 text-xs font-bold transition-colors ${
                mode === 'login'
                  ? 'border-b-2 border-blue-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setSignupError(null);
              }}
              className={`flex-1 pb-3 text-xs font-bold transition-colors ${
                mode === 'signup'
                  ? 'border-b-2 border-blue-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              {loginError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setIsForgotModalOpen(true);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-60"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Brightloop'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-4 text-xs">
              {signupError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{signupError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Work Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    placeholder="jane@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={signupData.company}
                  onChange={(e) => setSignupData({ ...signupData, company: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="Apex Technologies"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder=">8 chars, 1 uppercase, 1 lowercase, 1 special char"
                />
                <div className="mt-1 text-[10px] text-slate-400">
                  Must be &gt;8 characters with uppercase, lowercase, and special symbol.
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="Re-enter password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-60"
                >
                  {loading ? 'Creating Account...' : 'Register Customer Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => {
          setIsForgotModalOpen(false);
          setForgotNotice(null);
          setDevResetToken(null);
        }}
        title="Reset Account Password"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Enter your registered email address to receive a secure, single-use password reset link.
          </p>

          {forgotNotice && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-blue-900">
              {forgotNotice}
            </div>
          )}

          {!devResetToken ? (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                  placeholder="name@company.com"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
                >
                  Request Reset Token
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-3 border-t border-slate-100 pt-3">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900 text-[11px]">
                <strong>Development Mock Dispatch:</strong> Single-use token auto-captured:{' '}
                <span className="font-mono">{devResetToken.slice(0, 16)}...</span>
              </div>

              {resetSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 font-semibold">
                  Password updated successfully! You can now log in.
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Enter New Password *</label>
                <input
                  type="password"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder=">8 chars, uppercase, lowercase, special char"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 shadow-sm"
                >
                  Submit New Password
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};
