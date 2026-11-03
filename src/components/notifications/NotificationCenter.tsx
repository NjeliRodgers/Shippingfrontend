import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { NotificationsApi, errorMessage } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { ui } from '../../utils/ui';
import { Bell, Mail, MessageSquare, Globe, Send, CheckCircle2, Clock, Sparkles, RefreshCw } from 'lucide-react';

type Channel = 'EMAIL' | 'SMS' | 'WEBHOOK';

const statusClass = (s: string) =>
  s === 'SENT' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
  : s === 'FAILED' ? 'bg-rose-500/15 text-rose-300 border-rose-400/30'
  : 'bg-amber-500/15 text-amber-300 border-amber-400/30';

export const NotificationCenter: React.FC = () => {
  const { isOcean } = useTheme();
  const { language, tx } = useLanguage();
  const locale = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', zh: 'zh-CN', ar: 'ar' }[language];
  const u = ui(isOcean);
  const { data, loading, error, reload } = useAsync(() => NotificationsApi.list(), []);
  const notifications = data || [];

  const [channelFilter, setChannelFilter] = useState<'ALL' | Channel>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [recipient, setRecipient] = useState('');
  const [channel, setChannel] = useState<Channel>('EMAIL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const term = searchTerm.trim().toLowerCase();
  const filtered = notifications.filter(n =>
    (channelFilter === 'ALL' || n.channel === channelFilter) &&
    (!term || (n.trackingNumber || '').toLowerCase().includes(term) || n.recipient.toLowerCase().includes(term) || n.message.toLowerCase().includes(term))
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(''); setOk('');
    try {
      const r = await NotificationsApi.dispatch({
        trackingNumber: trackingNumber.trim() || undefined,
        recipient: recipient.trim(), channel, subject: subject.trim() || undefined, message: message.trim(),
      });
      setOk(`${tx(channel)} ${tx('notification')} ${tx(r.status)} ${tx('for')} ${recipient.trim()}.`);
      setMessage(''); setSubject('');
      reload();
    } catch (e2) { setErr(errorMessage(e2)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className={`${u.card} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 mb-1 ${isOcean ? 'bg-cyan-400/20 text-cyan-200 border-cyan-400/30' : 'bg-cyan-500/10 text-[#005f9e] border-cyan-500/20'}`}>
            <Sparkles className="w-3.5 h-3.5" /> {tx('NOTIFICATION LOG')}
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight">{tx('Stakeholder Notifications')}</h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${u.muted}`}>
            {tx('Email (SMTP), webhook and SMS messages recorded in the database. SMS stays QUEUED until an SMS provider is integrated.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'EMAIL', 'SMS', 'WEBHOOK'] as const).map(ch => (
            <button key={ch} onClick={() => setChannelFilter(ch)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${channelFilter === ch ? 'bg-[#005f9e] text-white border border-white/60' : u.btnGhost}`}>{tx(ch)}</button>
          ))}
          <button onClick={reload} className={u.btnGhost} title={tx('Refresh')}><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {ok && <div className={`${u.ok} flex items-center gap-2`}><CheckCircle2 className="w-4 h-4" />{ok}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${u.card} space-y-4`}>
          <h3 className="font-bold text-base flex items-center gap-2"><Send className="w-5 h-5 text-cyan-300" /> {tx('Send notification')}</h3>
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className={u.label}>{tx('Tracking number (optional)')}</label>
              <input className={`${u.field} font-mono`} value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="BCL-XXXX-XXXX-XXXX" />
            </div>
            <div>
              <label className={u.label}>{tx('Channel')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['EMAIL', 'SMS', 'WEBHOOK'] as const).map(c => (
                  <button key={c} type="button" onClick={() => setChannel(c)}
                    className={`py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${channel === c ? 'bg-[#005f9e] text-white border-white/60' : u.btnGhost}`}>{tx(c)}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={u.label}>{tx(channel === 'EMAIL' ? 'Recipient email' : channel === 'SMS' ? 'Recipient phone' : 'Webhook URL')}</label>
              <input required className={u.field} value={recipient} onChange={e => setRecipient(e.target.value)}
                placeholder={channel === 'EMAIL' ? 'name@company.com' : channel === 'SMS' ? '+254…' : 'https://…'} />
            </div>
            {channel === 'EMAIL' && (
              <div>
                <label className={u.label}>{tx('Subject')}</label>
                <input className={u.field} value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
            )}
            <div>
              <label className={u.label}>{tx('Message')}</label>
              <textarea required rows={3} className={u.field} value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            {err && <div className={u.error}>{err}</div>}
            <button type="submit" disabled={busy} className={`${u.btnPrimary} w-full flex items-center justify-center gap-2`}>
              <Bell className="w-4 h-4" /> {busy ? tx('Sending…') : tx('Send')}
            </button>
          </form>
        </div>

        <div className={`lg:col-span-2 ${u.card} space-y-4`}>
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${u.divider}`}>
            <h3 className="font-bold text-base flex items-center gap-2"><Clock className="w-5 h-5 text-cyan-300" /> {tx('Delivery log')}</h3>
            <div className="flex items-center gap-3">
              <input className={`${u.field} !w-48`} placeholder={tx('Search…')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <span className="text-xs font-mono font-bold">{filtered.length} {tx('events')}</span>
            </div>
          </div>
          {error && <div className={u.error}>{error}</div>}
          {loading && !data && <p className={`text-xs ${u.muted}`}>{tx('Loading…')}</p>}
          {!loading && !error && filtered.length === 0 && (
            <p className={`text-sm py-8 text-center ${u.muted}`}>{tx('No notifications yet. They appear here when shipments change status, payments settle, or you send one.')}</p>
          )}
          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
            {filtered.map(n => (
              <div key={n.id} className={`p-3.5 rounded-xl border ${u.well}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`p-1.5 rounded-lg ${isOcean ? 'bg-white/10 text-cyan-200' : 'bg-[#005f9e]/10 text-[#005f9e]'}`}>
                      {n.channel === 'EMAIL' ? <Mail className="w-3.5 h-3.5" /> : n.channel === 'SMS' ? <MessageSquare className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                    </span>
                    <div className="min-w-0 text-xs">
                      <span className="font-mono font-bold">{n.trackingNumber || '—'}</span>
                      <span className="ml-2 font-mono opacity-70 break-all">{tx('to:')} {n.recipient}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusClass(n.status)}`}>{tx(n.status)}</span>
                </div>
                {n.subject && <p className="text-xs font-semibold mt-2">{n.subject}</p>}
                <p className={`text-xs mt-1 ${u.muted}`}>{tx(n.message)}</p>
                {n.error && <p className="text-[11px] mt-1 text-rose-300">{tx('Error:')} {tx(n.error)}</p>}
                <div className="text-[10px] mt-2 font-mono opacity-60">{new Date(n.timestamp).toLocaleString(locale)} · {tx(n.channel)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
