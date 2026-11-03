import React, { useEffect, useState } from 'react';
import { Shipment, ShipmentStatus, Port, ShipmentPage, SHIPMENT_STATUSES } from '../../types/logistics';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ShipmentsApi, errorMessage } from '../../api';
import { fmtDate, fmtNum } from '../../utils/format';
import { AnalyticsReports } from '../analytics/AnalyticsReports';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { ApiSecurityDocs } from '../security/ApiSecurityDocs';
import { NewShipmentModal } from './NewShipmentModal';
import { TelemetryModal } from './TelemetryModal';
import { ShipmentEmailModal } from './ShipmentEmailModal';
import { ShipmentStopHistory } from '../tracker/ShipmentStopHistory';
import { PortsManager } from './PortsManager';
import { UsersManager } from './UsersManager';
import { AlertRulesPanel } from './AlertRulesPanel';
import { BackupsPanel } from './BackupsPanel';
import { ShipmentPageControls } from '../layout/ShipmentPageControls';
import { ShipmentItemsPanel } from '../customer/ShipmentItemsPanel';
import { ShipmentPartiesPanel } from '../customer/ShipmentPartiesPanel';
import { ShipmentDocumentsPanel } from '../documents/ShipmentDocumentsPanel';
import { 
  Ship, Plane, Truck, Search, Plus, ShieldCheck, 
  CheckCircle2, RefreshCw, Bell, Edit3, Eye, Mail,
  Activity, Lock, MapPin, Package, FileText, Users, Radio, Trash2, Train
} from 'lucide-react';

export type AdminSubTab = 'SHIPMENTS' | 'ANALYTICS' | 'NOTIFICATIONS' | 'SECURITY' | 'PORTS' | 'USERS';

