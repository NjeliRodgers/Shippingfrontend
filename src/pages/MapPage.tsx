import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useShipments } from '../hooks/useShipments';
import { usePorts } from '../hooks/usePorts';
const InteractiveFleetMap = React.lazy(() => import('../components/map/InteractiveFleetMap').then(module => ({ default: module.InteractiveFleetMap })));
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { Shipment } from '../types/logistics';
import { ShipmentPageControls } from '../components/layout/ShipmentPageControls';
import { TrackingApi } from '../api';
import { ShipmentMapView } from '../components/map/PublicTrackingMap';
import { useLanguage } from '../context/LanguageContext';
import { usePublicShipmentMap } from '../hooks/usePublicShipmentMap';

export const MapPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const nav = useNavigate();
  const { ref } = useParams();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { tx } = useLanguage();
  const { shipments, reload, page, setOffset } = useShipments();
  const { ports } = usePorts();
  const routeState = location.state as { shipment?: Shipment; verify?: string } | null;
  const [verifiedFocus, setVerifiedFocus] = useState<Shipment | undefined>();
  const focus = verifiedFocus || routeState?.shipment;
  const verification = routeState?.verify;
  const publicMap = usePublicShipmentMap(ref && !focus ? ref : null);
  const refreshVerified = useCallback(async () => {
    if (!focus || !verification || isAuthenticated) return;
    try {
      const result = await TrackingApi.track(focus.trackingNumber, verification);
      if (result.access === 'FULL') setVerifiedFocus(result.shipment);
    } catch { /* Keep the last verified map while this refresh is temporarily unavailable. */ }
  }, [focus?.trackingNumber, verification, isAuthenticated]);

  // A publicly tracked shipment is shown even when signed out; signed-in users see their own/all shipments.
  const list = useMemo(() => {
    const base = isAuthenticated ? shipments : [];
    return focus && !base.some(s => s.id === focus.id) ? [focus, ...base] : base;
  }, [shipments, focus, isAuthenticated]);

  if (ref && !focus) {
    if (publicMap.data?.trackingNumber.toUpperCase() === ref.toUpperCase()) return <ShipmentMapView shipment={publicMap.data} onRefresh={() => { void publicMap.refreshNow(); }} refreshError={publicMap.status === 'retrying' ? tx('Updates paused, retrying') : publicMap.error} lastCheckedAt={publicMap.lastCheckedAt} justUpdated={publicMap.justUpdated} />;
    if (publicMap.status === 'loading' || publicMap.status === 'retrying') return <div role="status" className="flex min-h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600">{publicMap.status === 'retrying' ? tx('Updates paused, retrying') : tx('Loading public shipment map…')}</div>;
    if (publicMap.status === 'error') return <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <AlertCircle className="h-6 w-6 text-amber-600" />
      <h2 className="mt-3 text-lg font-bold text-slate-900">{tx('Map unavailable')}</h2>
      <p role="alert" className="mt-1 text-sm text-slate-600">{publicMap.error}</p>
      <button type="button" onClick={() => { void publicMap.refreshNow(); }} className="mt-4 min-h-10 rounded-lg bg-[#005f9e] px-4 text-sm font-semibold text-white">{tx('Retry')}</button>
      <button type="button" onClick={() => nav('/map')} className="mt-4 min-h-10 rounded-lg bg-[#005f9e] px-4 text-sm font-semibold text-white">{tx('Enter another Product ID')}</button>
    </div>;
  }

  if (!isAuthenticated && !focus && !ref) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">{tx('Enter your Product ID')}</h2>
        <p className="mt-2 text-sm text-slate-600">{tx('Use the tracking number from your booking email or shipment documents.')}</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const input = form.querySelector('input') as HTMLInputElement | null;
            const raw = input?.value?.trim();
            if (!raw) return;
            nav(`/map/${encodeURIComponent(raw.toUpperCase().replace(/\s+/g, ''))}`);
          }}
        >
          <label className="block text-sm font-medium text-slate-700">
            {tx('Product ID')}
            <input
              type="text"
              placeholder="BCL-XXXX-XXXX-XXXX"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none ring-0 transition focus:border-[#005f9e]"
            />
          </label>
          <button type="submit" className="w-full rounded-xl bg-[#005f9e] px-4 py-3 text-sm font-semibold text-white">{tx('Open map')}</button>
        </form>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {isAuthenticated && <ShipmentPageControls page={page} onChange={setOffset} />}
      <Suspense fallback={<div role="status" className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-600">{tx('Loading interactive map…')}</div>}>
      <InteractiveFleetMap
      shipments={list}
      ports={ports}
      selectedShipmentId={focus?.id}
      onRefresh={isAuthenticated ? reload : verification ? refreshVerified : undefined}
      onLocationSaved={reload}
      verification={verification}
      onSelectShipment={(s) => nav(`/track/${encodeURIComponent(s.trackingNumber)}`)}
      />
      </Suspense>
    </div>
  );
};
