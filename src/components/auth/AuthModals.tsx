import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { errorMessage } from '../../api';
import { Lock, Mail, User, ShieldCheck, CheckCircle2, X, AlertCircle, Building, Phone } from 'lucide-react';

type View = 'LOGIN' | 'SIGNUP' | 'FORGOT' | 'RESET';

interface AuthModalsProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: View;
  /** Pre-filled when the user arrives from the e-mailed reset link */
  resetToken?: string;
  onAuthenticated?: () => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  isOpen,
  onClose,
  initialView = 'LOGIN',
  resetToken = '',
  onAuthenticated,
}) => {
  const { isOcean } = useTheme();
  const { tx } = useLanguage();
  const { login, signup, requestPasswordReset, completePasswordReset } = useAuth();

  const [view, setView] = useState<View>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState(resetToken);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setToken(resetToken);
      setMessage('');
    }
  }, [isOpen, initialView, resetToken]);

  if (!isOpen) return null;

  const fail = (err: unknown) => {
    setIsSuccess(false);
    setMessage(errorMessage(err));
  };
  const switchView = (v: View) => {
    setView(v);
    setMessage('');
  };

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setMessage('');
    try {
      await fn();
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await login(email, password);
      setPassword('');
      onAuthenticated?.();
      onClose();
    });
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await signup({ name, email, password, company: company || undefined, phone: phone || undefined });
      setPassword('');
      onAuthenticated?.();
      onClose();
    });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const msg = await requestPasswordReset(email);
      setIsSuccess(true);
      setMessage(msg);
    });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const msg = await completePasswordReset(token, newPassword);
      setNewPassword('');
      setIsSuccess(true);
      setMessage(msg);
      setTimeout(() => switchView('LOGIN'), 1500);
    });
  };

  const input = `w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
    isOcean ? 'bg-[#003152] border-[#006cae] text-white placeholder:text-cyan-200/50' : 'bg-slate-50 border-slate-300 text-slate-900'
  }`;
  const label = `block text-xs font-semibold mb-1 ${isOcean ? 'text-cyan-200' : 'text-slate-600'}`;
  const icon = `w-4 h-4 absolute left-3 top-3 ${isOcean ? 'text-cyan-200' : 'text-slate-400'}`;
  const submit = (text: string) => (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 rounded-xl font-bold text-sm bg-[#f05a36] hover:bg-[#d94a28] disabled:opacity-60 text-white shadow-md cursor-pointer transition-all"
    >
      {loading ? tx('Please wait…') : tx(text)}
    </button>
  );
  const link = 'text-cyan-300 hover:underline cursor-pointer font-medium';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div
        className={`relative max-w-md w-full rounded-3xl border shadow-2xl overflow-hidden ${
          isOcean ? 'bg-[#004b7a] border-[#006cae] text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-xl cursor-pointer z-10 ${
            isOcean ? 'text-cyan-200 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`p-6 pb-4 border-b ${isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`p-1.5 rounded-lg ${isOcean ? 'bg-cyan-400/20 text-cyan-200' : 'bg-cyan-500/10 text-[#005f9e]'}`}>
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${isOcean ? 'text-cyan-200' : 'text-[#005f9e]'}`}>
              {tx('Secure account access')}
            </span>
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">
            {view === 'LOGIN' && tx('Sign in')}
            {view === 'SIGNUP' && tx('Create your account')}
            {view === 'FORGOT' && tx('Reset your password')}
            {view === 'RESET' && tx('Choose a new password')}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          {message && (
            <div
              role={isSuccess ? 'status' : 'alert'}
              aria-live={isSuccess ? 'polite' : 'assertive'}
              className={`p-3 rounded-xl text-sm font-semibold flex items-start gap-2 border ${
                isSuccess
                  ? isOcean
                    ? 'bg-emerald-950 text-emerald-100 border-emerald-400'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : isOcean
                    ? 'bg-rose-950 text-rose-100 border-rose-400'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              {isSuccess
                ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
              <span className="min-w-0 break-words leading-5">{tx(message)}</span>
            </div>
          )}

          {view === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={label}>{tx('Email')}</label>
                <div className="relative">
                  <Mail className={icon} />
                  <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" className={input} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className={`font-semibold ${isOcean ? 'text-cyan-200' : 'text-slate-600'}`}>{tx('Password')}</label>
                  <button type="button" onClick={() => switchView('FORGOT')} className={link}>{tx('Forgot password?')}</button>
                </div>
                <div className="relative">
                  <Lock className={icon} />
                  <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder={tx('Your password')} className={input} />
                </div>
              </div>
              {submit('Sign in')}
              <p className="text-xs text-center">
                {tx('New here?')} <button type="button" onClick={() => switchView('SIGNUP')} className={link}>{tx('Create an account')}</button>
              </p>
            </form>
          )}

          {view === 'SIGNUP' && (
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className={label}>{tx('Full name')}</label>
                <div className="relative"><User className={icon} />
                  <input required value={name} onChange={e => setName(e.target.value)} className={input} placeholder={tx('Your name')} /></div>
              </div>
              <div>
                <label className={label}>{tx('Email')}</label>
                <div className="relative"><Mail className={icon} />
                  <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={input} placeholder="name@company.com" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>{tx('Company')}</label>
                  <div className="relative"><Building className={icon} />
                    <input value={company} onChange={e => setCompany(e.target.value)} className={input} placeholder={tx('Optional')} /></div>
                </div>
                <div>
                  <label className={label}>{tx('Phone')}</label>
                  <div className="relative"><Phone className={icon} />
                    <input value={phone} onChange={e => setPhone(e.target.value)} className={input} placeholder={tx('Optional')} /></div>
                </div>
              </div>
              <div>
                <label className={label}>{tx('Password (min. 8 characters)')}</label>
                <div className="relative"><Lock className={icon} />
                  <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={input} /></div>
              </div>
              {submit('Create account')}
              <p className="text-xs text-center">
                {tx('Already registered?')} <button type="button" onClick={() => switchView('LOGIN')} className={link}>{tx('Sign in')}</button>
              </p>
            </form>
          )}

          {view === 'FORGOT' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className={`text-xs ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
                {tx('Enter your account email and we will send you a reset link.')}
              </p>
              <div className="relative"><Mail className={icon} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={input} placeholder="name@company.com" /></div>
              {submit('Send reset link')}
              <p className="text-xs text-center"><button type="button" onClick={() => switchView('LOGIN')} className={link}>{tx('Back to sign in')}</button></p>
            </form>
          )}

          {view === 'RESET' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className={label}>{tx('Reset token')}</label>
                <input required value={token} onChange={e => setToken(e.target.value)}
                  className={input.replace('pl-9', 'pl-3') + ' font-mono'} placeholder={tx('Paste the token from your email')} />
              </div>
              <div>
                <label className={label}>{tx('New password (min. 8 characters)')}</label>
                <div className="relative"><Lock className={icon} />
                  <input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={input} /></div>
              </div>
              {submit('Update password')}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
