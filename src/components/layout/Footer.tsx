import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Box, Phone, Mail, MapPin, 
  Linkedin, Facebook, Twitter, MessageCircle,
  ExternalLink, ChevronRight, CheckCircle2
} from 'lucide-react';

interface FooterProps {
  onSelectTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  const { isOcean } = useTheme();
  const { tx } = useLanguage();
  const [chatOpen, setChatOpen] = useState(false);

  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 4000);
  };



  return (
    <footer className="relative overflow-hidden text-white transition-colors duration-300 mt-20 bg-[#005f9e]">
      {/* Toast notice if clicked */}
      {statusNotice && (
        <div className="fixed top-20 right-6 z-50 bg-[#00385c] text-white border border-[#0073be] px-4 py-3 rounded-xl shadow-2xl text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-300" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Background Watermark Container Graphic (Matching Almar visual design) */}
      <div className="absolute right-0 bottom-0 pointer-events-none opacity-10 select-none translate-x-12 translate-y-12">
        <svg width="460" height="460" viewBox="0 0 200 200" fill="none" stroke="currentColor">
          <polygon points="100,15 175,55 175,145 100,185 25,145 25,55" strokeWidth="8" />
          <line x1="100" y1="15" x2="100" y2="185" strokeWidth="6" />
          <line x1="100" y1="100" x2="175" y2="55" strokeWidth="6" />
          <line x1="100" y1="100" x2="25" y2="55" strokeWidth="6" />
          <line x1="100" y1="100" x2="100" y2="185" strokeWidth="6" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 pt-16 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-14">
          
          {/* Col 1: Brand & Socials (3 cols) */}
          <div className="lg:col-span-3 space-y-5">
            {/* Logo matching the reference image layout */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('TRACK')}>
              {/* Hexagonal container / cargo icon */}
              <div className="w-11 h-11 flex items-center justify-center border-2 border-white/90 rounded-lg bg-white/10 shadow-sm">
                <Box className="w-6 h-6 text-white stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase font-sans">
                  BLUECREST
                </h3>
                <p className="text-[10px] tracking-widest text-cyan-200 uppercase font-semibold">
                  CARGO LINES
                </p>
              </div>
            </div>

            {/* Tagline matching the image: simple. reliable. fast. */}
            <div className="text-sm font-medium text-cyan-100 leading-tight space-y-0.5 pt-1">
              <p className="font-semibold">simple.</p>
              <p className="font-semibold">reliable.</p>
              <p className="font-semibold">fast.</p>
            </div>

            {/* Social Icons matching the image */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="#linkedin"
                onClick={(e) => { e.preventDefault(); showNotice(tx('Social media links are not configured yet. Please use the email or phone details below.')); }}
                className="w-8 h-8 rounded bg-white text-[#005f9e] hover:bg-cyan-200 transition-colors flex items-center justify-center font-bold text-xs cursor-pointer shadow-sm"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4 fill-current" />
              </a>
              <a
                href="#facebook"
                onClick={(e) => { e.preventDefault(); showNotice(tx('Social media links are not configured yet. Please use the email or phone details below.')); }}
                className="w-8 h-8 rounded bg-white text-[#005f9e] hover:bg-cyan-200 transition-colors flex items-center justify-center font-bold text-xs cursor-pointer shadow-sm"
                title="Facebook"
              >
                <Facebook className="w-4 h-4 fill-current" />
              </a>
              <a
                href="#twitter"
                onClick={(e) => { e.preventDefault(); showNotice(tx('Social media links are not configured yet. Please use the email or phone details below.')); }}
                className="w-8 h-8 rounded bg-white/20 text-white hover:bg-white hover:text-[#005f9e] transition-colors flex items-center justify-center text-xs cursor-pointer"
                title="Twitter"
              >
                <Twitter className="w-4 h-4 fill-current" />
              </a>
            </div>
          </div>

          {/* Col 2: LINKS (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-white border-b border-white/20 pb-2">
              {tx('LINKS')}
            </h4>
            <ul className="space-y-2.5 text-xs text-cyan-100">
              <li>
                <button 
                  onClick={() => onSelectTab('TRACK')}
                  className="hover:text-white hover:underline transition-colors cursor-pointer text-left font-medium"
                >
                  {tx('Home')}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onSelectTab('TRACK')}
                  className="hover:text-white hover:underline transition-colors cursor-pointer text-left font-medium"
                >
                  {tx('Track Shipment')}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onSelectTab('MAP')}
                  className="hover:text-white hover:underline transition-colors cursor-pointer text-left font-medium"
                >
                  {tx('Fleet Map AIS')}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onSelectTab('ANALYTICS')}
                  className="hover:text-white hover:underline transition-colors cursor-pointer text-left font-medium"
                >
                  {tx('Analytics & Reports')}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onSelectTab('SECURITY')}
                  className="hover:text-white hover:underline transition-colors cursor-pointer text-left font-medium"
                >
                  {tx('Security & API')}
                </button>
              </li>
            </ul>

            <h4 className="text-xs font-black uppercase tracking-wider text-white pt-4 border-b border-white/20 pb-2">
              {tx('LEGAL')}
            </h4>
            <ul className="space-y-2 text-xs text-cyan-100">
              <li>
                <a href="#terms" onClick={(e) => { e.preventDefault(); showNotice(tx('Shipping terms are not available in this portal yet. Please contact the team for a copy.')); }} className="hover:text-white hover:underline cursor-pointer">
                  {tx('Terms and Conditions')}
                </a>
              </li>
              <li>
                <a href="#privacy" onClick={(e) => { e.preventDefault(); showNotice(tx('The privacy policy is not available in this portal yet. Please contact the team for a copy.')); }} className="hover:text-white hover:underline cursor-pointer">
                  {tx('Privacy Policy')}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: PRODUCTS (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-white border-b border-white/20 pb-2">
              {tx('PRODUCTS')}
            </h4>
            <ul className="space-y-2.5 text-xs text-cyan-100">
              <li>
                <button onClick={() => onSelectTab('BOOKING')} className="hover:text-white hover:underline text-left cursor-pointer">
                  {tx('Dry Freight & Storage Containers')}
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('BOOKING')} className="hover:text-white hover:underline text-left cursor-pointer flex items-center gap-1.5">
                  <span>{tx('Reefer Containers')}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-200 border border-cyan-300/30">{tx('IoT Monitored')}</span>
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('BOOKING')} className="hover:text-white hover:underline text-left cursor-pointer">
                  {tx('Fabrications')}
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('BOOKING')} className="hover:text-white hover:underline text-left cursor-pointer">
                  {tx('Reefer Gensets')}
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('BOOKING')} className="hover:text-white hover:underline text-left cursor-pointer">
                  {tx('ISO Tank Containers')}
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('BOOKING')} className="hover:text-white hover:underline text-left cursor-pointer">
                  {tx('Flat Pack Containers')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: CONTACT US (4 cols - Exact match to image reference) */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-white border-b border-white/20 pb-2">
              {tx('CONTACT US')}
            </h4>
            
            {/* Kenya, Nairobi Hub */}
            <div className="space-y-1 text-xs">
              <p className="font-bold text-white text-sm">Kenya, Nairobi</p>
              <p className="text-cyan-100 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyan-200 shrink-0" />
                <span>Email: <a href="mailto:njelirodgers@gmail.com" className="hover:underline">njelirodgers@gmail.com</a></span>
              </p>
              <p className="text-cyan-100 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-cyan-200 shrink-0" />
                <span>Tel: <a href="tel:+254741618656" className="hover:underline">+254 741 618 656</a></span>
              </p>
            </div>

            {/* Kenya, Mombasa Hub */}
            <div className="space-y-1 text-xs pt-3">
              <p className="font-bold text-white text-sm">Kenya, Mombasa</p>
              <p className="text-cyan-100 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyan-200 shrink-0" />
                <span>Email: <a href="mailto:njelirodgers@gmail.com" className="hover:underline">njelirodgers@gmail.com</a></span>
              </p>
              <p className="text-cyan-100 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-cyan-200 shrink-0" />
                <span>Tel: <a href="tel:+254758075261" className="hover:underline">+254 758 075 261</a></span>
              </p>
            </div>

            {/* Global Terminals note */}
            <div className="pt-2 text-[11px] text-cyan-200/90 font-medium">
              {tx('Global Support: Rotterdam • Shanghai • Los Angeles • Dubai')}
            </div>
          </div>
        </div>

        {/* Bottom Centered Copyright Line matching reference */}
        <div className="pt-8 border-t border-white/20 text-center text-xs text-cyan-100 font-medium">
          Copyright © 2026 · BlueCrest Cargo Lines
        </div>
      </div>

      {/* Quick support contacts */}
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5">
        <button type="button" onClick={() => setChatOpen(!chatOpen)}
          aria-label={chatOpen ? tx('Close support contacts') : tx('Open support contacts')} aria-expanded={chatOpen}
          className="w-12 h-12 rounded-full bg-[#f05a36] hover:bg-[#d94a28] text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer ring-4 ring-white/40">
          {chatOpen ? <span aria-hidden="true" className="text-xl">×</span> : <MessageCircle className="w-6 h-6" />}
        </button>
        {chatOpen && (
          <div className="absolute bottom-16 right-0 w-72 rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 p-5 space-y-3" role="dialog" aria-label={tx('Support contacts')}>
            <div><h4 className="font-bold text-sm">{tx('Contact BlueCrest')}</h4><p className="text-xs text-slate-600 mt-1">{tx('For help with a booking, tracking update, or delivery, contact the team directly.')}</p></div>
            <a href="mailto:njelirodgers@gmail.com" className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm font-semibold text-[#005f9e] hover:bg-cyan-50"><Mail className="w-4 h-4" /> {tx('Email support')}</a>
            <a href="tel:+254741618656" className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm font-semibold text-[#005f9e] hover:bg-cyan-50"><Phone className="w-4 h-4" /> Call Nairobi</a>
          </div>
        )}
      </div>
    </footer>
  );
};
