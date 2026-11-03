import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AuthApi, errorMessage } from '../../api';
import { API_URL } from '../../config/env';
import { ui } from '../../utils/ui';
import { ShieldCheck, Key, Copy, Check, Database, RefreshCw, Sparkles } from 'lucide-react';

type Tab = 'DOCS' | 'SECURITY' | 'RBAC' | 'DATABASE';

const ENDPOINTS = [
  { method: 'GET', path: '/track/:trackingNumber?verify=<email|phone>', auth: 'Public, rate-limited', desc: 'Public lookup. Requires the exact tracking number or container ID. Full details unlock only when the verify value matches the recorded owner or recipient email or phone.' },
  { method: 'POST', path: '/quotes', auth: 'Public', desc: 'Server-side price quote from the configured tariff.' },
  { method: 'POST', path: '/shipments/book', auth: 'Public / Bearer', desc: 'Create a booking, allocate a non-sequential tracking number and (if Paystack is configured) return a checkout URL.' },
  { method: 'GET', path: '/shipments?limit=50&offset=0&q=&status=', auth: 'Staff (Bearer or X-API-Key)', desc: 'Paginated shipment list: { items, total, limit, offset, hasMore }; limit is 1–100.' },
  { method: 'GET', path: '/shipments/mine?limit=50&offset=0', auth: 'Bearer', desc: 'Paginated shipments linked to the signed-in owner, consignee, payer, or authorized viewer; sensitive fields follow each party permission.' },
  { method: 'PATCH', path: '/shipments/:id/status', auth: 'Staff', desc: 'Update status and append a milestone; notifies the customer.' },
  { method: 'PATCH', path: '/shipments/:id/location', auth: 'Staff', desc: 'Save an operations-adjusted map position as a location milestone; sends owner and recipient an email notification when SMTP is configured.' },
  { method: 'POST', path: '/shipments/:id/email/preview', auth: 'Staff', desc: 'Preview a shipment email for its owner, recipient, or both. Recipients are resolved from shipment records.' },
  { method: 'POST', path: '/shipments/:id/email/send', auth: 'Staff', desc: 'Send a previewed shipment email and store delivery results in the notifications log. Requires SMTP configuration.' },
  { method: 'POST', path: '/shipments/:id/telemetry', auth: 'Staff', desc: 'Record a telemetry reading (temperature, humidity, shock, position); GPS readings can create and close stop history.' },
  { method: 'GET', path: '/shipments/:id/stops', auth: 'Staff, owner, recipient', desc: 'List arrival/departure history and calculated dwell time for each stop.' },
  { method: 'POST', path: '/shipments/:id/stops', auth: 'Staff', desc: 'Record an operational stop with coordinates and arrival time.' },
  { method: 'PATCH', path: '/shipments/:id/stops/:stopId/depart', auth: 'Staff', desc: 'Close an open stop and persist departure time and dwell duration.' },
  { method: 'GET', path: '/shipments/:id/items', auth: 'Staff, owner, recipient, details-authorized party', desc: 'List separate packages/products, quantities, identifiers, customs fields and handling statuses.' },
  { method: 'PATCH', path: '/shipments/:id/items/:itemId/status', auth: 'Staff', desc: 'Record PACKED, PICKED_UP, IN_TRANSIT, HELD, DELIVERED, DAMAGED or MISSING for an individual package.' },
  { method: 'GET', path: '/shipments/:id/documents', auth: 'Staff or document-authorized party', desc: 'List stored documents. Customer accounts receive only active CUSTOMER-visible documents.' },
  { method: 'POST', path: '/shipments/:id/documents', auth: 'Staff', desc: 'Upload a validated PDF, PNG, or JPEG document with visibility, checksum and expiry metadata.' },
  { method: 'GET', path: '/shipments/:id/documents/:documentId/download', auth: 'Staff, owner, recipient', desc: 'Download an active document if its visibility permits customer access.' },
  { method: 'POST', path: '/shipments/claim', auth: 'Bearer', desc: 'Link a shipment to your account after matching its tracking number and recorded email or phone.' },
  { method: 'GET', path: '/shipments/:id/parties', auth: 'Staff, shipment owner', desc: 'View shipper, consignee, payer and authorized viewer permissions.' },
  { method: 'POST', path: '/shipments/:id/parties', auth: 'Staff, shipment owner', desc: 'Grant a viewer tracking access, with optional shipment-details and document permissions.' },
  { method: 'POST', path: '/integrations/telemetry/:trackingNumber', auth: 'Configured shared secret header', desc: 'Provider adapter. Requires X-Telemetry-Secret and JSON { eventId, recordedAt, latitude, longitude, temperatureCelsius?, humidityPercent?, batteryPercent?, speedKnots?, headingDegrees? }. Set GPS_PROVIDER_NAME and GPS_PROVIDER_WEBHOOK_SECRET. Provider-specific mapping and credentials are still required.' },
  { method: 'GET', path: '/analytics/summary', auth: 'Staff', desc: 'Monthly, trade-lane and daily metrics computed from MySQL.' },
  { method: 'POST', path: '/backups/trigger', auth: 'Admin', desc: 'Create a gzip SQL dump with a SHA-256 checksum.' },
];

