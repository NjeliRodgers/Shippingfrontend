import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Port, Shipment, ShipmentLocation, TransportMode } from '../../types/logistics';
import { fmtDate, fmtNum } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { ShipmentsApi, TrackingApi, errorMessage } from '../../api';
import { TRACKING_REFRESH_MS, TRACKING_STALE_AFTER_MS } from '../../config/tracking';
import { ArrowRight, Compass, MapPin, RefreshCw, Save, X, LocateFixed, Route, Crosshair } from 'lucide-react';

interface InteractiveFleetMapProps {
  shipments: Shipment[];
  selectedShipmentId?: string;
  onSelectShipment?: (shipment: Shipment) => void;
  ports?: Port[];
  onRefresh?: () => void;
  onLocationSaved?: () => Promise<void> | void;
  verification?: string;
}

type LatLng = [number, number];
function isValidCoordinateInput(latitude: string, longitude: string): boolean {
  if (!latitude.trim() || !longitude.trim()) return false;
  const lat = Number(latitude); const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

const pointIcon = (color: string, size = 14) => L.divIcon({
  className: 'bcl-map-marker',
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  html: `<span style="display:block;width:${size}px;height:${size}px;border:2px solid white;border-radius:50%;background:${color};box-shadow:0 1px 6px #0f172a88"></span>`,
});
const shipmentIcon = (color: string) => L.divIcon({
  className: 'bcl-map-marker', iconSize: [42, 50], iconAnchor: [21, 48],
  html: `<svg width="42" height="50" viewBox="0 0 42 50" aria-hidden="true"><path d="M21 1C10 1 2 9 2 20c0 13 19 29 19 29s19-16 19-29C40 9 32 1 21 1Z" fill="${color}" stroke="white" stroke-width="3"/><circle cx="21" cy="19" r="11" fill="white"/><path d="m15 17 6-3 6 3v7l-6 3-6-3v-7Zm0 0 6 3 6-3m-6 3v7" fill="none" stroke="${color}" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
});

function FollowActive({ shipment, follow }: { shipment: Shipment | null; follow: boolean }) {
  const map = useMap();
  const lastId = React.useRef<string | null>(null);
  useEffect(() => {
    if (!shipment?.currentCoords) return;
    const [lat, lng] = shipment.currentCoords;
    if (lastId.current !== shipment.id) {
      map.setView([lat, lng], 11, { animate: true });
      lastId.current = shipment.id;
    } else if (follow) {
      map.panTo([lat, lng], { animate: true, duration: 0.5 });
    }
  }, [map, shipment?.id, shipment?.currentCoords?.[0], shipment?.currentCoords?.[1], follow]);
  return null;
}

function MapCenterPicker({ enabled, onChange }: { enabled: boolean; onChange: (center: LatLng) => void }) {
  useMapEvents({
    moveend(event) {
      if (!enabled) return;
      const center = event.target.getCenter();
      onChange([Number(center.lat.toFixed(6)), Number(center.lng.toFixed(6))]);
    },
  });
  return null;
}

function MapActionControls({ shipment, isStaff, onStartPicking }: { shipment: Shipment | null; isStaff: boolean; onStartPicking: () => void }) {
  const map = useMap();
  if (!shipment?.currentCoords) return null;
  const coordinates = shipment.currentCoords;
  const focusPin = () => map.setView(coordinates, Math.max(11, map.getZoom()), { animate: true });
  const fitRoute = () => map.fitBounds(L.latLngBounds([shipment.originCoords, shipment.destinationCoords]), { padding: [56, 56], maxZoom: 11, animate: true });
  const startPicking = () => {
    map.setView(coordinates, Math.max(15, map.getZoom()), { animate: true });
    onStartPicking();
  };
  return <div className="leaflet-top leaflet-right mt-2 mr-2 flex flex-col gap-2">
    <button type="button" onClick={focusPin} title="Zoom to the shipment’s current position" aria-label="Zoom to current shipment position" className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-md hover:bg-blue-50"><LocateFixed className="h-4 w-4 text-[#005f9e]" /><span className="hidden sm:inline">Current position</span></button>
    <button type="button" onClick={fitRoute} title="Show the complete route" aria-label="Show full shipment route" className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-md hover:bg-blue-50"><Route className="h-4 w-4 text-[#005f9e]" /><span className="hidden sm:inline">Full route</span></button>
    {isStaff && <button type="button" onClick={startPicking} title="Choose a new location using the center pin" aria-label="Choose new location using center pin" className="flex h-10 items-center gap-2 rounded-lg border border-[#005f9e] bg-[#005f9e] px-3 text-xs font-bold text-white shadow-md hover:bg-[#004c7e]"><Crosshair className="h-4 w-4" /><span className="hidden sm:inline">Adjust location</span></button>}
  </div>;
}
export const InteractiveFleetMap: React.FC<InteractiveFleetMapProps> = ({
  shipments, selectedShipmentId, onSelectShipment, ports = [], onRefresh, onLocationSaved, verification,
}) => {
  const { isStaff } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!onRefresh) return;
    const timer = window.setInterval(() => { void onRefresh(); }, TRACKING_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [onRefresh]);
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [modeFilter, setModeFilter] = useState<'ALL' | TransportMode>('ALL');
  const [draftCoords, setDraftCoords] = useState<LatLng | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [locationHistory, setLocationHistory] = useState<ShipmentLocation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [coordinateInputs, setCoordinateInputs] = useState({ latitude: '', longitude: '' });
  const [locationName, setLocationName] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const found = selectedShipmentId ? shipments.find(s => s.id === selectedShipmentId) : null;
    if (found) setActiveShipment(found);
    else if (activeShipment) {
      const refreshed = shipments.find(s => s.id === activeShipment.id);
      if (refreshed) setActiveShipment(refreshed);
      else if (!shipments.length) setActiveShipment(null);
    } else if (shipments.length) setActiveShipment(shipments[0]);
  }, [selectedShipmentId, shipments]);

  useEffect(() => {
    if (!activeShipment) { setLocationHistory([]); return; }
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError('');
    TrackingApi.locationHistory(activeShipment.trackingNumber, verification, 50)
      .then(rows => { if (!cancelled) setLocationHistory(rows); })
      .catch(err => { if (!cancelled) { setLocationHistory([]); setHistoryError(errorMessage(err)); } })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [activeShipment?.id, activeShipment?.currentLocationUpdatedAt, verification]);

  useEffect(() => {
    setDraftCoords(null);
    setIsPickingLocation(false);
    setLocationName('');
    setLocationNote('');
    setCoordinateInputs({ latitude: '', longitude: '' });
    setError('');
    setSuccess('');
  }, [activeShipment?.id]);

  const shownShipments = useMemo(() => shipments.filter(s => modeFilter === 'ALL' || s.transportMode === modeFilter), [shipments, modeFilter]);
  const current = activeShipment?.currentCoords ? (draftCoords || activeShipment.currentCoords) as LatLng : null;
  const locationAvailable = !!activeShipment?.currentCoords;
  const isStale = !!activeShipment?.currentLocationUpdatedAt && Date.now() - new Date(activeShipment.currentLocationUpdatedAt).getTime() > TRACKING_STALE_AFTER_MS;
  const changed = !!activeShipment?.currentCoords && !!draftCoords && (draftCoords[0] !== activeShipment.currentCoords[0] || draftCoords[1] !== activeShipment.currentCoords[1]);
  const choose = (shipment: Shipment) => {
    setActiveShipment(shipment);
  };
  const moved = (center: LatLng) => {
    setDraftCoords(center);
    setCoordinateInputs({ latitude: String(center[0]), longitude: String(center[1]) });
    setError('');
    setSuccess('');
  };
  const startPickingLocation = () => {
    if (!activeShipment?.currentCoords) return;
    setDraftCoords(activeShipment.currentCoords);
    setCoordinateInputs({ latitude: String(activeShipment.currentCoords[0]), longitude: String(activeShipment.currentCoords[1]) });
    setIsPickingLocation(true);
    setError('');
    setSuccess('');
  };
  const updateCoordinateInput = (field: 'latitude' | 'longitude', value: string) => {
    const next = { ...coordinateInputs, [field]: value };
    setCoordinateInputs(next);
    if (!isValidCoordinateInput(next.latitude, next.longitude)) return;
    const point: LatLng = [Number(next.latitude), Number(next.longitude)];
    setDraftCoords(point);
    mapRef.current?.setView(point, Math.max(11, mapRef.current.getZoom()), { animate: true });
  };

  const saveLocation = async () => {
    if (!activeShipment || !current || !changed) return;
    if (!isValidCoordinateInput(coordinateInputs.latitude, coordinateInputs.longitude)) { setError('Enter a valid latitude from -90 to 90 and longitude from -180 to 180.'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const mapCenter = mapRef.current?.getCenter();
      const selectedCenter: LatLng = mapCenter ? [Number(mapCenter.lat.toFixed(6)), Number(mapCenter.lng.toFixed(6))] : current;
      const result = await ShipmentsApi.updateLocation(activeShipment.id, {
        latitude: selectedCenter[0], longitude: selectedCenter[1], locationName: locationName.trim() || undefined, note: locationNote.trim() || undefined,
      });
      setActiveShipment(result.shipment);
      setDraftCoords(null);
      setIsPickingLocation(false);
      setLocationName('');
      setLocationNote('');
      setCoordinateInputs({ latitude: '', longitude: '' });
      const sent = result.emailStatuses.some(n => n.status === 'SENT');
      const queued = result.emailStatuses.some(n => n.status === 'QUEUED');
      setSuccess(`Location saved${sent ? ' and email notification sent' : queued ? ' (email notification queued; check SMTP settings)' : ''}.`);
      await onLocationSaved?.();
      setLocationHistory(await TrackingApi.locationHistory(result.shipment.trackingNumber, verification, 50));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-[#e8f3fb] p-2.5 text-[#005f9e]"><Compass className="h-5 w-5" /></span>
        <div><h2 className="text-base font-extrabold text-slate-900">Live shipment map</h2><p className="mt-0.5 text-xs text-slate-500">{shownShipments.length} shipment{shownShipments.length === 1 ? '' : 's'} · Zoom in for roads, towns, and nearby places</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="fleet-mode-filter">Filter shipments by transport mode</label>
        <select id="fleet-mode-filter" value={modeFilter} onChange={e => setModeFilter(e.target.value as 'ALL' | TransportMode)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-[#005f9e] focus:outline-none focus:ring-2 focus:ring-[#005f9e]/20">
          {(['ALL', 'OCEAN', 'AIR', 'ROAD', 'RAIL'] as const).map(mode => <option key={mode} value={mode}>{mode === 'ALL' ? 'All transport modes' : mode}</option>)}
        </select>
        {onRefresh && <button type="button" onClick={onRefresh} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Refresh</button>}
      </div>
    </div>

    <div className="relative z-0 h-[65vh] min-h-[440px] w-full sm:h-[70vh] sm:min-h-[520px]">
      {locationAvailable && activeShipment?.currentCoords ? <MapContainer ref={mapRef} center={activeShipment.currentCoords} zoom={11} scrollWheelZoom className="h-full w-full" aria-label="Interactive shipment map">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <FollowActive shipment={activeShipment} follow={!draftCoords} />
        <MapCenterPicker enabled={isStaff && isPickingLocation} onChange={moved} />
        <MapActionControls shipment={activeShipment} isStaff={isStaff} onStartPicking={startPickingLocation} />
        {ports.map(port => <Marker key={`port-${port.id}`} position={[port.latitude, port.longitude]} icon={pointIcon('#64748b', 10)}>
          <Popup><strong>{port.name}</strong><br />{port.country} · Port</Popup>
        </Marker>)}
        {shownShipments.map(shipment => {
          if (!shipment.currentCoords) return null;
          const isSelected = shipment.id === activeShipment?.id;
          const position: LatLng = isSelected && current ? current : shipment.currentCoords;
          return <React.Fragment key={shipment.id}>
            {shipment.currentCoords && <Polyline positions={[shipment.originCoords, shipment.destinationCoords]} pathOptions={{ color: '#94a3b8', weight: isSelected ? 3 : 1.5, opacity: isSelected ? 0.75 : 0.4, dashArray: '7 7' }} />}
            {shipment.currentCoords && <><Marker position={shipment.originCoords} icon={pointIcon('#059669')}><Popup>Origin: {shipment.originPort}</Popup></Marker>
            <Marker position={shipment.destinationCoords} icon={pointIcon('#d97706')}><Popup>Destination: {shipment.destinationPort}</Popup></Marker>
            <Marker position={position} icon={shipmentIcon(shipment.isDelayed ? '#dc2626' : isSelected ? '#005f9e' : '#0891b2')} eventHandlers={{ click: () => choose(shipment) }}>
              {isSelected && <Tooltip permanent direction="top" offset={[0, -43]} opacity={1}>{shipment.trackingNumber}</Tooltip>}
              <Popup><strong>{shipment.trackingNumber}</strong><br />{shipment.status.replace(/_/g, ' ')}<br />{shipment.cargoDescription}<br />{position[0].toFixed(5)}, {position[1].toFixed(5)}{isStaff && isSelected ? <><br /><span>Use Adjust location to move the map beneath the center pin</span></> : null}</Popup>
            </Marker></>}
          </React.Fragment>;
        })}
      </MapContainer> : <div className="flex h-full items-center justify-center bg-slate-50 p-6 text-center"><div className="max-w-md"><MapPin className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-2 font-bold text-slate-700">Location not available</p><p className="mt-1 text-sm text-slate-500">No authorized position is available for this shipment. Verify the shipment or wait for a GPS or operations update.</p></div></div>}
      {isStaff && isPickingLocation && <div className="pointer-events-none absolute left-1/2 top-1/2 z-[600] -translate-x-1/2 -translate-y-full" aria-label="Fixed map selection pin">
        <span className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white shadow-lg">New shipment location</span>
        <svg width="48" height="58" viewBox="0 0 48 58" role="img" aria-label="Fixed center location pin"><path d="M24 2C11.9 2 2 11.5 2 23.3 2 38 24 56 24 56s22-18 22-32.7C46 11.5 36.1 2 24 2Z" fill="#005f9e" stroke="white" strokeWidth="3"/><circle cx="24" cy="22" r="12" fill="white"/><path d="m18 20 6-3 6 3v7l-6 3-6-3v-7Zm0 0 6 3 6-3m-6 3v7" fill="none" stroke="#005f9e" strokeWidth="1.8" strokeLinejoin="round"/></svg>
      </div>}
      <div className="pointer-events-none absolute bottom-3 right-3 z-[400] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow-sm">
        <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />Origin
        <span className="mx-2 inline-block h-2.5 w-2.5 rounded-full bg-[#005f9e]" />Shipment pin
        <span className="mx-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />Destination
      </div>
    </div>

    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
      <div>
        <label htmlFor="map-shipment-select" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Selected shipment</label>
        <select id="map-shipment-select" value={activeShipment?.id || ''} onChange={e => { const shipment = shipments.find(s => s.id === e.target.value); if (shipment) choose(shipment); }} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-[#005f9e] focus:outline-none focus:ring-2 focus:ring-[#005f9e]/20" disabled={!shipments.length}>
          {!shipments.length && <option value="">No shipments available</option>}
          {shipments.map(s => <option key={s.id} value={s.id}>{s.trackingNumber} · {s.originCountry} → {s.destinationCountry}</option>)}
        </select>
        {activeShipment && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600"><span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-700">{activeShipment.status.replace(/_/g, ' ')}</span><span>{activeShipment.originPort}</span><ArrowRight className="h-3.5 w-3.5 text-[#005f9e]" /><span>{activeShipment.destinationPort}</span><span className="text-slate-400">·</span><span>ETA {fmtDate(activeShipment.estimatedDeliveryDate)}</span></div>}
      </div>
      {activeShipment && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-slate-900">Reported position</p><p className="mt-1 font-mono text-xs text-slate-600">{current?.[0].toFixed(5)}, {current?.[1].toFixed(5)}</p></div><MapPin className="h-5 w-5 text-[#005f9e]" /></div>
        <p className="mt-2 text-xs text-slate-500">{activeShipment.currentLocationUpdatedAt ? `Last update ${fmtDate(activeShipment.currentLocationUpdatedAt)} · Source: ${activeShipment.currentLocationSource}` : 'No location update is recorded.'}{onRefresh ? ` · Refreshes every ${Math.round(TRACKING_REFRESH_MS / 1000)} seconds` : ''}</p>
        {isStale && <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">This location has not been updated in over 24 hours.</p>}
        {isStaff && <>
          <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">{isPickingLocation ? 'Drag the map until the desired location sits underneath the fixed center pin, then save. The owner sees the saved position but cannot change it.' : 'Select Adjust location to place a fixed pin at the map center. Drag the map to position the pin over the correct location.'} Saving adds a location event and emails shipment contacts; it does not create a sensor/GPS reading.</p>
          {isPickingLocation && <div className="mt-3 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Place or stop name <span className="font-normal text-slate-500">(optional)</span><input value={locationName} onChange={e => setLocationName(e.target.value)} maxLength={255} placeholder="e.g. Mombasa Port, Kenya" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-[#005f9e] focus:outline-none focus:ring-2 focus:ring-[#005f9e]/20" /></label>
            <label className="block text-xs font-semibold text-slate-700">Note for owner <span className="font-normal text-slate-500">(optional)</span><textarea value={locationNote} onChange={e => setLocationNote(e.target.value)} maxLength={1000} rows={2} placeholder="Add a short explanation for the location update" className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#005f9e] focus:outline-none focus:ring-2 focus:ring-[#005f9e]/20" /></label>
            <div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-700">Latitude<input aria-label="Selected latitude" type="number" min="-90" max="90" step="any" value={coordinateInputs.latitude} onChange={e => updateCoordinateInput('latitude', e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm" /></label><label className="text-xs font-semibold text-slate-700">Longitude<input aria-label="Selected longitude" type="number" min="-180" max="180" step="any" value={coordinateInputs.longitude} onChange={e => updateCoordinateInput('longitude', e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm" /></label></div>
            <div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => { setIsPickingLocation(false); setDraftCoords(null); setLocationName(''); setLocationNote(''); setCoordinateInputs({ latitude: '', longitude: '' }); if (activeShipment?.currentCoords) mapRef.current?.setView(activeShipment.currentCoords, Math.max(11, mapRef.current.getZoom()), { animate: true }); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"><X className="h-4 w-4" />Discard</button><button type="button" disabled={saving || !changed || !isValidCoordinateInput(coordinateInputs.latitude, coordinateInputs.longitude)} onClick={saveLocation} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#005f9e] px-4 text-sm font-bold text-white hover:bg-[#004c7e] disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save selected location'}</button></div>
          </div>}
          {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
          {success && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{success}</p>}
        </>}
        {!isStaff && <p className="mt-3 text-xs text-slate-500">This map is view-only for shipment owners. The pin follows the latest saved operations location or connected GPS position. Current route progress: {fmtNum(activeShipment.progressPercent, 0)}%.</p>}
        <section className="mt-4 border-t border-slate-200 pt-3" aria-label="Shipment location history"><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Recent location history</h3>{historyLoading ? <p className="mt-2 text-xs text-slate-500">Loading location history…</p> : historyError ? <p className="mt-2 text-xs text-amber-700">Location history is unavailable. {historyError}</p> : locationHistory.length ? <ol className="mt-2 max-h-48 space-y-2 overflow-y-auto">{locationHistory.slice(0, 8).map(entry => <li key={entry.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><div className="flex flex-wrap justify-between gap-2"><strong className="text-slate-800">{entry.locationName || `${entry.latitude.toFixed(5)}, ${entry.longitude.toFixed(5)}`}</strong><time className="text-slate-500">{fmtDate(entry.recordedAt)}</time></div><div className="mt-1 flex flex-wrap gap-x-3 text-slate-500"><span>Source: {entry.source}</span><span>{entry.latitude.toFixed(5)}, {entry.longitude.toFixed(5)}</span>{entry.recordedByName && <span>By {entry.recordedByName}</span>}</div></li>)}</ol> : <p className="mt-2 text-xs text-slate-500">No location history has been recorded yet.</p>}</section>
        {onSelectShipment && <button type="button" onClick={() => onSelectShipment(activeShipment)} className="mt-3 min-h-10 w-full rounded-lg border border-[#005f9e] bg-white px-3 text-sm font-bold text-[#005f9e] hover:bg-blue-50">Open shipment details</button>}
      </div>}
    </div>
  </div>;
};
