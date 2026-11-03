import React, { useCallback, useEffect, useState } from 'react';
import { Shipment, ShipmentParty } from '../../types/logistics';
import { ShipmentPartiesApi, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props { shipment: Shipment; }

export const ShipmentPartiesPanel: React.FC<Props> = ({ shipment }) => {
  const { user, isStaff } = useAuth();
  const { isOcean } = useTheme();
  const { tx } = useLanguage();
  const isOwner = !!user && shipment.parties.some(p => p.role === 'SHIPPER' && p.userId === user.id);
  const canManage = isStaff || isOwner;
  const [parties, setParties] = useState<ShipmentParty[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [canViewDetails, setCanViewDetails] = useState(false);
  const [canViewDocuments, setCanViewDocuments] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!canManage) return;
    try { setParties(await ShipmentPartiesApi.list(shipment.id)); }
    catch (err) { setError(tx(errorMessage(err))); }
  }, [canManage, shipment.id]);

  useEffect(() => { void load(); }, [load]);

  if (!canManage) return null;

  const addViewer = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await ShipmentPartiesApi.addViewer(shipment.id, { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, canViewDetails, canViewDocuments });
      setName(''); setEmail(''); setPhone(''); setCanViewDetails(false); setCanViewDocuments(false);
      await load();
    } catch (err) { setError(tx(errorMessage(err))); }
    finally { setBusy(false); }
  };

  const removeViewer = async (party: ShipmentParty) => {
    if (!window.confirm(`${tx('Remove tracking access for')} ${party.email}?`)) return;
    setError('');
    try { await ShipmentPartiesApi.removeViewer(shipment.id, party.id); await load(); }
    catch (err) { setError(tx(errorMessage(err))); }
  };

  const panel = isOcean ? 'bg-[#00385c] border-[#005f9e] text-white' : 'bg-slate-50 border-slate-200 text-slate-900';
  const known = parties.filter(p => p.role !== 'AUTHORIZED_VIEWER');
  const viewers = parties.filter(p => p.role === 'AUTHORIZED_VIEWER');

  return (
    <section className={`p-5 rounded-2xl border space-y-4 ${panel}`}>
      <div>
        <h3 className="font-bold">{tx('Shipment parties & access')}</h3>
        <p className="text-xs opacity-70 mt-1">{tx('Shipper, consignee, payer, and invited tracking viewers have separate roles and permissions.')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {known.map(p => <div key={p.id} className="rounded-xl border border-slate-400/30 p-3"><strong>{tx(p.role.replace(/_/g, ' '))}</strong><div>{p.name}</div><div>{p.email || tx('No email')}</div><div>{p.canViewDocuments ? tx('Documents allowed') : tx('Tracking only')}</div></div>)}
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">{tx('Authorized viewers')}</h4>
        {viewers.length === 0 ? <p className="text-xs opacity-70">{tx('No additional viewers have access.')}</p> : viewers.map(p => <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-400/30 p-2 text-xs"><span>{p.name} · {p.email} · {p.canViewDocuments ? tx('tracking and documents') : tx('Tracking only')}</span><button type="button" onClick={() => void removeViewer(p)} className="text-rose-500 font-bold">{tx('Remove')}</button></div>)}
      </div>
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <form onSubmit={addViewer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <input required value={name} onChange={e => setName(e.target.value)} placeholder={tx('Viewer name')} className="rounded-lg border px-3 py-2 text-sm text-slate-900" />
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={tx('Viewer account email')} className="rounded-lg border px-3 py-2 text-sm text-slate-900" />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={tx('Phone (optional)')} className="rounded-lg border px-3 py-2 text-sm text-slate-900" />
        <button disabled={busy} className="rounded-lg bg-[#f05a36] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? tx('Saving…') : tx('Grant tracking access')}</button>
        <label className="sm:col-span-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={canViewDetails} onChange={e => setCanViewDetails(e.target.checked)} /> {tx('Allow shipment details and item manifest')}</label>
        <label className="sm:col-span-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={canViewDocuments} onChange={e => setCanViewDocuments(e.target.checked)} /> {tx('Allow this viewer to download customer-visible shipment documents')}</label>
      </form>
    </section>
  );
};
