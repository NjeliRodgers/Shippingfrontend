import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { PortsApi, errorMessage } from '../../api';
import { Port, TransportMode } from '../../types/logistics';
import { ui } from '../../utils/ui';
import { Trash2 } from 'lucide-react';

interface Props { ports: Port[]; onChanged: () => void }

export const PortsManager: React.FC<Props> = ({ ports, onChanged }) => {
  const { isOcean } = useTheme();
  const { role } = useAuth();
  const { t } = useLanguage();
  const c = ui(isOcean);
  const canDelete = role === 'ADMIN' || role === 'OPERATIONS_DIRECTOR';
  const [f, setF] = useState({
    name: '',
    country: '',
    type: 'SEA',
    latitude: '',
    longitude: '',
    supportedModes: ['OCEAN'] as TransportMode[],
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await PortsApi.create({
        name: f.name,
        country: f.country,
        type: f.type as Port['type'],
        latitude: Number(f.latitude),
        longitude: Number(f.longitude),
        transportModes: f.supportedModes,
      });
      setF({ name: '', country: '', type: 'SEA', latitude: '', longitude: '', supportedModes: ['OCEAN'] });
      setMsg({ ok: true, text: 'Port added' });
      onChanged();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };
  const remove = async (p: Port) => {
    if (!window.confirm(`Delete ${p.name}? Existing shipments keep their route snapshot.`)) return;
    try { await PortsApi.remove(p.id); onChanged(); } catch (err) { setMsg({ ok: false, text: errorMessage(err) }); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={add} className={c.card}>
        <h3 className="font-bold text-base mb-1">Add port / terminal</h3>
        <p className={`text-xs mb-4 ${c.muted}`}>Ports feed the booking form and the fleet map. Coordinates are decimal degrees.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div><label className={c.label}>Name</label><input required className={c.field} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Port of …" /></div>
          <div><label className={c.label}>Country</label><input required className={c.field} value={f.country} onChange={e => setF({ ...f, country: e.target.value })} /></div>
          <div><label className={c.label}>Type</label>
            <select className={c.field} value={f.type} onChange={e => {
              const type = e.target.value as Port['type'];
              const supportedModes: TransportMode[] = type === 'SEA' ? ['OCEAN'] : type === 'AIR' ? ['AIR'] : ['ROAD', 'RAIL'];
              setF(previous => ({ ...previous, type, supportedModes }));
            }}><option>SEA</option><option>AIR</option><option>INLAND</option></select></div>
          <div><label className={c.label}>Latitude</label><input required type="number" step="any" min={-90} max={90} className={c.field} value={f.latitude} onChange={e => setF({ ...f, latitude: e.target.value })} /></div>
          <div><label className={c.label}>Longitude</label><input required type="number" step="any" min={-180} max={180} className={c.field} value={f.longitude} onChange={e => setF({ ...f, longitude: e.target.value })} /></div>
        </div>
        <fieldset className="mt-4">
          <legend className={c.label}>{t.supportedTransportModes}</legend>
          <div className="flex flex-wrap gap-4">
            {(['OCEAN', 'AIR', 'ROAD', 'RAIL'] as TransportMode[]).map(mode =>
              <label key={mode} className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={f.supportedModes.includes(mode)}
                  onChange={e => setF(previous => ({
                    ...previous,
                    supportedModes: e.target.checked
                      ? [...previous.supportedModes, mode]
                      : previous.supportedModes.filter(selected => selected !== mode),
                  }))}
                />
                {mode}
              </label>
            )}
          </div>
        </fieldset>
        {msg && <div className={(msg.ok ? c.ok : c.error) + ' mt-3'}>{msg.text}</div>}
        <button type="submit" disabled={!f.supportedModes.length} className={c.btnPrimary + ' mt-4 disabled:opacity-50'}>Add port</button>
      </form>

      <div className={c.card}>
        <h3 className="font-bold text-base mb-3">Configured ports ({ports.length})</h3>
        {ports.length === 0 ? (
          <p className={`text-xs ${c.muted}`}>No ports yet. Add ports above, or run <code>npm run ports:import</code> in ShippingBackend to load a reference list.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg" role="region" aria-label="Management table; scroll horizontally on small screens" tabIndex={0}>
            <table className="w-full min-w-[620px] text-xs text-left">
              <thead><tr className={`border-b ${c.divider}`}><th className="py-2 pr-3">Name</th><th className="pr-3">Country</th><th className="pr-3">Type</th><th className="pr-3">{t.supportedTransportModes}</th><th className="pr-3">Lat / Lng</th><th /></tr></thead>
              <tbody>
                {ports.map(p => (
                  <tr key={p.id} className={`border-b ${c.divider}`}>
                    <td className="py-2 pr-3 font-semibold">{p.name}</td><td className="pr-3">{p.country}</td><td className="pr-3">{p.type}</td>
                    <td className="pr-3">{p.transportModes.join(', ')}</td>
                    <td className="pr-3 font-mono">{p.latitude.toFixed(3)}, {p.longitude.toFixed(3)}</td>
                    <td className="text-right">{canDelete && <button onClick={() => remove(p)} className="p-1.5 text-rose-300 hover:text-rose-200 cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
