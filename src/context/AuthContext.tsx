import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types/logistics';
import { AuthApi, setUnauthorizedHandler, tokenStore } from '../api';
import { isStaffRole } from '../utils/format';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isStaff: boolean;
  /** true while the stored session is being validated against the API */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: { name: string; email: string; password: string; company?: string; phone?: string }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  completePasswordReset: (token: string, newPassword: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!tokenStore.get());

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Restore the session from the stored JWT
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setLoading(false);
      return () => setUnauthorizedHandler(null);
    }
    AuthApi.me()
      .then(r => setUser(r.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await AuthApi.login(email, password);
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  };

  const signup: AuthContextType['signup'] = async data => {
    const res = await AuthApi.register(data);
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  };

  const refreshUser = async () => {
    if (!tokenStore.get()) return;
    const r = await AuthApi.me();
    setUser(r.user);
  };

  const requestPasswordReset = async (email: string) => (await AuthApi.forgotPassword(email)).message;
  const completePasswordReset = async (token: string, newPassword: string) =>
    (await AuthApi.resetPassword(token, newPassword)).message;

  const role: UserRole = user?.role || 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isStaff: !!user && isStaffRole(user.role),
        loading,
        login,
        signup,
        logout,
        refreshUser,
        requestPasswordReset,
        completePasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
