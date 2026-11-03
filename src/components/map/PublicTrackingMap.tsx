import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Check, Copy, MapPin, RefreshCw } from 'lucide-react';
import { PublicMapPayload } from '../../api/publicMap.api';
import { fmtDate } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';
import { TRACKING_STALE_AFTER_MS } from '../../config/tracking';

interface PublicTrackingMapProps {
  shipment: PublicMapPayload;
  onRefresh: () => void;
  refreshError?: string;
  lastCheckedAt?: Date | null;
  justUpdated?: boolean;
}

type Point = [number, number];

const markerIcon = (color: string) => L.divIcon({
  className: 'bcl-map-marker',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 1px 8px #0f172a88"></span>`,
});

function FitPublicRoute({ points }: { points: Point[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current) return;
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 10 });
    else if (points.length === 1) map.setView(points[0], 10);
    fitted.current = true;
  }, [map, points]);
  return null;
}

export const ShipmentMapView: React.FC<PublicTrackingMapProps> = ({ shipment, onRefresh, refreshError, lastCheckedAt, justUpdated }) => {
  const { tx, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const origin: Point = [shipment.origin.latitude, shipment.origin.longitude];
  const destination: Point = [shipment.destination.latitude, shipment.destination.longitude];
  const current: Point | null = shipment.current ? [shipment.current.latitude, shipment.current.longitude] : null;
  const trail = useMemo(() => shipment.trail
    .slice()
    .reverse()
    .map(entry => [entry.latitude, entry.longitude] as Point), [shipment.trail]);
  const routePoints = useMemo(() => [origin, ...trail, ...(current ? [current] : []), destination], [
    origin[0], origin[1], trail, current?.[0], current?.[1], destination[0], destination[1],
  ]);
  const positionUpdatedAt = shipment.current?.updatedAt ? new Date(shipment.current.updatedAt) : null;
  const positionIsStale = !positionUpdatedAt || !Number.isFinite(positionUpdatedAt.getTime())
    || Date.now() - positionUpdatedAt.getTime() > TRACKING_STALE_AFTER_MS;
  const ageMs = positionUpdatedAt && Number.isFinite(positionUpdatedAt.getTime())
    ? Math.max(0, Date.now() - positionUpdatedAt.getTime())
    : 0;
  const ageValue = ageMs < 60_000
    ? { value: Math.max(1, Math.floor(ageMs / 1000)), unit: 'second' as const }
    : ageMs < 3_600_000
      ? { value: Math.floor(ageMs / 60_000), unit: 'minute' as const }
      : ageMs < 86_400_000
        ? { value: Math.floor(ageMs / 3_600_000), unit: 'hour' as const }
        : { value: Math.floor(ageMs / 86_400_000), unit: 'day' as const };
  const relativeAge = positionUpdatedAt && Number.isFinite(positionUpdatedAt.getTime())
    ? new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(-ageValue.value, ageValue.unit)
    : '';
  const tileUrl = import.meta.env.VITE_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution = import.meta.env.VITE_PUBLIC_MAP_TILE_ATTRIBUTION
    || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{tx('Public shipment map')}</p>
        <h1 className="mt-1 break-all text-lg font-extrabold text-slate-900">{shipment.trackingNumber}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={copyLink} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" aria-label={tx('Copy public map link')}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? tx('Copied') : tx('Share map')}
        </button>
        <button type="button" onClick={onRefresh} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50" aria-label={tx('Refresh shipment map')} title={tx('Refresh map')}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </header>

    <div className="relative z-0 h-[58vh] min-h-[360px] w-full sm:h-[65vh] sm:min-h-[440px]">
      <MapContainer center={current || origin} zoom={6} scrollWheelZoom={false} className="h-full w-full" aria-label={tx('Public shipment map')}>
        <TileLayer attribution={tileAttribution} url={tileUrl} maxZoom={19} />
        <FitPublicRoute points={routePoints} />
        <Polyline positions={routePoints} pathOptions={{ color: '#005f9e', weight: 3, opacity: 0.75, dashArray: '8 7' }} />
        <Marker position={origin} icon={markerIcon('#059669')}><Popup><strong>{tx('Origin')}</strong><br />{shipment.origin.name}, {shipment.origin.country}</Popup></Marker>
        <Marker position={destination} icon={markerIcon('#d97706')}><Popup><strong>{tx('Destination')}</strong><br />{shipment.destination.name}, {shipment.destination.country}</Popup></Marker>
        {current && <Marker position={current} icon={markerIcon(shipment.isDelayed ? '#dc2626' : '#005f9e')}>
          <Popup><strong>{tx('Current position')}</strong><br />{shipment.current?.name || tx('Position reported')}<br />{shipment.current?.sourceLabel} · {fmtDate(shipment.current?.updatedAt)}</Popup>
        </Marker>}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 right-3 z-[400] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow-sm">
        <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />{tx('Origin')}
        <span className="mx-2 inline-block h-2.5 w-2.5 rounded-full bg-[#005f9e]" />{tx('Shipment')}
        <span className="mx-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />{tx('Destination')}
      </div>
      <div className="absolute left-3 top-3 z-[400] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm" role="status" aria-live="polite">
        {justUpdated
          ? tx('Map updated just now')
          : shipment.current
            ? positionIsStale ? `${tx('Location data may be out of date')} · ${relativeAge}` : `${tx('Location updated')} · ${relativeAge}`
            : tx('No location update yet')}
      </div>
      {lastCheckedAt && <div className="absolute left-3 top-14 z-[400] rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] text-slate-600 shadow-sm">
        {tx('Last checked')}: {fmtDate(lastCheckedAt.toISOString())}
      </div>}
    </div>

    <div className="grid gap-5 p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)] sm:p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">{tx(shipment.status.replace(/_/g, ' '))}</span>
          {shipment.isDelayed && <span className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">{tx('Delayed')}</span>}
          <span className="text-xs text-slate-500">{shipment.progressPercent}% {tx('Route progress')}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Route progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, shipment.progressPercent))}>
          <div className="h-full rounded-full bg-[#005f9e] transition-[width]" style={{ width: `${Math.min(100, Math.max(0, shipment.progressPercent))}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-sm">
          <div><p className="font-bold text-slate-900">{shipment.origin.name}</p><p className="text-xs text-slate-500">{shipment.origin.country}</p></div>
          <MapPin className="mt-1 h-4 w-4 text-[#005f9e]" />
          <div className="text-right"><p className="font-bold text-slate-900">{shipment.destination.name}</p><p className="text-xs text-slate-500">{shipment.destination.country}</p></div>
        </div>
      </div>
      <div className="border-t border-slate-200 pt-4 text-sm sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tx('Current position')}</p>
        {shipment.current ? <>
          <p className="mt-1 font-semibold text-slate-900">{shipment.current.name || tx('Position reported')}</p>
          <p className="mt-1 text-xs text-slate-600">{shipment.current.sourceLabel} · {fmtDate(shipment.current.updatedAt)}</p>
          <p className="mt-2 font-mono text-xs text-slate-500">{shipment.current.latitude.toFixed(6)}, {shipment.current.longitude.toFixed(6)}</p>
        </> : <p className="mt-1 text-sm text-slate-600">{tx('A current position has not been reported yet.')}</p>}
        <p className="mt-3 text-xs text-slate-500">{tx('Estimated delivery')}: {fmtDate(shipment.estimatedDeliveryDate)}</p>
        {refreshError && <p role="status" className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{tx('Refresh failed. Showing the last available map data.')}: {refreshError}</p>}
        {copyError && <p role="status" className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{tx('Unable to copy map link')}</p>}
      </div>
    </div>
  </section>;
};

export const PublicTrackingMap = ShipmentMapView;