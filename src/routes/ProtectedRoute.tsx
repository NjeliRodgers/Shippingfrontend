import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lock } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** Require a staff role (DISPATCHER / ADMIN / OPERATIONS_DIRECTOR) */
  staffOnly?: boolean;
  /** Opens the login modal */
  onLogin: () => void;
}

/** Route guard that relies on the real, API-validated session (never on client-side role switching). */
export const ProtectedRoute: React.FC<Props> = ({ children, staffOnly, onLogin }) => {
  const { isAuthenticated, isStaff, loading, role } = useAuth();
  const { isOcean } = useTheme();

  if (loading) {
    return <div className="py-24 text-center text-sm opacity-70">Checking your session…</div>;
  }
  if (!isAuthenticated || (staffOnly && !isStaff)) {
    return (
      <div className={`p-8 sm:p-12 rounded-3xl border shadow-xl text-center space-y-5 max-w-2xl mx-auto my-8 ${
        isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
          isOcean ? 'bg-amber-400/20 text-amber-200' : 'bg-amber-500/10 text-amber-700'
        }`}>
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-extrabold tracking-tight">
          {!isAuthenticated ? 'Sign in required' : 'Staff access required'}
        </h3>
        <p className={`text-sm ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
          {!isAuthenticated
            ? 'Please sign in to continue.'
            : `Your account role (${role.replace('_', ' ')}) cannot open this area. Ask an administrator to grant staff access.`}
        </p>
        {!isAuthenticated && (
          <button
            onClick={onLogin}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-[#f05a36] hover:bg-[#d94a28] text-white shadow-lg cursor-pointer"
          >
            Sign in
          </button>
        )}
      </div>
    );
  }
  return <>{children}</>;
};
