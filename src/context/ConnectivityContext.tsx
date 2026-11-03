import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigApi } from '../api';

interface ConnectivityContextType {
  /** Browser has network access */
  isOnline: boolean;
  /** Backend API + MySQL answered the last health probe */
  apiHealthy: boolean;
  lastCheck: string;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

export const ConnectivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);
  const [lastCheck, setLastCheck] = useState<string>('');

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const h = await ConfigApi.health();
        if (!cancelled) setApiHealthy(h.status === 'OK');
      } catch {
        if (!cancelled) setApiHealthy(false);
      } finally {
        if (!cancelled) setLastCheck(new Date().toLocaleTimeString());
      }
    };
    probe();
    const id = setInterval(probe, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <ConnectivityContext.Provider value={{ isOnline, apiHealthy, lastCheck }}>{children}</ConnectivityContext.Provider>
  );
};

export const useConnectivity = () => {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) throw new Error('useConnectivity must be used within a ConnectivityProvider');
  return ctx;
};
