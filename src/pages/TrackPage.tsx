import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Activity, CreditCard, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ShipmentTracker } from '../components/tracker/ShipmentTracker';
import { Shipment } from '../types/logistics';
import { useLanguage } from '../context/LanguageContext';

export const TrackPage: React.FC = () => {
  const { ref } = useParams();
  const nav = useNavigate();
  const { isOcean } = useTheme();
  const { isStaff } = useAuth();
  const { tx } = useLanguage();

  const card = `p-5 rounded-2xl border transition-all cursor-pointer group ${
    isOcean ? 'bg-[#004b7a] border-[#006cae]/60 hover:bg-[#00578d] text-white' : 'bg-white border-slate-200 hover:border-[#005f9e] hover:shadow-md text-slate-900'
  }`;
  const muted = isOcean ? 'text-cyan-100' : 'text-slate-600';
  const items = [
    { to: '/booking', icon: <CreditCard className="w-5 h-5" />, bg: 'bg-[#f05a36]', tag: tx('Booking'), title: tx('Book Freight & Instant Rates'), body: tx('Get a server-calculated quote and reserve space; pay online when Paystack is enabled.'), cta: tx('Calculate Rates & Reserve') },
    { to: '/portal', icon: <ShieldCheck className="w-5 h-5" />, bg: 'bg-[#005f9e]', tag: tx('My account'), title: tx('My shipments'), body: tx('See your shipments, milestones and invoices, and claim shipments to your account.'), cta: tx('Open Portal') },
    ...(isStaff ? [{ to: '/admin', icon: <Activity className="w-5 h-5" />, bg: 'bg-[#005f9e]', tag: tx('Staff'), title: tx('Operations'), body: tx('Manage shipments, milestones, customer handoffs and service alerts.'), cta: tx('Open Operations') }] : []),
  ];

  return (
    <div className="space-y-8">
      <ShipmentTracker
        key={ref || 'search'}
        initialQuery={ref}
        onNavigateToMap={(s: Shipment) => nav(`/map/${encodeURIComponent(s.trackingNumber)}`)}
        onNavigateToCustomerPortal={() => nav('/portal')}
      />
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isStaff ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 pt-2`}>
        {items.map(i => (
          <button type="button" key={i.to} onClick={() => { nav(i.to); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`${card} text-left w-full`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl text-white ${i.bg}`}>{i.icon}</div>
              <span className={`text-[11px] font-bold ${isOcean ? 'text-cyan-200' : 'text-[#005f9e]'}`}>{i.tag}</span>
            </div>
            <h4 className="font-bold text-base mb-1">{i.title}</h4>
            <p className={`text-xs mb-3 leading-relaxed ${muted}`}>{i.body}</p>
            <div className="text-xs font-bold text-cyan-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>{i.cta}</span><ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
