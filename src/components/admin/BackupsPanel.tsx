import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { BackupsApi, downloadFile, errorMessage } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { BackupRecord } from '../../types/logistics';
import { ui } from '../../utils/ui';
import { Database, Server } from 'lucide-react';

export const BackupsPanel: React.FC = () => {
  const { isOcean } = useTheme();
  const c = ui(isOcean);
  const { data, loading, error, reload } = useAsync<BackupRecord[]>(() => BackupsApi.list(), []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const trigger = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const b = await BackupsApi.trigger();
      setMsg({ ok: true, text: `Backup created: ${b.filename} (${b.sizeMb} MB)` });
      reload();
    } catch (err) { setMsg({ ok: false, text: errorMessage(err) }); } finally { setBusy(false); }
  };
  const verify = async (b: BackupRecord) => {
    try {
      const r = await BackupsApi.verify(b.id);
      setMsg({ ok: r.ok, text: r.ok ? `${b.filename}: checksum verified` : `${b.filename}: ${r.reason}` });
    } catch (err) { setMsg({ ok: false, text: errorMessage(err) }); }
    reload();
  };

  return (
    <div className={c.card}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b mb-4 gap-3 ${c.divider}`}>
        <div>
          <h3 className="font-bold text-base flex items-center gap-2"><Server className="w-5 h-5 text-cyan-300" /> MySQL backups</h3>
          <p className={`text-xs ${c.muted}`}>Full SQL dumps (gzip) of the live database, stored on the server with a SHA-256 checksum.</p>
        </div>
        <button onClick={trigger} disabled={busy} className={c.btnPrimary + ' flex items-center gap-1.5'}><Database className="w-4 h-4" />{busy ? 'Creating…' : 'Create backup now'}</button>
      </div>
      {msg && <div className={(msg.ok ? c.ok : c.error) + ' mb-3'}>{msg.text}</div>}
      {loading && <p className="text-xs">Loading…</p>}
      {error && <div className={c.error}>{error}</div>}
      {data && data.length === 0 && <p className={`text-xs ${c.muted}`}>No backups yet.</p>}
      <div className="space-y-3">
        {(data || []).map(b => (
          <div key={b.id} className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${c.well}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-cyan-300 break-all">{b.filename}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">{b.status}</span>
                {b.encrypted && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-200">AES-256</span>}
              </div>
              <div className="text-[11px] mt-1 opacity-80">{new Date(b.timestamp).toUTCString()} · {b.sizeMb} MB · {b.type}</div>
              <div className="text-[10px] font-mono opacity-60 break-all">{b.checksum}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => verify(b)} className={c.btnGhost}>Verify checksum</button>
              <button onClick={() => downloadFile(`/backups/${b.id}/download`, b.filename).catch(err => setMsg({ ok: false, text: errorMessage(err) }))} className={c.btnGhost}>Download</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
