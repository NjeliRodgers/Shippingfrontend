import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../context/ConnectivityContext';
import { Language } from '../../i18n/translations';
import { 
  Compass, Ship, Globe, 
  Wifi, WifiOff, ShieldCheck, 
  User, Menu, ChevronDown, Check,
  Box
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onToggleSidebar,
  sidebarOpen,
}) => {
  const { isOcean } = useTheme();
  const { language, setLanguage, t, tx } = useLanguage();
  const { user, role, logout, isStaff } = useAuth();
  const { isOnline, apiHealthy } = useConnectivity();
  const isOffline = !isOnline || !apiHealthy;

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  
  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', label: '中文 (简体)', flag: '🇨🇳' },
    { code: 'ar', label: 'العربية', flag: '🇦🇪' },
  ];


  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${
      isOcean 
        ? 'bg-[#004b7a]/95 border-[#006cae]/60 text-white shadow-md' 
        : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Service status and display preferences */}
      <div className={`px-4 sm:px-6 py-1 text-[11px] font-medium border-b flex items-center justify-between gap-2 ${
        isOcean ? 'bg-[#00385c] border-[#004b7a] text-cyan-100' : 'bg-slate-50 border-slate-200 text-slate-500'
      }`}>
        <div className="flex items-center gap-3">
          {/* Live connectivity indicator (browser network + API/MySQL health probe) */}
          <span
            title={!isOnline ? 'Your device is offline' : !apiHealthy ? 'The API or database is not responding' : 'Connected to the live API'}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold ${
              isOffline
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                : isOcean ? 'bg-white/15 text-cyan-100 border border-white/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            }`}
          >
            {isOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            <span>{!isOnline ? t.offlineBadge : !apiHealthy ? tx('Service unavailable') : tx('Service online')}</span>
          </span>

          <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] ${
            isOcean ? 'text-cyan-200 font-medium' : 'text-[#005f9e]'
          }`}>
            <ShieldCheck className="w-3 h-3" />
            <span>{tx('Secure connection')}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">

          {user && (
            <span className={`font-bold ${isOcean ? 'text-cyan-100' : 'text-[#005f9e]'}`}>
              {t.activeRole}: {role.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Main Navbar Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo - BlueCrest Cargo Lines */}
        <button
          type="button"
          onClick={() => setActiveTab('TRACK')}
          aria-label={`${t.appName} ${tx('Home')}`}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#005f9e] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform border border-white/20">
            <Box className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`font-black text-lg tracking-wider uppercase font-sans ${
                isOcean ? 'text-white' : 'text-[#005f9e]'
              }`}>
                BLUECREST
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                isOcean ? 'bg-white/20 text-cyan-200 border border-white/30' : 'bg-[#005f9e]/10 text-[#005f9e] border border-[#005f9e]/20'
              }`}>
                CARGO LINES
              </span>
            </div>
            <p className={`text-[10px] leading-none tracking-wide font-medium ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
              {tx('simple. reliable. fast.')}
            </p>
          </div>
        </button>

        {/* Right Action Icons: Language Selector & Auth */}
        <div className="flex items-center gap-2">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              aria-label={`Language: ${language}`}
              aria-expanded={langDropdownOpen}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all ${
                isOcean ? 'bg-[#00385c] border-[#005f9e] text-cyan-100 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              <Globe className="w-4 h-4 text-cyan-300" />
              <span className="uppercase">{language}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {langDropdownOpen && (
              <div className={`absolute right-0 mt-2 w-40 rounded-xl shadow-2xl border p-1.5 z-50 animate-fadeIn ${
                isOcean ? 'bg-[#004875] border-[#006cae] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {languages.map(l => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                      language === l.code
                        ? 'bg-[#005f9e] text-white font-bold'
                        : isOcean ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </span>
                    {language === l.code && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Auth Button */}
          {user ? (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${isOcean ? 'bg-white/10 text-cyan-100' : 'bg-slate-100 text-slate-700'}`} title={user.email}>
              <User className="w-4 h-4" />
              <span>{user.name.split(' ')[0]}</span>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#f05a36] hover:bg-[#d94a28] text-white shadow-md transition-all cursor-pointer">
              <User className="w-4 h-4" />
              <span>{t.signIn}</span>
            </button>
          )}
          {user && (
            <button
              onClick={logout}
              title={tx('Sign out')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                isOcean ? 'bg-[#00385c] border-[#005f9e] text-cyan-100 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              {tx('Sign out')}
            </button>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? tx('Close navigation menu') : tx('Open navigation menu')}
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            className={`lg:hidden p-2 rounded-xl cursor-pointer ${
              isOcean ? 'text-cyan-100 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>


    </header>
  );
};
