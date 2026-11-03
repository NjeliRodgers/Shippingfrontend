/** Safe number formatting for values that may be null (no telemetry yet). */
export const fmtNum = (v: number | null | undefined, digits = 1, suffix = ''): string =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${Number(v).toFixed(digits).replace(/\.0+$/, '')}${suffix}`;

export const fmtDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString() : '—';

export const fmtDateTime = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString() : '—';

export const fmtLat = (lat: number): string => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
export const fmtLng = (lng: number): string => `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;

export const fmtMoney = (n: number, currency = 'USD'): string => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
};

export const isStaffRole = (role?: string): boolean =>
  role === 'DISPATCHER' || role === 'ADMIN' || role === 'OPERATIONS_DIRECTOR';
