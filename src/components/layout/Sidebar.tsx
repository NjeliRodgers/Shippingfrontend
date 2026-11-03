import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Anchor, Box, ChartNoAxesColumn, ChevronRight, CircleUserRound, Compass, Map, PackagePlus, Shield, Ship, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

type SidebarProps = { open: boolean; onClose: () => void; onOpenAuth: () => void };
type LinkItem = { label: string; to: string; icon: React.ElementType; end?: boolean };

const linkStyle = ({ isActive }: { isActive: boolean }) => `group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-[#e8f3fb] text-[#005f9e] ring-1 ring-inset ring-[#c8e2f3]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`;

function LinkList({ title, links, onNavigate }: { title: string; links: LinkItem[]; onNavigate: () => void }) {
  return <section aria-label={title} className="mb-6">
    <h2 className="mb-2 px-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{title}</h2>
    <nav className="space-y-1" aria-label={title}>
      {links.map(({ label, to, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={linkStyle} onClick={onNavigate}>
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-[.active]:opacity-70" aria-hidden="true" />
      </NavLink>)}
    </nav>
  </section>;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, onOpenAuth }) => {
  const { user, role, isStaff } = useAuth();
  const { tx } = useLanguage();
  const canManageUsers = role === 'ADMIN' || role === 'OPERATIONS_DIRECTOR';
  const customerLinks: LinkItem[] = [
    { label: tx('Track a shipment'), to: '/', icon: Compass, end: true },
    ...(!user ? [{ label: tx('Track on map'), to: '/map', icon: Map }] : []),
    { label: tx('Book a shipment'), to: '/booking', icon: PackagePlus },
    ...(user ? [{ label: tx('My shipments'), to: '/portal', icon: Box }] : []),
    ...(user ? [{ label: tx('Fleet map'), to: '/map', icon: Map }] : []),
  ];
  const operationsLinks: LinkItem[] = [
    { label: tx('Shipment operations'), to: '/admin', icon: Ship, end: true },
    { label: tx('Fleet map'), to: '/map', icon: Map },
    { label: tx('Reports'), to: '/admin/analytics', icon: ChartNoAxesColumn },
    { label: tx('Notifications'), to: '/admin/notifications', icon: Activity },
    { label: tx('Ports & routes'), to: '/admin/ports', icon: Anchor },
    { label: tx('API & security'), to: '/admin/security', icon: Shield },
  ];
  const closeOnNavigate = () => onClose();

  return <>
    {open && <button type="button" aria-label={tx('Close navigation')} onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
    <aside id="app-sidebar" aria-label={tx('Navigation')} className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,280px)] flex-col border-r border-slate-200 bg-white px-3 pb-4 pt-4 shadow-xl transition-transform duration-200 lg:sticky lg:top-[105px] lg:z-20 lg:h-[calc(100vh-105px)] lg:w-60 lg:shrink-0 lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="mb-5 flex items-center justify-between px-2 lg:hidden"><span className="text-sm font-extrabold text-slate-800">{tx('Navigation')}</span><button type="button" onClick={onClose} aria-label={tx('Close navigation')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <LinkList title={tx(isStaff ? 'Workspace' : 'Shipping')} links={customerLinks} onNavigate={closeOnNavigate} />
        {isStaff && <LinkList title={tx('Operations')} links={operationsLinks} onNavigate={closeOnNavigate} />}
        {canManageUsers && <LinkList title={tx('Administration')} links={[{ label: tx('User management'), to: '/admin/users', icon: Users }]} onNavigate={closeOnNavigate} />}
        {!user && <div className="mx-1 rounded-2xl border border-[#d4e8f6] bg-[#f1f8fd] p-4">
          <p className="text-sm font-bold text-slate-900">{tx('Keep every shipment together')}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{tx('Sign in to see your shipments, documents, and delivery updates.')}</p>
          <button type="button" onClick={() => { onClose(); onOpenAuth(); }} className="mt-3 w-full rounded-lg bg-[#005f9e] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#004c7e]">{tx('Sign in')}</button>
        </div>}
      </div>
      {user && <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f3fb] text-[#005f9e]"><CircleUserRound className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{user.name}</span><span className="block truncate text-xs capitalize text-slate-500">{role.toLowerCase().replaceAll('_', ' ')}</span></span>
      </div>}
    </aside>
  </>;
};
