import React, { useMemo, useState } from 'react';
import { Mail, Send, Eye, LoaderCircle, X } from 'lucide-react';
import { ShipmentsApi, errorMessage } from '../../api';
import { Shipment } from '../../types/logistics';

type RecipientMode = 'OWNER' | 'RECIPIENT' | 'BOTH';
type Preview = Awaited<ReturnType<typeof ShipmentsApi.previewEmail>>;

export const ShipmentEmailModal: React.FC<{ shipment: Shipment; onClose: () => void; onSent: (text: string) => void }> = ({ shipment, onClose, onSent }) => {
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('OWNER');
  const [subject, setSubject] = useState(`BlueCrest Cargo Lines: update for ${shipment.trackingNumber}`);
  const [message, setMessage] = useState(`Hello ${shipment.customerName},\n\nHere is an update about your shipment ${shipment.trackingNumber} (${shipment.containerId}).\n\nCurrent status: ${shipment.status.replace(/_/g, ' ')}\nRoute: ${shipment.originPort} → ${shipment.destinationPort}\n\nYou can view the latest tracking details in your BlueCrest account.\n\nRegards,\nBlueCrest Cargo Lines`);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<'PREVIEW' | 'SEND' | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const canChooseRecipient = !!shipment.recipientEmail;
  const invalidate = () => { setPreview(null); setResult(''); };
  const selectedAddress = useMemo(() => recipientMode === 'OWNER' ? shipment.customerEmail : recipientMode === 'RECIPIENT' ? (shipment.recipientEmail || shipment.customerEmail) : [shipment.customerEmail, shipment.recipientEmail || shipment.customerEmail].filter((v, i, a) => a.indexOf(v) === i).join(', '), [recipientMode, shipment]);
  const payload = { recipientMode, subject, message };

  const makePreview = async () => {
    setBusy('PREVIEW'); setError(''); setResult('');
    try { setPreview(await ShipmentsApi.previewEmail(shipment.id, payload)); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  };
  const send = async () => {
    if (!preview || !preview.emailConfigured) return;
    setBusy('SEND'); setError('');
    try {
      const sent = await ShipmentsApi.sendEmail(shipment.id, { ...payload, previewToken: preview.previewToken });
      const delivered = sent.notifications.filter(n => n.status === 'SENT').length;
      const failed = sent.notifications.filter(n => n.status === 'FAILED').length;
      const queued = sent.notifications.filter(n => n.status === 'QUEUED').length;
      const text = delivered ? `Email sent to ${delivered} contact${delivered === 1 ? '' : 's'}.` : failed ? `Email failed for ${failed} contact${failed === 1 ? '' : 's'}. Check Notifications for delivery details.` : `Email queued for ${queued} contact${queued === 1 ? '' : 's'}.`;
      setResult(text); onSent(text);
      if (delivered === sent.notifications.length) onClose();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="shipment-email-title" className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-[#e8f3fb] p-2.5 text-[#005f9e]"><Mail className="h-5 w-5" /></span><div><h2 id="shipment-email-title" className="text-lg font-extrabold text-slate-900">Email shipment contact</h2><p className="mt-1 text-xs text-slate-500">Tracking {shipment.trackingNumber} · Preview the message before sending.</p></div></div>
        <button type="button" onClick={onClose} disabled={!!busy} aria-label="Close email composer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
        <label className="block text-sm font-bold text-slate-700">Send to
          <select value={recipientMode} onChange={e => { setRecipientMode(e.target.value as RecipientMode); invalidate(); }} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium focus:border-[#005f9e] focus:outline-none focus:ring-2 focus:ring-[#005f9e]/20">
            <option value="OWNER">Product owner · {shipment.customerName}</option>
            {canChooseRecipient && <option value="RECIPIENT">Product recipient · {shipment.recipientName || shipment.recipientEmail}</option>}
            {canChooseRecipient && shipment.recipientEmail?.toLowerCase() !== shipment.customerEmail.toLowerCase() && <option value="BOTH">Owner and recipient</option>}
          </select>
        </label>
        <p className="-mt-2 text-xs text-slate-500">Recipient email: {selectedAddress}</p>
        <label className="block text-sm font-bold text-slate-700">Subject
          <input value={subject} maxLength={255} onChange={e => { setSubject(e.target.value); invalidate(); }} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium focus:border-[#005f9e] focus:outline-none focus:ring-2 focus:ring-[#005f9e]/20" />
        </label>
        <label className="block text-sm font-bold text-slate-700">Message
          <textarea value={message} maxLength={10000} rows={8} onChange={e => { setMessage(e.target.value); invalidate(); }} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-6 focus:border-[#005f9e] focus:outline-none focus:ring-2 focus:ring-[#005f9e]/20" />
          <span className="mt-1 block text-right text-xs font-normal text-slate-400">{message.length}/10,000 characters</span>
        </label>
        {preview && <section className="overflow-hidden rounded-xl border border-blue-200" aria-live="polite">
          <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm font-extrabold text-blue-950"><Eye className="h-4 w-4" />Email preview</div>
          <div className="space-y-2 bg-white p-4 text-sm"><p><strong>To:</strong> {preview.recipients.map(r => `${r.name} <${r.email}>`).join('; ')}</p><p><strong>Subject:</strong> {preview.subject}</p><div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 leading-6 text-slate-700">{preview.message}</div><p className="text-xs text-slate-500">The email includes the company header and a secure shipment tracking link.</p></div>
          {!preview.emailConfigured && <p role="alert" className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium leading-5 text-amber-900">SMTP email delivery is not configured. Set the backend SMTP settings and restart the API before sending.</p>}
        </section>}
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</p>}
        {result && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">{result}</p>}
      </div>
      <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" onClick={onClose} disabled={!!busy} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
        <button type="button" onClick={makePreview} disabled={!!busy || !subject.trim() || !message.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#005f9e] bg-white px-4 text-sm font-bold text-[#005f9e] hover:bg-blue-50 disabled:opacity-50">{busy === 'PREVIEW' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}{busy === 'PREVIEW' ? 'Preparing preview…' : 'Preview email'}</button>
        <button type="button" onClick={send} disabled={!!busy || !preview || !preview.emailConfigured} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#005f9e] px-5 text-sm font-bold text-white hover:bg-[#004c7e] disabled:cursor-not-allowed disabled:opacity-50">{busy === 'SEND' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{busy === 'SEND' ? 'Sending…' : 'Send email'}</button>
      </footer>
    </section>
  </div>;
};
