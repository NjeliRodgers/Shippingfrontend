import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { AlertRulesApi, errorMessage } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { AlertRule } from '../../types/logistics';
import { ui } from '../../utils/ui';
import { Sliders, Trash2 } from 'lucide-react';

const METRICS: AlertRule['metric'][] = ['TEMPERATURE', 'DELAY_HOURS', 'SEAL_TAMPER', 'CUSTOMS_HOLD'];
const CHANNELS = ['EMAIL', 'SMS', 'WEBHOOK'] as const;

export const AlertRulesPanel: React.FC = () => {
  const { isOcean } = useTheme();
  const c = ui(isOcean);
  const { data, loading, error, reload } = useAsync<AlertRule[]>(() => AlertRulesApi.list(), []);
  const [f, setF] = useState({ name: '', metric: 'TEMPERATURE', threshold: '', channels: ['EMAIL'] as string[] });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggleChannel = (ch: string) =>
    setF(prev => ({ ...prev, channels: prev.channels.includes(ch) ? prev.channels.filter(x => x !== ch) : [...prev.channels, ch] }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await AlertRulesApi.create({ name: f.name, metric: f.metric, threshold: f.threshold, notifyChannels: f.channels });
      setF({ name: '', metric: 'TEMPERATURE', threshold: '', channels: ['EMAIL'] });
      reload();
    } catch (err) { setMsg({ ok: false, text: errorMessage(err) }); }
  };
  const toggle = async (r: AlertRule) => {
    try { await AlertRulesApi.update(r.id, { active: !r.active }); reload(); } catch (err) { setMsg({ ok: false, text: errorMessage(err) }); }
  };
  const remove = async (r: AlertRule) => {
    if (!window.confirm(`Delete rule "${r.name}"?`)) return;
    try { await AlertRulesApi.remove(r.id); reload(); } catch (err) { setMsg({ ok: false, text: errorMessage(err) }); }
  };

  const needsThreshold = f.metric === 'TEMPERATURE' || f.metric === 'DELAY_HOURS';

  return (
    <div className={c.card}>
      <h3 className="font-bold text-base flex items-center gap-2 mb-1"><Sliders className="w-5 h-5 text-cyan-300" /> Alert rules</h3>
      <p className={`text-xs mb-4 ${c.muted}`}>Rules run automatically when telemetry is recorded or a status changes, notifying the customer and subscribers.</p>

      <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end mb-4">
        <div className="sm:col-span-2"><label className={c.label}>Rule name</label><input required className={c.field} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Reefer too warm" /></div>
        <div><label className={c.label}>Metric</label>
          <select className={c.field} value={f.metric} onChange={e => setF({ ...f, metric: e.target.value })}>{METRICS.map(m => <option key={m}>{m}</option>)}</select></div>
        <div><label className={c.label}>{f.metric === 'TEMPERATURE' ? 'Max °C' : f.metric === 'DELAY_HOURS' ? 'Hours' : 'Threshold'}</label>
          <input disabled={!needsThreshold} required={needsThreshold} type="number" step="any" className={c.field} value={f.threshold} onChange={e => setF({ ...f, threshold: e.target.value })} /></div>
        <div className="flex items-center gap-3 text-xs">
          {CHANNELS.map(ch => <label key={ch} className="flex items-center gap-1"><input type="checkbox" checked={f.channels.includes(ch)} onChange={() => toggleChannel(ch)} />{ch}</label>)}
        </div>
        <button type="submit" className={c.btnPrimary + ' sm:col-span-2 lg:col-span-1'}>Add rule</button>
      </form>
      {msg && <div className={(msg.ok ? c.ok : c.error) + ' mb-3'}>{msg.text}</div>}
      {loading && <p className="text-xs">Loading…</p>}
      {error && <div className={c.error}>{error}</div>}
      {data && data.length === 0 && <p className={`text-xs ${c.muted}`}>No alert rules defined yet.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data || []).map(rule => (
          <div key={rule.id} className={`p-4 rounded-xl border ${c.well} ${rule.active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm">{rule.name}</h4>
                <span className="text-[11px] font-mono opacity-80">{rule.metric} · threshold {String(rule.threshold)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(rule)} className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${rule.active ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-slate-200'}`}>{rule.active ? 'ACTIVE' : 'MUTED'}</button>
                <button onClick={() => remove(rule)} className="text-rose-300 cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="mt-2 flex gap-1">{rule.notifyChannels.map(ch => <span key={ch} className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-cyan-700/50">{ch}</span>)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
