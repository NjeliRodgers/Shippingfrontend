import React, { useEffect, useState } from 'react';
import { Shipment } from '../../types/logistics';
import { ShipmentStopHistory } from './ShipmentStopHistory';
import { ShipmentDocumentsPanel } from '../documents/ShipmentDocumentsPanel';
import { ShipmentMapView } from '../map/PublicTrackingMap';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { ApiError, TrackingApi, errorMessage } from '../../api';
import { fmtDate, fmtLat, fmtLng, fmtNum } from '../../utils/format';
import { usePublicShipmentMap } from '../../hooks/usePublicShipmentMap';
import { 
  Search, ShieldCheck, Clock, 
  MapPin, CheckCircle2, Circle, Thermometer,
  Anchor, Download, Bell, Copy, Check,
  Sparkles, Lock, Key, 
  Shield, EyeOff, UserCheck, ShieldAlert
} from 'lucide-react';

interface ShipmentTrackerProps {
  /** Tracking number from the URL (/track/:ref) or a previous action; looked up on mount */
  initialQuery?: string;
  onNavigateToMap?: (shipment: Shipment, verification?: string) => void;
  onNavigateToCustomerPortal?: () => void;
}

export const ShipmentTracker: React.FC<ShipmentTrackerProps> = ({
  initialQuery,
  onNavigateToMap,
  onNavigateToCustomerPortal,
}) => {
  const { isOcean } = useTheme();
  const { isAuthenticated } = useAuth();
  const { t, tx } = useLanguage();

  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [secondDetail, setSecondDetail] = useState('');
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState('');
  const [access, setAccess] = useState<'PUBLIC' | 'LIMITED' | 'FULL'>('PUBLIC');
  const [documentsAllowed, setDocumentsAllowed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [trackerNotice, setTrackerNotice] = useState<string | null>(null);
  const [showStoredDocuments, setShowStoredDocuments] = useState(false);
  const publicMap = usePublicShipmentMap(activeShipment?.trackingNumber);

  const showNotice = (msg: string) => {
    setTrackerNotice(msg);
    setTimeout(() => setTrackerNotice(null), 6000);
  };

  // Server-side rate limiting (HTTP 429) cool-down
  const [rateLimitLocked, setRateLimitLocked] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  useEffect(() => {
    if (!rateLimitLocked) return;
    if (cooldownSeconds <= 0) {
      setRateLimitLocked(false);
      return;
    }
    const timer = setTimeout(() => setCooldownSeconds(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [rateLimitLocked, cooldownSeconds]);

  // Full details are unlocked only when the API says so (staff, owner, or matching recipient detail)
  const isFullDetailUnlocked = access === 'FULL';
  const isSecondDetailVerified = isFullDetailUnlocked && !!secondDetail.trim();

  const lookup = async (query: string, verify?: string) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await TrackingApi.track(query, verify && verify.trim() ? verify : undefined);
      setActiveShipment(res.shipment);
      setAccess(res.access);
      setDocumentsAllowed(res.documentsAllowed);
      setLastUpdatedAt(new Date());
      setRefreshError('');
      if (verify && verify.trim()) {
        showNotice(
          res.verified
            ? 'Shipment details confirmed for this lookup.'
            : res.access === 'LIMITED' ? 'Your account can track this shipment; some details are restricted.' : 'Those details did not match the booking. Only basic tracking is shown.'
        );
      }
    } catch (err) {
      setActiveShipment(null);
      setAccess('PUBLIC');
      setDocumentsAllowed(false);
      if (err instanceof ApiError && err.status === 429) {
        setRateLimitLocked(true);
        setCooldownSeconds(60);
      } else if (err instanceof ApiError && err.status === 404) {
        showNotice(`No consignment found matching "${query}". Please verify the tracking number.`);
      } else {
        showNotice(errorMessage(err));
      }
    } finally {
      setSearching(false);
    }
  };

  // Look up the tracking number supplied via the URL / navigation
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      lookup(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Refresh the active shipment every 30 seconds while it is displayed.
  useEffect(() => {
    if (!activeShipment) return;

    let cancelled = false;

    const refreshShipment = async () => {
      try {
        const verify =
          access === 'FULL' && secondDetail.trim()
            ? secondDetail.trim()
            : undefined;

        const result = await TrackingApi.track(activeShipment.trackingNumber, verify);

        if (cancelled) return;

        setActiveShipment(result.shipment);
        setAccess(result.access);
        setDocumentsAllowed(result.documentsAllowed);
        setLastUpdatedAt(new Date());
        setRefreshError('');
      } catch (err) {
        if (!cancelled) setRefreshError(errorMessage(err));
      }
    };

    const timer = window.setInterval(() => {
      void refreshShipment();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeShipment?.trackingNumber, access, secondDetail]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    lookup(searchQuery, secondDetail);
  };

  const handleCopyTracking = () => {
    if (activeShipment) {
      navigator.clipboard.writeText(activeShipment.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubscribeAlerts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribedEmail || !activeShipment) return;
    setSubscribeError('');
    try {
      await TrackingApi.subscribe(activeShipment.trackingNumber, subscribedEmail);
      setSubscribeSuccess(true);
      setTimeout(() => {
        setSubscribeSuccess(false);
        setShowNotificationModal(false);
        setSubscribedEmail('');
      }, 2500);
    } catch (err) {
      setSubscribeError(errorMessage(err));
    }
  };

  const handleDownloadWaybill = () => {
    if (!activeShipment || !documentsAllowed || !isAuthenticated) {
      showNotice('Sign in to an authorized shipment account to access stored shipping documents.');
      return;
    }
    setShowStoredDocuments(value => !value);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all shadow-xl ${
        isOcean 
          ? 'bg-gradient-to-br from-[#004f83] via-[#004270] to-[#00375b] border-[#006cae]/60 text-white' 
          : 'bg-gradient-to-br from-white via-cyan-50/40 to-slate-50 border-slate-200 text-slate-900'
      }`}>
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
            isOcean ? 'bg-white/15 text-cyan-200 border border-white/20' : 'bg-cyan-500/10 text-[#005f9e] border border-cyan-500/20'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{tx('BlueCrest Cargo Lines · Shipment tracking')}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {tx('Track your shipment by Product ID')}
          </h2>

          <p className={`text-sm sm:text-base ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
            {tx('Enter your tracking number to see the latest status, reported location, and estimated delivery. Sign in to view shipment details and shared documents.')}
          </p>

          {/* Rate Limiting Shield Alert Indicator */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold ${
              isOcean 
                ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30' 
                : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{tx('Shipment details are protected')}</span>
            </span>

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold ${
              isOcean 
                ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/30' 
                : 'bg-[#005f9e]/10 text-[#005f9e] border border-[#005f9e]/20'
            }`}>
              <Key className="w-3.5 h-3.5" />
              <span>{tx('Tracking refreshes automatically')}</span>
            </span>
          </div>

          {/* Rate limit warning message if locked */}
          {rateLimitLocked && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 animate-bounce">
              <ShieldAlert className="w-4 h-4 text-amber-300" />
              <span>Anti-bot protection active. Please wait {cooldownSeconds} seconds before your next query.</span>
            </div>
          )}

          {/* Tracker notice or search feedback */}
          {trackerNotice && (
            <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0" />
              <span>{trackerNotice}</span>
            </div>
          )}

          {/* Search Form with 2-Detail Option */}
          <form onSubmit={handleSearch} className="pt-2 space-y-3">
            <div className={`relative flex flex-col sm:flex-row items-center p-1.5 rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-cyan-400 shadow-lg ${
              isOcean ? 'bg-[#003152] border-[#006cae]' : 'bg-white border-slate-300'
            }`}>
              <div className="flex items-center w-full px-2">
                <Search className={`w-5 h-5 ml-1 shrink-0 ${isOcean ? 'text-cyan-200' : 'text-slate-400'}`} />
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={tx('Product ID or container ID')}
                  placeholder={tx('Product ID or container ID')}
                  className={`w-full px-3 py-2.5 text-xs sm:text-sm bg-transparent focus:outline-none font-mono font-medium ${
                    isOcean ? 'text-white placeholder:text-cyan-200/50' : 'text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={rateLimitLocked || searching}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shrink-0 shadow-md transition-all cursor-pointer ${
                  rateLimitLocked
                    ? 'bg-slate-600 cursor-not-allowed opacity-60'
                    : 'bg-[#f05a36] hover:bg-[#d94a28]'
                }`}
              >
                {rateLimitLocked ? `Wait ${cooldownSeconds}s` : searching ? 'Searching…' : t.trackButton}
              </button>
            </div>

            {/* Optional 2nd Verification Detail Input for Extra Protection */}
            <div className={`p-3 rounded-xl border text-left text-xs ${
              isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className={`font-bold flex items-center gap-1.5 ${isOcean ? 'text-cyan-200' : 'text-[#005f9e]'}`}>
                    <Shield className="w-3.5 h-3.5" />
                    <span>{tx('Verify your shipment details (optional)')}</span>
                  </span>
                  <p className={`text-[11px] ${isOcean ? 'text-cyan-100/90' : 'text-slate-500'}`}>
                    Enter the recipient email or phone saved with the booking to confirm your access.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={secondDetail}
                    onChange={(e) => setSecondDetail(e.target.value)}
                    aria-label="Recipient email or phone for verification"
                    placeholder={tx('Recipient email or phone')}
                    className={`px-3 py-1.5 rounded-lg border text-xs w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isOcean ? 'bg-[#002b47] border-[#006cae] text-white placeholder:text-cyan-200/50' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    className="px-3.5 py-1.5 rounded-lg bg-[#005f9e] hover:bg-[#004e82] text-white font-bold text-xs whitespace-nowrap cursor-pointer shadow-sm"
                  >
                    Verify
                  </button>
                </div>
              </div>

              {isSecondDetailVerified && (
                <div className="mt-2 text-[11px] text-emerald-300 font-bold flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2nd Detail Match Verified! Full consignee manifest unlocked for this session.</span>
                </div>
              )}
            </div>
          </form>

        </div>
      </div>

      {/* Shipment Details View */}
      {activeShipment ? (
        <div className="space-y-6">
          {/* Header Card with Tracking #, Status, and Privacy Tier Badge */}
          <div className={`p-6 rounded-2xl border shadow-lg transition-all ${
            isOcean 
              ? 'bg-[#004b7a] border-[#006cae]/60 text-white' 
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isOcean ? 'text-cyan-200' : 'text-[#005f9e]'
                  }`}>
                    {activeShipment.carrierName} • {activeShipment.transportMode} FREIGHT
                  </span>

                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                    activeShipment.status === 'DELIVERED'
                      ? isOcean 
                        ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30'
                        : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                      : activeShipment.isDelayed
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        : isOcean
                          ? 'bg-cyan-400/20 text-cyan-200 border-cyan-400/30'
                          : 'bg-[#005f9e]/10 text-[#005f9e] border-[#005f9e]/20'
                  }`}>
                    {activeShipment.status.replace(/_/g, ' ')}
                  </span>

                  {/* Public Privacy Mode Indicator Badge */}
                  {isFullDetailUnlocked ? (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>{tx('Authenticated / 2-Detail Verified')}</span>
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full flex items-center gap-1 ${
                      isOcean 
                        ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                        : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                    }`}>
                      <Lock className="w-3 h-3" />
                      <span>{tx('Unlock more details')}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                    isOcean ? 'text-white' : 'text-[#005f9e]'
                  }`}>
                    {activeShipment.trackingNumber}
                  </h3>
                  <button
                    onClick={handleCopyTracking}
                    title={tx('Copy tracking number')}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isOcean ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <p className={`text-xs mt-1 ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
                  Container ID: <strong className="font-mono text-cyan-200">{activeShipment.containerId}</strong> • Vessel: {activeShipment.vesselOrFlightName || 'to be assigned'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowNotificationModal(true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isOcean 
                      ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white hover:bg-[#004d7c]' 
                      : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  <Bell className="w-4 h-4 text-cyan-300" />
                  <span>{tx('Automated Alerts')}</span>
                </button>

                <button
                  onClick={handleDownloadWaybill}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    documentsAllowed && isAuthenticated
                      ? isOcean 
                        ? 'bg-[#00385c] border-[#005f9e] text-white hover:bg-[#004d7c]' 
                        : 'bg-white border-slate-300 text-slate-800'
                      : isOcean
                        ? 'bg-[#003050] border-[#004b7a] text-cyan-300/40 cursor-not-allowed'
                        : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title={documentsAllowed && isAuthenticated ? 'View authorized stored documents' : 'Sign in to an account with document access'}
                >
                  {documentsAllowed && isAuthenticated ? <Download className="w-4 h-4 text-cyan-300" /> : <Lock className="w-4 h-4" />}
                  <span>{documentsAllowed && isAuthenticated ? 'View stored documents' : 'Documents (authorized sign-in required)'}</span>
                </button>

                {onNavigateToMap && (
                  <button
                    onClick={() => onNavigateToMap(activeShipment, secondDetail.trim() || undefined)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#005f9e] hover:bg-[#004e82] text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Anchor className="w-4 h-4" />
                    <span>{tx('Open full-screen map')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Public Status, Last Known Location & ETA (Criteria: Basic status, last location, ETA only) */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t ${
              isOcean ? 'border-[#006cae]/40' : 'border-slate-200'
            }`}>
              {/* Origin Port */}
              <div className={`p-4 rounded-xl border ${
                isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${
                  isOcean ? 'text-cyan-200' : 'text-slate-500'
                }`}>
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Port of Loading (Origin)
                </div>
                <div className={`font-bold text-sm ${isOcean ? 'text-white' : 'text-slate-900'}`}>{activeShipment.originPort}</div>
                <div className={`text-xs mt-0.5 ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>{activeShipment.originCountry}</div>
                <div className={`text-[11px] mt-2 font-mono ${isOcean ? 'text-cyan-200/80' : 'text-slate-500'}`}>
                  Departed: {fmtDate(activeShipment.departureDate)}
                </div>
              </div>

              {/* Last Known Location */}
              <div className={`p-4 rounded-xl border flex flex-col justify-center items-center text-center ${
                isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${
                  isOcean ? 'text-cyan-200' : 'text-slate-500'
                }`}>
                  Last Known Location & Status
                </div>
                <div className="w-full bg-black/20 rounded-full h-2.5 mb-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-[#00c3f7] h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${activeShipment.progressPercent}%` }}
                  />
                </div>
                <div className={`text-xs font-bold ${isOcean ? 'text-white' : 'text-[#005f9e]'}`}>
                  {activeShipment.currentCoords ? `${activeShipment.currentLocationName || 'Recorded location'} · ${fmtLat(activeShipment.currentCoords[0])}, ${fmtLng(activeShipment.currentCoords[1])}` : access === 'PUBLIC' ? 'Verify the owner or recipient email/phone to view this location' : 'Location not available'}
                </div>
                <div className={`text-[11px] mt-1 ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
                  {activeShipment.currentLocationUpdatedAt ? `Updated ${fmtDate(activeShipment.currentLocationUpdatedAt)} · ${activeShipment.currentLocationSource.replace(/_/g, ' ')}` : 'No location update time'} • Progress: {activeShipment.progressPercent}% ({activeShipment.status.replace(/_/g, ' ')})
                </div>
              </div>

              {/* Destination Port & ETA */}
              <div className={`p-4 rounded-xl border ${
                isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${
                  isOcean ? 'text-cyan-200' : 'text-slate-500'
                }`}>
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Destination Port & ETA
                </div>
                <div className={`font-bold text-sm ${isOcean ? 'text-white' : 'text-slate-900'}`}>{activeShipment.destinationPort}</div>
                <div className={`text-xs mt-0.5 ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>{activeShipment.destinationCountry}</div>
                <div className="text-[11px] text-emerald-300 font-mono font-bold flex items-center gap-1 mt-2">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  ETA: {fmtDate(activeShipment.estimatedDeliveryDate)}
                </div>
              </div>
            </div>
          </div>

          {publicMap.data && <ShipmentMapView
            shipment={publicMap.data}
            onRefresh={() => { void publicMap.refreshNow(); }}
            refreshError={publicMap.status === 'retrying' ? tx('Updates paused, retrying') : publicMap.error}
            lastCheckedAt={publicMap.lastCheckedAt}
            justUpdated={publicMap.justUpdated}
          />}
          {!publicMap.data && publicMap.status === 'loading' && (
            <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {tx('Loading public shipment map…')}
            </div>
          )}
          {!publicMap.data && publicMap.status === 'retrying' && (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {tx('Updates paused, retrying')}
            </div>
          )}
          {!publicMap.data && publicMap.status === 'error' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
              <p>{tx('Map unavailable')}: {publicMap.error}</p>
              <button type="button" onClick={() => { void publicMap.refreshNow(); }} className="mt-2 font-bold underline">{tx('Retry')}</button>
            </div>
          )}

          {/* Stepper & Milestone Progression + Protected Consignee Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Operational Milestones (2 Cols) */}
            <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-lg ${
              isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
                isOcean ? 'border-[#006cae]/40' : 'border-slate-200'
              }`}>
                <div>
                  <h4 className="font-bold text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-300" />
                    <span>{tx('Operational Transit Milestones')}</span>
                  </h4>
                  <p className={`text-xs ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
                    Verified maritime checkpoints and port pilotage logs
                  </p>
                </div>
                <span className={`text-xs font-mono font-bold ${isOcean ? 'text-cyan-200' : 'text-[#005f9e]'}`}>
                  {activeShipment.milestones.filter(m => m.completed).length} of {activeShipment.milestones.length} Reached
                </span>
              </div>

              {/* Milestones list */}
              <div className={`relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 ${
                isOcean ? 'before:bg-[#006cae]' : 'before:bg-slate-200'
              }`}>
                {activeShipment.milestones.map((m, index) => {
                  const isCurrent = !m.completed && index > 0 && activeShipment.milestones[index - 1]?.completed;
                  return (
                    <div key={m.id} className="relative group">
                      <div className={`absolute -left-[30px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        m.completed
                          ? 'bg-cyan-500 text-white shadow-md'
                          : isCurrent
                            ? 'bg-[#f05a36] text-white animate-pulse ring-4 ring-[#f05a36]/30'
                            : isOcean ? 'bg-[#00385c] text-cyan-200/50 border border-[#005f9e]' : 'bg-slate-100 text-slate-400 border border-slate-300'
                      }`}>
                        {m.completed ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : isCurrent ? (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        ) : (
                          <Circle className="w-3 h-3" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h5 className={`font-bold text-sm ${
                            m.completed ? (isOcean ? 'text-white' : 'text-slate-900') : (isOcean ? 'text-cyan-200/60' : 'text-slate-400')
                          }`}>
                            {m.title}
                          </h5>
                          <span className={`text-xs font-mono ${isOcean ? 'text-cyan-200/70' : 'text-slate-500'}`}>
                            {new Date(m.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-xs ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
                          {m.description}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-cyan-300 pt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{m.location}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Protected Consignee / Commercial Data Panel */}
            <div className={`space-y-6 ${isOcean ? 'text-white' : 'text-slate-900'}`}>
              {/* Privacy Shield & Consignee Disclosure */}
              <div className={`p-6 rounded-2xl border shadow-lg ${
                isOcean ? 'bg-[#004b7a] border-[#006cae]/60' : 'bg-white border-slate-200'
              }`}>
                <div className={`pb-3 border-b mb-4 flex items-center justify-between ${
                  isOcean ? 'border-[#006cae]/40' : 'border-slate-200'
                }`}>
                  <h4 className={`font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                    isOcean ? 'text-cyan-200' : 'text-slate-600'
                  }`}>
                    {isFullDetailUnlocked ? <ShieldCheck className="w-4 h-4 text-emerald-300" /> : <Lock className="w-4 h-4 text-amber-300" />}
                    <span>{tx('Consignee & Invoice Details')}</span>
                  </h4>

                  {isFullDetailUnlocked ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                      UNLOCKED
                    </span>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isOcean ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                    }`}>
                      PROTECTED
                    </span>
                  )}
                </div>

                {isFullDetailUnlocked ? (
                  /* UNLOCKED FULL DETAIL (Customer or 2nd Detail Verified) */
                  <div className="space-y-3 text-xs animate-fadeIn">
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Consignee Name:')} </span>
                      <strong className={`block sm:inline ${isOcean ? 'text-white' : 'text-slate-900'}`}>{activeShipment.recipientName || activeShipment.customerName}</strong>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Email:')} </span>
                      <strong className="text-cyan-300 font-mono block sm:inline">{activeShipment.recipientEmail || activeShipment.customerEmail}</strong>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Phone:')} </span>
                      <strong className="text-cyan-300 font-mono block sm:inline">{activeShipment.recipientPhone || activeShipment.customerPhone}</strong>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Freight Cost:')} </span>
                      <strong className="text-emerald-300 font-mono">${activeShipment.priceUsd.toLocaleString()} USD ({activeShipment.paymentStatus})</strong>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Marine Insurance:')} </span>
                      <strong className={`font-mono ${isOcean ? 'text-white' : 'text-slate-800'}`}>${activeShipment.insuranceValueUsd.toLocaleString()} USD</strong>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Description:')} </span>
                      <span className={isOcean ? 'text-cyan-100' : 'text-slate-600'}>{activeShipment.cargoDescription}</span>
                    </div>
                  </div>
                ) : (
                  /* PROTECTED PUBLIC MASKED VIEW (Criteria requirement) */
                  <div className="space-y-3.5 text-xs">
                    <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                      isOcean 
                        ? 'bg-[#00385c] border-[#005f9e] text-cyan-100' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-800'
                    }`}>
                      <strong>{tx('Public Page Privacy Notice:')}</strong> {tx('Customer names, addresses, phone numbers, commercial pricing, and documents are hidden to protect shipper confidentiality.')}
                    </div>

                    <div className="space-y-2 opacity-80">
                      <div className={`flex justify-between items-center py-1 border-b ${
                        isOcean ? 'border-[#006cae]/30' : 'border-slate-100'
                      }`}>
                        <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Customer Name:')}</span>
                        <span className={`font-mono flex items-center gap-1 ${isOcean ? 'text-cyan-200/70' : 'text-slate-400'}`}>
                          <EyeOff className="w-3 h-3" /> [Protected Data]
                        </span>
                      </div>
                      <div className={`flex justify-between items-center py-1 border-b ${
                        isOcean ? 'border-[#006cae]/30' : 'border-slate-100'
                      }`}>
                        <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Phone & Email:')}</span>
                        <span className={`font-mono flex items-center gap-1 ${isOcean ? 'text-cyan-200/70' : 'text-slate-400'}`}>
                          <EyeOff className="w-3 h-3" /> [Hidden for Privacy]
                        </span>
                      </div>
                      <div className={`flex justify-between items-center py-1 border-b ${
                        isOcean ? 'border-[#006cae]/30' : 'border-slate-100'
                      }`}>
                        <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Commercial Pricing:')}</span>
                        <span className={`font-mono flex items-center gap-1 ${isOcean ? 'text-cyan-200/70' : 'text-slate-400'}`}>
                          <EyeOff className="w-3 h-3" /> [Confidential Tariff]
                        </span>
                      </div>
                      <div className={`flex justify-between items-center py-1 border-b ${
                        isOcean ? 'border-[#006cae]/30' : 'border-slate-100'
                      }`}>
                        <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Customs Documents:')}</span>
                        <span className={`font-mono flex items-center gap-1 ${isOcean ? 'text-cyan-200/70' : 'text-slate-400'}`}>
                          <EyeOff className="w-3 h-3" /> [Restricted Access]
                        </span>
                      </div>
                    </div>

                    {onNavigateToCustomerPortal && (
                      <button
                        onClick={onNavigateToCustomerPortal}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#005f9e] hover:bg-[#004e82] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{tx('Log In to View Full Cargo Records')}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* IoT Sensors Telematics Card */}
              <div className={`p-6 rounded-2xl border shadow-lg ${
                isOcean ? 'bg-[#004b7a] border-[#006cae]/60' : 'bg-white border-slate-200'
              }`}>
                <h4 className={`font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
                  isOcean ? 'text-cyan-200' : 'text-slate-600'
                }`}>
                  <Thermometer className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{tx('IoT Reefer Telematics')}</span>
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className={`p-3 rounded-xl border ${
                    isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className={`text-[10px] ${isOcean ? 'text-cyan-200' : 'text-slate-500'}`}>{tx('Cold Chain Temp')}</span>
                    <p className="text-xl font-mono font-bold text-cyan-300 mt-0.5">
                      {fmtNum(activeShipment.telemetry.temperatureCelsius, 1, '°C')}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className={`text-[10px] ${isOcean ? 'text-cyan-200' : 'text-slate-500'}`}>Humidity</span>
                    <p className="text-xl font-mono font-bold text-blue-300 mt-0.5">
                      {fmtNum(activeShipment.telemetry.humidityPercent, 1, '%')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeShipment && (
        <p className="text-xs text-slate-500" aria-live="polite">
          {lastUpdatedAt
            ? `Last updated ${lastUpdatedAt.toLocaleTimeString()} · refreshes every 30 seconds`
            : 'Waiting for the first tracking update…'}
          {refreshError && ` · Refresh issue: ${refreshError}`}
        </p>
      )}

      {activeShipment && isFullDetailUnlocked && (
        <ShipmentStopHistory shipmentId={activeShipment.id} />
      )}

      {activeShipment && isAuthenticated && documentsAllowed && showStoredDocuments && (
        <ShipmentDocumentsPanel shipmentId={activeShipment.id} />
      )}

      {/* Automated Milestone Notification Modal */}
      {showNotificationModal && activeShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl relative ${
            isOcean ? 'bg-[#004b7a] border-[#006cae] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyan-300" />
              Automated Milestone Notifications
            </h3>
            <p className={`text-xs mb-4 ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
              Subscribe to receive instant automated SMS and Email alerts for <strong>{activeShipment.trackingNumber}</strong>.
            </p>

            {subscribeSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto" />
                <h4 className="font-bold text-sm">{tx('Alert Subscription Active!')}</h4>
                <p className="text-xs">{tx('Milestone notices will be automatically transmitted.')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribeAlerts} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isOcean ? 'text-cyan-200' : 'text-slate-600'}`}>
                    {tx('Your Email or International Phone Number')}
                  </label>
                  <input
                    type="text"
                    required
                    value={subscribedEmail}
                    onChange={(e) => setSubscribedEmail(e.target.value)}
                    placeholder="name@company.com or +254 719 675 272"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      isOcean ? 'bg-[#003152] border-[#006cae] text-white placeholder:text-cyan-200/50' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {subscribeError && <p className="text-xs text-rose-300 font-semibold">{subscribeError}</p>}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNotificationModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#f05a36] hover:bg-[#d94a28] text-white shadow-md cursor-pointer"
                  >
                    Confirm Subscription
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
