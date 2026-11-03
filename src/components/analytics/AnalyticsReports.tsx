import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { AnalyticsApi, errorMessage } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { ui } from '../../utils/ui';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Download, Mail, CheckCircle2, TrendingUp, Users, Send, Sparkles, RefreshCw } from 'lucide-react';

const LANE_COLORS = ['#00c3f7', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#f05a36', '#14b8a6', '#ec4899'];

export const AnalyticsReports: React.FC = () => {
  const { isOcean } = useTheme();
  const { language, t, tx } = useLanguage();
  const locale = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', zh: 'zh-CN', ar: 'ar' }[language];
  const { user } = useAuth();
  const u = ui(isOcean);

  const [months, setMonths] = useState(6);
  const { data, loading, error, reload } = useAsync(() => AnalyticsApi.summary(months), [months]);
  const monthly = data?.monthly || [];
  const lanes = data?.tradeLanes || [];
  const daily = data?.daily || [];
  const totals = data?.totals;

  const [recipient, setRecipient] = useState(user?.email || '');
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState('');
  const [sendErr, setSendErr] = useState('');

  const axis = isOcean ? '#cbeefd' : '#64748b';
  const grid = isOcean ? '#006cae40' : '#f1f5f9';
  const tip = {
    backgroundColor: isOcean ? '#00385c' : '#ffffff', borderColor: isOcean ? '#0073be' : '#e2e8f0',
    borderRadius: '0.75rem', color: isOcean ? '#ffffff' : '#0f172a', fontSize: '12px',
  };

  const exportCsv = () => {
    const headers = ['Month', 'Total Shipments', 'Delivered', 'On-Time %', 'Revenue (USD)', 'Avg Transit Days', 'New Users', 'Tracking Queries'].map(tx);
    const rows = monthly.map(m => [m.month, m.totalShipments, m.deliveredShipments, m.onTimePercent ?? '', m.revenueUsd, m.avgTransitDays ?? '', m.newUsers, m.trackingQueries]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `shipping_report_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const sendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setSentMsg(''); setSendErr('');
    try {
      const r = await AnalyticsApi.emailReport(recipient.trim());
      setSentMsg(`${tx('Report')} ${tx(r.status)} ${tx('for')} ${recipient.trim()}.${r.status === 'QUEUED' ? ` (${tx('SMTP not configured; logged in Notifications.')})` : ''}`);
    } catch (err) { setSendErr(errorMessage(err)); }
    finally { setSending(false); }
  };

  const empty = !loading && !error && (totals?.shipments || 0) === 0 && (totals?.trackingQueries || 0) === 0;

  return (
    <div className="space-y-6">
      <div className={`${u.card} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 mb-1 ${isOcean ? 'bg-cyan-400/20 text-cyan-200 border-cyan-400/30' : 'bg-cyan-500/10 text-[#005f9e] border-cyan-500/20'}`}>
            <Sparkles className="w-3.5 h-3.5" /> {tx('LIVE FROM MYSQL')}
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight">{tx('Supply Chain Intelligence & Reporting')}</h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${u.muted}`}>{tx('Operational metrics computed from your shipments, payments and tracking activity.')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={months} onChange={e => setMonths(Number(e.target.value))} className={`${u.field} !w-auto`}>
            <option value={3}>{tx('Last 3 months')}</option><option value={6}>{tx('Last 6 months')}</option><option value={12}>{tx('Last 12 months')}</option>
          </select>
          <button onClick={reload} className={u.btnGhost} title={tx('Refresh')}><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={exportCsv} disabled={!monthly.length} className={`${u.btnGhost} flex items-center gap-2`}>
            <Download className="w-4 h-4 text-cyan-300" /><span>{t.exportCsv}</span>
          </button>
        </div>
      </div>

      {error && <div className={u.error}>{error}</div>}
      {sentMsg && <div className={`${u.ok} flex items-center gap-2`}><CheckCircle2 className="w-4 h-4" />{sentMsg}</div>}

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {([
            ['Shipments', totals.shipments], ['Active', totals.active], ['Delivered', totals.delivered],
            ['Users', totals.users], ['Revenue (USD)', Math.round(totals.revenueUsd).toLocaleString(locale)], ['Tracking queries', totals.trackingQueries],
          ] as [string, string | number][]).map(([k, v]) => (
            <div key={k} className={`${u.card} !p-4`}>
              <div className={`text-[11px] ${u.muted}`}>{tx(k)}</div>
              <div className="text-xl font-extrabold font-mono">{v}</div>
            </div>
          ))}
        </div>
      )}

      {empty && <div className={`${u.card} text-sm text-center ${u.muted}`}>{tx('No data yet. Charts fill in as shipments are booked and tracked.')}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${u.card}`}>
          <h3 className="font-bold text-base flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-cyan-300" /> {tx('Monthly shipments & on-time rate')}</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="month" stroke={axis} fontSize={11} />
                <YAxis stroke={axis} fontSize={11} />
                <Tooltip contentStyle={tip} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="totalShipments" name={tx('Shipments')} fill="#00c3f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="onTimePercent" name={tx('On-time (%)')} fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={u.card}>
          <h3 className="font-bold text-sm mb-3">{tx('Trade lane share')}</h3>
          {lanes.length === 0 ? <p className={`text-xs ${u.muted}`}>{tx('No lanes yet.')}</p> : (
            <>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={lanes} dataKey="volumePercent" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={42} paddingAngle={3}>
                      {lanes.map((_, i) => <Cell key={i} fill={LANE_COLORS[i % LANE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v}%`, tx('Share')]} contentStyle={tip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {lanes.map((l, i) => (
                  <div key={l.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: LANE_COLORS[i % LANE_COLORS.length] }} />
                      <span className="truncate">{l.name}</span>
                    </div>
                    <span className="font-mono font-bold">{l.volumePercent}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={u.card}>
        <h3 className="font-bold text-base flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-cyan-300" /> {tx('Activity, last 7 days')}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="day" stroke={axis} fontSize={11} />
              <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tip} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="trackingQueries" name={tx('Tracking queries')} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
              <Area type="monotone" dataKey="newShipments" name={tx('New shipments')} stroke="#00c3f7" fill="#00c3f7" fillOpacity={0.25} />
              <Area type="monotone" dataKey="newUsers" name={tx('New users')} stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={u.card}>
        <h3 className="font-bold text-base flex items-center gap-2 mb-1"><Mail className="w-5 h-5 text-cyan-300" /> {tx('Email this report')}</h3>
        <p className={`text-xs mb-4 ${u.muted}`}>{tx('Sends a summary of the current figures through the configured SMTP server (logged in Notifications).')}</p>
        <form onSubmit={sendReport} className="flex flex-col sm:flex-row items-center gap-3">
          <input type="email" required value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="recipient@company.com" className={u.field} />
          <button type="submit" disabled={sending} className={`${u.btnPrimary} flex items-center gap-2 whitespace-nowrap`}>
            <Send className="w-4 h-4" />{sending ? tx('Sending…') : t.sendEmailReport}
          </button>
        </form>
        {sendErr && <div className={`${u.error} mt-3`}>{sendErr}</div>}
      </div>
    </div>
  );
};