interface AdminDashboardProps {
  shipments: Shipment[];
  pagination?: ShipmentPage<Shipment> | null;
  onPageChange?: (offset: number) => void;
  onFilterChange?: (filter: { q?: string; status?: ShipmentStatus }) => void;
  ports: Port[];
  loading?: boolean;
  onRefreshShipments: () => void;
  onRefreshPorts: () => void;
  onSelectShipment: (shipment: Shipment) => void;
  subTab: AdminSubTab;
  onChangeSubTab: (tab: AdminSubTab) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  shipments,
  pagination,
  onPageChange,
  onFilterChange,
  ports,
  loading,
  onRefreshShipments,
  onRefreshPorts,
  onSelectShipment,
  subTab: activeTab,
  onChangeSubTab: setActiveTab,
}) => {
  const { isOcean } = useTheme();
  const { t, tx } = useLanguage();
  const { role, isStaff } = useAuth();
  const canAdmin = role === 'ADMIN' || role === 'OPERATIONS_DIRECTOR';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ShipmentStatus>('ALL');
  const [actionNotice, setActionNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [paymentActionId, setPaymentActionId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onFilterChange?.({ q: searchTerm.trim() || undefined, status: statusFilter === 'ALL' ? undefined : statusFilter });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm, statusFilter, onFilterChange]);

  const showNotice = (text: string, ok = true) => {
    setActionNotice({ ok, text });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Modals
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [newStatus, setNewStatus] = useState<ShipmentStatus>('IN_TRANSIT');
  const [milestoneNote, setMilestoneNote] = useState('');
  const [milestoneLocation, setMilestoneLocation] = useState('');
  const [deliveryReceivedBy, setDeliveryReceivedBy] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [telemetryFor, setTelemetryFor] = useState<Shipment | null>(null);
  const [emailFor, setEmailFor] = useState<Shipment | null>(null);
  const [stopsFor, setStopsFor] = useState<Shipment | null>(null);
  const [itemsFor, setItemsFor] = useState<Shipment | null>(null);
  const [documentsFor, setDocumentsFor] = useState<Shipment | null>(null);
  const [partiesFor, setPartiesFor] = useState<Shipment | null>(null);

  // Metrics computed from the real shipment list
  const totalActive = shipments.filter(s => s.status !== 'DELIVERED').length;
  const totalDelivered = shipments.filter(s => s.status === 'DELIVERED').length;
  const onTimeRate = shipments.length
    ? (((shipments.filter(s => !s.isDelayed).length) / shipments.length) * 100).toFixed(1)
    : '—';
  const paidRevenue = shipments.filter(s => s.paymentStatus === 'PAID').reduce((acc, s) => acc + (s.priceUsd || 0), 0);
  const totalTonnage = (shipments.reduce((acc, s) => acc + (s.weightKg || 0), 0) / 1000).toFixed(1);

  const filteredShipments = shipments.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      s.trackingNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.vesselOrFlightName.toLowerCase().includes(q) ||
      s.destinationPort.toLowerCase().includes(q) ||
      s.containerId.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' ? true : s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;
    setSavingStatus(true);
    try {
      await ShipmentsApi.updateStatus(editingShipment.id, {
        status: newStatus,
        note: milestoneNote || undefined,
        location: milestoneLocation || undefined,
        receivedBy: newStatus === 'DELIVERED' ? deliveryReceivedBy.trim() : undefined,
      });
      showNotice(`${tx('Status updated to')} ${tx(newStatus.replace(/_/g, ' '))} ${tx('for shipment')} ${editingShipment.trackingNumber}. ${tx('Customer notified.')}`);
      setEditingShipment(null);
      setMilestoneNote('');
      setMilestoneLocation('');
      setDeliveryReceivedBy('');
      onRefreshShipments();
    } catch (err) {
      showNotice(errorMessage(err), false);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDelete = async (s: Shipment) => {
    if (!window.confirm(`${tx('Permanently delete shipment')} ${s.trackingNumber}?`)) return;
    try {
      await ShipmentsApi.remove(s.id);
      showNotice(tx('Shipment deleted'));
      onRefreshShipments();
    } catch (err) {
      showNotice(errorMessage(err), false);
    }
  };

  const handlePublicMapToggle = async (s: Shipment) => {
    const enabled = s.publicMapEnabled === false;
    try {
      const result = await ShipmentsApi.setPublicMap(s.id, enabled);
      showNotice(result.message);
      onRefreshShipments();
    } catch (err) {
      showNotice(errorMessage(err), false);
    }
  };

  const handlePaymentApproval = async (s: Shipment) => {
    setPaymentActionId(s.id);
    try {
      const result = await ShipmentsApi.setPaymentApproval(s.id);
      if (result.notificationStatus === 'FAILED') {
        showNotice(tx('Payment approved, but the owner email could not be sent. Check notification logs.'), false);
      } else {
        showNotice(`${tx('Payment approved. Owner notification')} ${tx(result.notificationStatus || 'QUEUED').toLowerCase()}.`);
      }
      onRefreshShipments();
    } catch (err) {
      showNotice(errorMessage(err), false);
    } finally {
      setPaymentActionId(null);
    }
  };

  if (!isStaff) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Title */}
      <div className={`p-6 rounded-2xl border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              isOcean 
                ? 'bg-cyan-400/20 text-cyan-200 border-cyan-400/30' 
                : 'bg-cyan-500/10 text-[#005f9e] border border-cyan-500/20'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {tx('Staff workspace')}
            </span>
            <span className={`text-xs ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
              {tx('Signed in as:')} <strong className={isOcean ? 'text-white' : 'text-slate-900'}>{tx(role.replace(/_/g, ' '))}</strong>
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {t.adminTitle}
          </h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
            {tx('Manage shipments, tracking updates, customer handoffs and service settings.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefreshShipments}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
              isOcean 
                ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white hover:bg-[#004d7c]' 
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{loading ? tx('Syncing…') : tx('Refresh')}</span>
          </button>

          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f05a36] hover:bg-[#d94a28] text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tx('New shipment')}</span>
          </button>
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#005f9e] hover:bg-[#004e82] text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{tx('Analytical Reports')}</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
          actionNotice.ok ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200' : 'bg-rose-500/20 border border-rose-400/40 text-rose-200'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionNotice.text}</span>
        </div>
      )}

      <p className={`-mt-3 text-xs ${isOcean ? 'text-cyan-200' : 'text-slate-500'}`}>{tx('Summary figures below reflect the shipments on this page.')}</p>

      {/* Operational summary cards */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className={`p-4 rounded-xl border shadow-sm ${
          isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            isOcean ? 'text-cyan-200' : 'text-slate-500'
          }`}>
            {tx('Active Shipments')}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-2xl font-black font-mono ${isOcean ? 'text-white' : 'text-[#005f9e]'}`}>
              {totalActive}
            </span>
            <span className="text-xs text-emerald-400 font-bold">{tx('Not delivered')}</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${
          isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            isOcean ? 'text-cyan-200' : 'text-slate-500'
          }`}>
            {tx('Delivered')}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-2xl font-black font-mono ${isOcean ? 'text-white' : 'text-slate-900'}`}>
              {totalDelivered}
            </span>
            <span className="text-xs text-cyan-300 font-bold">{tx('Completed')}</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${
          isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            isOcean ? 'text-cyan-200' : 'text-slate-500'
          }`}>
            {tx('On-Time Reliability')}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black font-mono text-emerald-300">
              {onTimeRate}%
            </span>
            <span className="text-xs text-emerald-400 font-bold">{tx('Not flagged delayed')}</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${
          isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            isOcean ? 'text-cyan-200' : 'text-slate-500'
          }`}>
            {tx('Tonnage In Motion')}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-2xl font-black font-mono ${isOcean ? 'text-white' : 'text-slate-900'}`}>
              {totalTonnage} t
            </span>
            <span className="text-xs text-cyan-300 font-bold">{tx('Total cargo weight')}</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm col-span-2 lg:col-span-1 ${
          'bg-[#005f9e] border-[#004f83] text-white'
        }`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            'text-blue-100'
          }`}>
            {tx('Paid revenue')}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black font-mono text-emerald-300">
              ${(paidRevenue / 1000).toFixed(1)}k
            </span>
            <span className="text-xs text-blue-100 font-bold">{tx('Paid only')}</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher for Staff Operations */}
      <div className={`flex border-b gap-4 sm:gap-6 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none ${
        isOcean ? 'border-[#006cae]/40' : 'border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('SHIPMENTS')}
          className={`pb-3 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'SHIPMENTS'
              ? isOcean ? 'border-cyan-400 text-white font-bold' : 'border-[#005f9e] text-[#005f9e] font-bold'
              : isOcean ? 'border-transparent text-cyan-200 hover:text-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>{tx('Shipments')} ({filteredShipments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`pb-3 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ANALYTICS'
              ? isOcean ? 'border-cyan-400 text-white font-bold' : 'border-[#005f9e] text-[#005f9e] font-bold'
              : isOcean ? 'border-transparent text-cyan-200 hover:text-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{tx('Reports')}</span>
        </button>

        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`pb-3 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'NOTIFICATIONS'
              ? isOcean ? 'border-cyan-400 text-white font-bold' : 'border-[#005f9e] text-[#005f9e] font-bold'
              : isOcean ? 'border-transparent text-cyan-200 hover:text-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{tx('Notifications')}</span>
        </button>

        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`pb-3 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'SECURITY'
              ? isOcean ? 'border-cyan-400 text-white font-bold' : 'border-[#005f9e] text-[#005f9e] font-bold'
              : isOcean ? 'border-transparent text-cyan-200 hover:text-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{tx('Settings & API')}</span>
        </button>

        <button
          onClick={() => setActiveTab('PORTS')}
          className={`pb-3 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'PORTS'
              ? isOcean ? 'border-cyan-400 text-white font-bold' : 'border-[#005f9e] text-[#005f9e] font-bold'
              : isOcean ? 'border-transparent text-cyan-200 hover:text-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{tx('Ports & routes')} ({ports.length})</span>
        </button>

        {canAdmin && (
          <button
            onClick={() => setActiveTab('USERS')}
            className={`pb-3 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'USERS'
                ? isOcean ? 'border-cyan-400 text-white font-bold' : 'border-[#005f9e] text-[#005f9e] font-bold'
                : isOcean ? 'border-transparent text-cyan-200 hover:text-white' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{tx('Users')}</span>
          </button>
        )}
      </div>

      {/* TAB 1: ALL ACTIVE SHIPMENTS TABLE */}
      {activeTab === 'SHIPMENTS' && (
        <div className={`rounded-2xl border shadow-lg overflow-hidden ${
          isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          {/* Status filters stay on the first row; search sits below them. */}
          <div className={`flex flex-col items-start gap-3 border-b p-4 ${
            isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex w-full min-w-0 items-center justify-start gap-2 overflow-x-auto pb-1">
              <span className={`shrink-0 text-xs whitespace-nowrap ${isOcean ? 'text-cyan-200' : 'text-slate-500'}`}>{t.filterByStatus}:</span>
              {(['ALL', ...SHIPMENT_STATUSES] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#005f9e] text-white font-bold shadow-sm'
                      : isOcean ? 'bg-[#00385c] text-cyan-200 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? tx('All') : tx(st.replace(/_/g, ' '))}
                </button>
              ))}
            </div>

            <div className={`relative flex w-full items-center rounded-xl border px-3 py-2 md:max-w-md ${
              isOcean ? 'bg-[#002f4d] border-[#006cae]' : 'bg-white border-slate-300'
            }`}>
              <Search className={`mr-2 h-4 w-4 shrink-0 ${isOcean ? 'text-cyan-200' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder={t.searchShipments}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-transparent text-xs focus:outline-none ${
                  isOcean ? 'text-white placeholder:text-cyan-200/50' : 'text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
          </div>
          {/* Table */}
          <div className="overflow-x-auto rounded-b-2xl" role="region" aria-label="Shipment list; scroll horizontally on small screens" tabIndex={0}>
            <table className="w-full min-w-[1040px] text-left text-xs">
              <thead className={`border-b font-bold uppercase tracking-wider text-[11px] ${
                isOcean ? 'bg-[#00385c] text-cyan-200 border-[#005f9e]' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">{tx('Tracking & Cargo')}</th>
                  <th className="py-3 px-4">{tx('Carrier / Vessel')}</th>
                  <th className="py-3 px-4">{tx('Origin → Destination')}</th>
                  <th className="py-3 px-4">{tx('Progress / ETA')}</th>
                  <th className="py-3 px-4">{tx('Telematics')}</th>
                  <th className="py-3 px-4">{tx('Status')}</th>
                  <th className="py-3 px-4 text-right">{tx('Actions (Staff)')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isOcean ? 'divide-[#006cae]/30' : 'divide-slate-200'}`}>
                {filteredShipments.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-sm opacity-70">
                    {loading ? tx('Loading shipments…') : shipments.length === 0 ? tx('No shipments yet. Use “New shipment” or wait for customer bookings.') : tx('No shipments match your filters.')}
                  </td></tr>
                )}
                {filteredShipments.map(s => (
                  <tr 
                    key={s.id} 
                    className={`transition-colors ${
                      isOcean ? 'hover:bg-[#005f9e]/30' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <div className={`cursor-pointer hover:underline ${isOcean ? 'text-white' : 'text-[#005f9e]'}`} onClick={() => onSelectShipment(s)}>
                        {s.trackingNumber}
                      </div>
                      <div className={`text-[11px] font-sans font-normal truncate max-w-[150px] ${
                        isOcean ? 'text-cyan-100' : 'text-slate-600'
                      }`}>
                        {s.customerName}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold">{s.carrierName}</div>
                      <div className={`text-[11px] flex items-center gap-1 ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
                        {s.transportMode === 'OCEAN' ? <Ship className="w-3 h-3 text-cyan-300" /> : s.transportMode === 'AIR' ? <Plane className="w-3 h-3 text-sky-300" /> : s.transportMode === 'RAIL' ? <Train className="w-3 h-3 text-sky-300" /> : <Truck className="w-3 h-3 text-sky-300" />}
                        {s.vesselOrFlightName || tx('Vessel not assigned')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className={`font-medium truncate max-w-[140px] ${isOcean ? 'text-cyan-100' : 'text-slate-700'}`}>{s.originPort}</div>
                      <div className={`font-medium truncate max-w-[140px] ${isOcean ? 'text-white' : 'text-[#005f9e]'}`}>→ {s.destinationPort}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{s.progressPercent}%</span>
                        <div className="w-16 bg-black/20 rounded-full h-1.5">
                          <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${s.progressPercent}%` }} />
                        </div>
                      </div>
                      <div className={`text-[11px] mt-0.5 ${isOcean ? 'text-cyan-200' : 'text-slate-500'}`}>
                        {tx('ETA:')} {fmtDate(s.estimatedDeliveryDate)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-cyan-300 font-semibold">{fmtNum(s.telemetry.temperatureCelsius, 1, '°C')}</div>
                      <div className={`text-[11px] ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>{fmtNum(s.telemetry.speedKnots, 1)} kts • {s.telemetry.containerSealIntact ? tx('Seal OK') : tx('SEAL BREACH')}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        s.status === 'DELIVERED'
                          ? isOcean ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                          : s.isDelayed
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : isOcean ? 'bg-cyan-400/20 text-cyan-200 border-cyan-400/30' : 'bg-[#005f9e]/10 text-[#005f9e] border-[#005f9e]/20'
                      }`}>
                        {tx(s.status.replace(/_/g, ' '))}
                      </span>
                      <div className={`mt-1 text-[10px] ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
                        {tx('Payment')}: {tx(s.paymentStatus)} · {tx(s.paymentApprovalStatus === 'APPROVED' ? 'Payment approved' : s.paymentStatus === 'PAID' ? 'Awaiting admin approval' : 'Not paid')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canAdmin && s.paymentStatus === 'PAID' && s.paymentApprovalStatus !== 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => void handlePaymentApproval(s)}
                            title={tx('Approve received payment and notify shipment owner')}
                            aria-label={`${tx('Approve payment for')} ${s.trackingNumber}`}
                            disabled={paymentActionId === s.id}
                            className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingShipment(s);
                            setNewStatus(s.status);
                          }}
                          title={tx('Update operational status and dispatch alert')}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isOcean ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEmailFor(s)}
                          title={`${tx('Preview and email')} ${s.customerName} ${tx('about this shipment')}`}
                          aria-label={`${tx('Email owner of shipment')} ${s.trackingNumber}`}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${isOcean ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setTelemetryFor(s)}
                          title={tx('Record telemetry / GPS position')}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isOcean ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          <Radio className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setStopsFor(s)}
                          title={tx('View and manage shipment stops')}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isOcean
                              ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handlePublicMapToggle(s)}
                          title={`${tx(s.publicMapEnabled === false ? 'Enable' : 'Disable')} ${tx('public map for')} ${s.trackingNumber}`}
                          aria-label={`${tx(s.publicMapEnabled === false ? 'Enable' : 'Disable')} ${tx('public map for')} ${s.trackingNumber}`}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${s.publicMapEnabled === false ? 'border-slate-300 bg-slate-100 text-slate-500' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'}`}
                        >
                          {s.publicMapEnabled === false ? <Lock className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setItemsFor(s)}
                          title={tx('View and manage shipment items')}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isOcean
                              ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          <Package className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPartiesFor(s)}
                          title={tx('View shipment parties and manage authorized viewers')}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${isOcean ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDocumentsFor(s)}
                          title={tx('View and manage shipment documents')}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isOcean
                              ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {canAdmin && (
                          <button
                            onClick={() => handleDelete(s)}
                            title={tx('Delete shipment')}
                            className="p-1.5 rounded-lg border border-rose-400/40 text-rose-300 hover:text-rose-200 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onSelectShipment(s)}
                          title="View telemetry & milestones"
                          className="p-1.5 rounded-lg bg-[#005f9e] hover:bg-[#004e82] text-white transition-all cursor-pointer shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <ShipmentPageControls page={pagination} onChange={offset => onPageChange?.(offset)} />
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS & MONTHLY REPORTS */}
      {activeTab === 'ANALYTICS' && (
        <div className="animate-fadeIn">
          <AnalyticsReports />
        </div>
      )}

      {/* TAB 3: AUTOMATED NOTIFICATIONS HUB & ALERT RULES */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="space-y-6 animate-fadeIn">
          <NotificationCenter />
          <AlertRulesPanel />
        </div>
    )}

      {/* TAB 4: API SECURITY, RBAC & MYSQL HIGH AVAILABILITY */}
      {activeTab === 'SECURITY' && (
        <div className="space-y-6 animate-fadeIn">
          <ApiSecurityDocs />

          {canAdmin && <BackupsPanel />}
        </div>
      )}

      {/* TAB 5/6: PORTS & USERS */}
      {activeTab === 'PORTS' && <PortsManager ports={ports} onChanged={onRefreshPorts} />}
      {activeTab === 'USERS' && canAdmin && <UsersManager />}

      {/* Status Update Modal */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl relative ${
            isOcean ? 'bg-[#004b7a] border-[#006cae] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-cyan-300" />
              Update Shipment Operational Status
            </h3>
            <p className={`text-xs mb-4 ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
              {editingShipment.trackingNumber} ({editingShipment.containerId})
            </p>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isOcean ? 'text-cyan-200' : 'text-slate-600'}`}>
                  New Operational Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ShipmentStatus)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isOcean ? 'bg-[#003152] border-[#006cae] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="BOOKED">BOOKED</option>
                  <option value="PICKED_UP">PICKED UP</option>
                  <option value="CUSTOMS_EXPORT">CUSTOMS EXPORT</option>
                  <option value="CUSTOMS_HOLD">CUSTOMS HOLD</option>
                  <option value="IN_TRANSIT">IN TRANSIT</option>
                  <option value="CARGO_STOP">CARGO STOP</option>
                  <option value="PORT_ARRIVAL">PORT ARRIVAL</option>
                  <option value="CUSTOMS_IMPORT">CUSTOMS IMPORT</option>
                  <option value="DELIVERY_ATTEMPTED">DELIVERY ATTEMPTED</option>
                  <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="EXCEPTION">EXCEPTION</option>
                </select>
              </div>

              {newStatus === 'DELIVERED' && (
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isOcean ? 'text-cyan-200' : 'text-slate-600'}`}>Received by</label>
                  <input required value={deliveryReceivedBy} onChange={e => setDeliveryReceivedBy(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-sm ${isOcean ? 'bg-[#003152] border-[#006cae] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                </div>
              )}
              <p className={`text-xs ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
                Status cannot move backwards. Add a reason when recording an exception or hold.
              </p>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isOcean ? 'text-cyan-200' : 'text-slate-600'}`}>
                  Event location (optional)
                </label>
                <input
                  value={milestoneLocation}
                  onChange={(e) => setMilestoneLocation(e.target.value)}
                  placeholder="e.g. Berth 4, Terminal B"
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isOcean ? 'bg-[#003152] border-[#006cae] text-white placeholder:text-cyan-200/50' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isOcean ? 'text-cyan-200' : 'text-slate-600'}`}>
                  Milestone Note / Port Terminal Dispatch Log
                </label>
                <textarea
                  rows={3}
                  value={milestoneNote}
                  onChange={(e) => setMilestoneNote(e.target.value)}
                  placeholder="e.g. Discharged at berth 4, customs cleared without demurrage."
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isOcean ? 'bg-[#003152] border-[#006cae] text-white placeholder:text-cyan-200/50' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className={`p-3 rounded-xl border text-[11px] ${
                isOcean ? 'bg-[#00385c] border-[#005f9e] text-cyan-200' : 'bg-cyan-50 border-cyan-200 text-[#005f9e]'
              }`}>
                🔔 Updating status will automatically trigger customer email notification to: <strong>{editingShipment.customerEmail}</strong>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#f05a36] hover:bg-[#d94a28] disabled:opacity-60 text-white shadow-md cursor-pointer"
                >
                  {savingStatus ? 'Saving…' : 'Save & Dispatch Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNew && (
        <NewShipmentModal
          ports={ports}
          onClose={() => setShowNew(false)}
          onCreated={(created) => {
            setShowNew(false);
            showNotice(`Shipment ${created.trackingNumber} created`);
            onRefreshShipments();
          }}
        />
      )}
      {emailFor && (
        <ShipmentEmailModal
          shipment={emailFor}
          onClose={() => setEmailFor(null)}
          onSent={text => showNotice(text, !text.startsWith('Email failed'))}
        />
      )}
      {telemetryFor && (
        <TelemetryModal
          shipment={telemetryFor}
          onClose={() => setTelemetryFor(null)}
          onSaved={() => {
            setTelemetryFor(null);
            showNotice('Telemetry saved');
            onRefreshShipments();
          }}
        />
      )}

      {stopsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto p-5 rounded-2xl border shadow-2xl ${
            isOcean
              ? 'bg-[#004b7a] border-[#006cae] text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold">{tx('Shipment stops')}</h3>
                <p className="text-xs opacity-70">{stopsFor.trackingNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setStopsFor(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-900"
              >
                {tx('Close')}
              </button>
            </div>
            <ShipmentStopHistory shipmentId={stopsFor.id} />
          </div>
        </div>
      )}
            {itemsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto p-5 rounded-2xl border shadow-2xl ${
            isOcean
              ? 'bg-[#004b7a] border-[#006cae] text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold">{tx('Shipment items')}</h3>
                <p className="text-xs opacity-70">{itemsFor.trackingNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setItemsFor(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-900"
              >
                {tx('Close')}
              </button>
            </div>
            <ShipmentItemsPanel
              shipmentId={itemsFor.id}
              shipmentStatus={itemsFor.status}
              onChanged={onRefreshShipments}
            />
          </div>
        </div>
      )}

            {partiesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto p-5 rounded-2xl border shadow-2xl ${isOcean ? 'bg-[#004b7a] border-[#006cae] text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div><h3 className="font-bold">{tx('Shipment parties & access')}</h3><p className="text-xs opacity-70">{partiesFor.trackingNumber}</p></div>
              <button type="button" onClick={() => setPartiesFor(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-900">{tx('Close')}</button>
            </div>
            <ShipmentPartiesPanel shipment={partiesFor} />
          </div>
        </div>
      )}

      {documentsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto p-5 rounded-2xl border shadow-2xl ${
            isOcean
              ? 'bg-[#004b7a] border-[#006cae] text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold">{tx('Shipment documents')}</h3>
                <p className="text-xs opacity-70">{documentsFor.trackingNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentsFor(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-900"
              >
                {tx('Close')}
              </button>
            </div>
            <ShipmentDocumentsPanel shipmentId={documentsFor.id} />
          </div>
        </div>
      )}
    </div>
  );
};
