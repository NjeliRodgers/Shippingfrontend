import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { UsersApi, errorMessage } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { User, UserRole } from '../../types/logistics';
import { ui } from '../../utils/ui';
import { fmtDateTime } from '../../utils/format';

const ROLES: UserRole[] = ['CUSTOMER', 'DISPATCHER', 'ADMIN', 'OPERATIONS_DIRECTOR'];

export const UsersManager: React.FC = () => {
  const { isOcean } = useTheme();
  const { user: me } = useAuth();
  const c = ui(isOcean);
  const { data, loading, error, reload } = useAsync<User[]>(() => UsersApi.list(), []);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'DISPATCHER' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await UsersApi.create(f);
      setF({ name: '', email: '', password: '', role: 'DISPATCHER' });
      setMsg({ ok: true, text: 'Account created' });
      reload();
    } catch (err) { setMsg({ ok: false, text: errorMessage(err) }); }
  };
  const patch = async (u: User, data: { role?: string; isActive?: boolean }) => {
    setMsg(null);
    try { await UsersApi.update(u.id, data); reload(); } catch (err) { setMsg({ ok: false, text: errorMessage(err) }); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className={c.card}>
        <h3 className="font-bold text-base mb-1">Create staff or customer account</h3>
        <p className={`text-xs mb-4 ${c.muted}`}>Public sign-ups are always customers. Grant staff roles here.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div><label className={c.label}>Name</label><input required className={c.field} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div><label className={c.label}>Email</label><input required type="email" className={c.field} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          <div><label className={c.label}>Temporary password</label><input required minLength={8} type="password" className={c.field} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
          <div><label className={c.label}>Role</label>
            <select className={c.field} value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
        </div>
        {msg && <div className={(msg.ok ? c.ok : c.error) + ' mt-3'}>{msg.text}</div>}
        <button type="submit" className={c.btnPrimary + ' mt-4'}>Create account</button>
      </form>

      <div className={c.card}>
        <h3 className="font-bold text-base mb-3">Accounts {data ? `(${data.length})` : ''}</h3>
        {loading && <p className="text-xs">Loading…</p>}
        {error && <div className={c.error}>{error}</div>}
        {data && (
          <div className="overflow-x-auto rounded-lg" role="region" aria-label="Management table; scroll horizontally on small screens" tabIndex={0}>
            <table className="w-full min-w-[620px] text-xs text-left">
              <thead><tr className={`border-b ${c.divider}`}><th className="py-2 pr-3">Name</th><th className="pr-3">Email</th><th className="pr-3">Role</th><th className="pr-3">Last login</th><th>Active</th></tr></thead>
              <tbody>
                {data.map(u => (
                  <tr key={u.id} className={`border-b ${c.divider}`}>
                    <td className="py-2 pr-3 font-semibold">{u.name}</td>
                    <td className="pr-3">{u.email}</td>
                    <td className="pr-3">
                      <select disabled={u.id === me?.id} className={c.field + ' !py-1'} value={u.role} onChange={e => patch(u, { role: e.target.value })}>
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="pr-3">{fmtDateTime(u.lastLoginAt)}</td>
                    <td><input type="checkbox" disabled={u.id === me?.id} checked={u.isActive} onChange={e => patch(u, { isActive: e.target.checked })} /></td>
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
