import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { ConnectivityProvider } from './context/ConnectivityContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { AuthModals } from './components/auth/AuthModals';
import { TAB_PATHS, tabFromPath } from './routes/paths';
import { TrackPage } from './pages/TrackPage';
import { BookingPage } from './pages/BookingPage';
import { BookingCallbackPage } from './pages/BookingCallbackPage';
import { PaymentPage } from './pages/PaymentPage';
import { MapPage } from './pages/MapPage';
import { PortalPage } from './pages/PortalPage';
import { AdminPage } from './pages/AdminPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';

function Shell() {
  const { isOcean } = useTheme();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authView, setAuthView] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT' | 'RESET'>('LOGIN');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const openLogin = () => { setAuthView('LOGIN'); setResetToken(''); setAuthOpen(true); };
  const goTab = (tab: string) => { nav(TAB_PATHS[tab] || '/'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isOcean ? 'bg-[#00375b] text-white selection:bg-[#005f9e]' : 'bg-[#f8fafc] text-slate-900 selection:bg-[#005f9e] selection:text-white'
    }`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-slate-900 focus:shadow-xl">Skip to main content</a>
      <Navbar activeTab={tabFromPath(pathname)} setActiveTab={goTab} onOpenAuth={openLogin} onToggleSidebar={() => setSidebarOpen(v => !v)} sidebarOpen={sidebarOpen} />
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpenAuth={openLogin} />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Routes>
          <Route path="/" element={<TrackPage />} />
          <Route path="/track/:ref" element={<TrackPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/callback" element={<BookingCallbackPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/map" element={<MapPage onLogin={openLogin} />} />
          <Route path="/map/:ref" element={<MapPage onLogin={openLogin} />} />
          <Route path="/portal" element={<PortalPage onLogin={openLogin} />} />
          <Route path="/admin/*" element={<AdminPage onLogin={openLogin} />} />
          <Route path="/reset-password" element={<ResetPasswordPage onOpenReset={(t) => { setResetToken(t); setAuthView('RESET'); setAuthOpen(true); }} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </main>
      </div>
      <AuthModals
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialView={authView}
        resetToken={resetToken}
        onAuthenticated={() => setAuthOpen(false)}
      />
      <Footer onSelectTab={goTab} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ConnectivityProvider>
            <BrowserRouter>
              <Shell />
            </BrowserRouter>
          </ConnectivityProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