const RBAC = [
  ['Track a shipment (with verification)', true, true, true, true],
  ['Book freight / pay with Paystack', true, true, true, true],
  ['View shipments owned by or addressed to your account', true, true, true, true],
  ['View all shipments, update status, map location, telemetry, email shipment contacts', false, true, true, true],
  ['Notifications, alert rules, analytics', false, true, true, true],
  ['Manage ports, users, backups, audit log, delete shipments', false, false, true, true],
] as const;

export const ApiSecurityDocs: React.FC = () => {
  const { isOcean } = useTheme();
  const { user, refreshUser } = useAuth();
  const u = ui(isOcean);
  const [tab, setTab] = useState<Tab>('DOCS');
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const generate = async () => {
    if (user?.apiKeyPrefix && !window.confirm('Generating a new key invalidates the current one. Continue?')) return;
    setBusy(true); setErr('');
    try {
      const r = await AuthApi.createApiKey();
      setNewKey(r.apiKey);
      await refreshUser();
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  const copy = () => { navigator.clipboard?.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const tabs: [Tab, string][] = [['DOCS', 'API Reference'], ['SECURITY', 'Security'], ['RBAC', 'Roles (RBAC)'], ['DATABASE', 'MySQL Schema']];

  return (
    <div className="space-y-6">
      <div className={`${u.card} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 mb-1 ${isOcean ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'}`}>
            <ShieldCheck className="w-3.5 h-3.5" /> JWT + API KEY + RBAC
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight">API, Security & Architecture</h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${u.muted}`}>Base URL: <code>{API_URL}</code></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${tab === k ? 'bg-[#005f9e] text-white border border-white/60' : u.btnGhost}`}>{label}</button>
          ))}
        </div>
      </div>

      {tab === 'DOCS' && (
        <div className="space-y-6">
          <div className={u.card}>
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Key className="w-4 h-4 text-cyan-300" /> Your API key</h4>
            <p className={`text-xs mb-3 ${u.muted}`}>Send as <code>X-API-Key</code> header. Staff-role keys can call staff endpoints. Only a hash is stored, so the full key is shown once.</p>
            <div className={`p-3 rounded-xl border font-mono text-xs mb-3 ${u.well}`}>
              {newKey ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="break-all font-bold">{newKey}</span>
                  <button onClick={copy} className="text-cyan-300 flex items-center gap-1 cursor-pointer">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied' : 'Copy'}</button>
                </div>
              ) : user?.apiKeyPrefix ? <span>{user.apiKeyPrefix}â€¦ (hidden)</span> : <span className="opacity-70">No key generated yet.</span>}
            </div>
            {err && <div className={`${u.error} mb-3`}>{err}</div>}
            <button onClick={generate} disabled={busy} className={`${u.btnBlue} flex items-center gap-2`}>
              <RefreshCw className="w-3.5 h-3.5" />{busy ? 'Workingâ€¦' : user?.apiKeyPrefix ? 'Rotate key' : 'Generate key'}
            </button>
          </div>

          {ENDPOINTS.map(ep => (
            <div key={ep.method + ep.path} className={`${u.card} !p-5 space-y-2`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs ${ep.method === 'GET' ? 'bg-cyan-400/20 text-cyan-200' : 'bg-emerald-500/20 text-emerald-300'}`}>{ep.method}</span>
                  <span className="font-mono font-bold text-sm break-all">{ep.path}</span>
                </div>
                <span className="text-xs font-mono opacity-70">Auth: {ep.auth}</span>
              </div>
              <p className={`text-xs ${u.muted}`}>{ep.desc}</p>
            </div>
          ))}
          <pre className={`p-3 rounded-xl border font-mono text-xs overflow-x-auto ${u.well}`}>{`curl -H "X-API-Key: <your key>" ${API_URL.startsWith('http') ? API_URL : '<backend-url>' + API_URL}/shipments`}</pre>
        </div>
      )}

      {tab === 'SECURITY' && (
        <div className={`${u.card} space-y-3 text-xs`}>
          <h3 className="font-bold text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-cyan-300" /> Controls implemented</h3>
          <ul className={`space-y-2 list-disc pl-5 ${u.muted}`}>
            <li><strong>Non-sequential tracking numbers</strong> generated from cryptographic randomness (<code>BCL-XXXX-XXXX-XXXX</code>).</li>
            <li><strong>Exact-match public tracking</strong> with per-IP rate limiting and a second verification detail (email or phone) required to see full details.</li>
            <li><strong>Passwords</strong> hashed with bcrypt; sessions use signed JWTs; API keys are stored as hashes.</li>
            <li><strong>Roles are enforced on the server</strong> for every protected route.</li>
            <li><strong>Paystack</strong> payments are verified server-side and via signed webhook; card data never touches this system.</li>
            <li><strong>Backups</strong> are SQL dumps with checksum verification and optional AES-256-GCM encryption (<code>BACKUP_ENCRYPTION_KEY</code>).</li>
            <li><strong>Transport security (HTTPS/TLS)</strong> must be provided by your hosting or reverse proxy.</li>
          </ul>
        </div>
      )}

      {tab === 'RBAC' && (
        <div className={`${u.card} overflow-x-auto`}>
          <table className="w-full text-left text-xs">
            <thead className={`border-b font-bold uppercase text-[11px] ${isOcean ? 'text-cyan-200 border-[#005f9e]' : 'text-slate-600 border-slate-200'}`}>
              <tr><th className="py-3 px-4">Permission</th>{['Customer', 'Dispatcher', 'Admin', 'Director'].map(r => <th key={r} className="py-3 px-4 text-center">{r}</th>)}</tr>
            </thead>
            <tbody className={`divide-y ${isOcean ? 'divide-[#006cae]/30' : 'divide-slate-200'}`}>
              {RBAC.map(row => (
                <tr key={row[0]}>
                  <td className="py-3 px-4 font-medium">{row[0]}</td>
                  {row.slice(1).map((v, i) => <td key={i} className="py-3 px-4 text-center">{v ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <span className="opacity-40">â€”</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className={`text-xs mt-4 ${u.muted}`}>The first account registered becomes ADMIN. Admins can change roles in the Users tab.</p>
        </div>
      )}

      {tab === 'DATABASE' && (
        <div className={`${u.card} space-y-4`}>
          <h3 className="font-bold text-base flex items-center gap-2"><Database className="w-5 h-5 text-cyan-300" /> MySQL schema (versioned migrations)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {[
              ['Identity', 'users, password_reset_tokens'],
              ['Operations', 'ports, shipments, shipment_items, shipment_stops, milestones, shipment_telemetry'],
              ['Payments', 'payments (Paystack references, status, raw channel)'],
              ['Messaging', 'notifications, alert_subscriptions, alert_rules'],
              ['Documents & recipients', 'shipment_documents, shipment recipient account links'],
              ['Governance', 'backups, tracking_queries, audit_logs'],
              ['Migrations', 'schema_migrations (applied versions)'],
            ].map(([h, body]) => (
              <div key={h} className={`p-4 rounded-xl border ${u.well}`}>
                <h4 className="font-bold mb-1">{h}</h4>
                <p className={`font-mono text-[11px] ${u.muted}`}>{body}</p>
              </div>
            ))}
          </div>
          <p className={`text-xs ${u.muted}`}>Run <code>npm run migrate</code> in the backend (or leave <code>AUTO_MIGRATE=true</code>) to create or update tables.</p>
        </div>
      )}
    </div>
  );
};
