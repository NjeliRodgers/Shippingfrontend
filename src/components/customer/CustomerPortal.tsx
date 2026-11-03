import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Shipment, ShipmentPage } from '../../types/logistics';
import { ShipmentPageControls } from '../layout/ShipmentPageControls';
import { ShipmentStopHistory } from '../tracker/ShipmentStopHistory';
import { ShipmentItemsPanel } from './ShipmentItemsPanel';
import { ShipmentPartiesPanel } from './ShipmentPartiesPanel';
import { ShipmentDocumentsPanel } from '../documents/ShipmentDocumentsPanel';
import { ShipmentsApi, errorMessage } from '../../api';
import { fmtNum } from '../../utils/format';
import { 
  FileText, Download, ShieldCheck, CheckCircle2, 
  DollarSign, Clock, MapPin, Receipt, 
  ArrowRight, Thermometer, User, Building,
  Bell, Eye, Lock, ExternalLink
} from 'lucide-react';

interface CustomerPortalProps {
  shipments: Shipment[];
  pagination?: ShipmentPage<Shipment> | null;
  onPageChange?: (offset: number) => void;
  loading?: boolean;
  onReload?: () => void;
  onSelectShipmentToTrack: (shipment: Shipment) => void;
  onOpenAuthModal: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  shipments,
  pagination,
  onPageChange,
  loading,
  onReload,
  onSelectShipmentToTrack,
  onOpenAuthModal,
}) => {
  const { isOcean } = useTheme();
  const { language, tx } = useLanguage();
  const { user, isAuthenticated, isStaff } = useAuth();

  const [activeTab, setActiveTab] = useState<'SHIPMENTS' | 'INVOICES' | 'DOCUMENTS'>('SHIPMENTS');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [claimRef, setClaimRef] = useState('');
  const [claimDetail, setClaimDetail] = useState('');
  const [claimMsg, setClaimMsg] = useState('');
  const selectedShipment: Shipment | null = shipments.find(x => x.id === selectedId) || shipments[0] || null;
  const selectedParty = selectedShipment?.parties.find(p =>
    (!!user && p.userId === user.id) || (!!user?.email && p.email?.toLowerCase() === user.email.toLowerCase())
  );
  const selectedIsPayer = !!selectedShipment && selectedShipment.parties.some(p =>
    p.role === 'PAYER' && ((!!user && p.userId === user.id) || (!!user?.email && p.email?.toLowerCase() === user.email.toLowerCase()))
  );
  const selectedCanViewDetails = !!selectedShipment && (!!isStaff || !!selectedParty?.canViewDetails ||
    selectedShipment.parties.some(p => (p.role === 'SHIPPER' || p.role === 'CONSIGNEE') &&
      ((!!user && p.userId === user.id) || (!!user?.email && p.email?.toLowerCase() === user.email.toLowerCase()))));
  const documentShipments = shipments.filter(shipment => {
    const party = shipment.parties.find(p => (!!user && p.userId === user.id) || (!!user?.email && p.email?.toLowerCase() === user.email.toLowerCase()));
    return isStaff || party?.canViewDocuments || shipment.parties.some(p => (p.role === 'SHIPPER' || p.role === 'CONSIGNEE') && p.canViewDocuments && ((!!user && p.userId === user.id) || (!!user?.email && p.email?.toLowerCase() === user.email.toLowerCase())));
  });
  const setSelectedShipment = (x: Shipment) => setSelectedId(x.id);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimMsg('');
    try {
      await ShipmentsApi.claim(claimRef, claimDetail);
      setClaimRef('');
      setClaimDetail('');
      setClaimMsg(tx('Shipment linked to your account.'));
      onReload?.();
    } catch (err) {
      setClaimMsg(errorMessage(err));
    }
  };

  // If not authenticated, show an inviting customer login prompt
  if (!isAuthenticated) {
    return (
      <div className={`p-8 sm:p-12 rounded-3xl border shadow-xl text-center space-y-5 max-w-2xl mx-auto my-8 ${
        isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
          isOcean ? 'bg-white/10 text-cyan-200' : 'bg-[#005f9e]/10 text-[#005f9e]'
        }`}>
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isOcean ? 'text-cyan-200' : 'text-[#005f9e]'
          }`}>
            {tx('Secure Customer Portal Area')}
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {tx('Log In to Access Full Cargo Records')}
          </h3>
          <p className={`text-sm ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
            {tx('Public searches protect client confidentiality by showing basic status and ETA only. Log in to your account to access your complete shipment history, commercial invoices, bills of lading, and phytosanitary clearance documents.')}
          </p>
        </div>

        <div className="pt-3 flex flex-wrap justify-center gap-3">
          <button
            onClick={onOpenAuthModal}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-[#f05a36] hover:bg-[#d94a28] text-white shadow-lg cursor-pointer transition-all"
          >
            {tx('Sign In with Customer Credentials')}
          </button>
        </div>
      </div>
    );
  }

  const handleDownloadInvoice = (shipment: Shipment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert(tx('Allow pop-ups for this site to print or save the invoice summary as PDF.'));
      return;
    }
    printWindow.opener = null;

    const htmlEscapes: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    };
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => htmlEscapes[character]);
    const text = (value: string | null | undefined) => escapeHtml(value || '-');
    const locale = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', zh: 'zh-CN', ar: 'ar' }[language];
    const amount = new Intl.NumberFormat(locale, {
      style: 'currency', currency: 'USD', minimumFractionDigits: 2,
    }).format(shipment.priceUsd);
    const invoiceDate = new Date(shipment.createdAt).toLocaleDateString(locale);

    printWindow.document.write(`<!doctype html>
<html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${text(tx('Invoice summary'))} ${text(shipment.trackingNumber)}</title>
<style>
  body{font:14px Arial,sans-serif;color:#172033;margin:40px auto;max-width:800px;padding:0 28px}
  header{display:flex;justify-content:space-between;border-bottom:3px solid #005f9e;padding-bottom:18px}
  h1{font-size:24px;margin:0 0 6px;color:#005f9e}h2{font-size:15px;margin:26px 0 10px}
  .muted{color:#64748b;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .box{border:1px solid #cbd5e1;border-radius:8px;padding:14px}.amount{font-size:22px;font-weight:700;color:#005f9e}
  @media print{body{margin:0 auto;padding:20px}.no-print{display:none}}
</style></head><body>
<header><div><h1>BlueCrest Cargo Lines</h1><div class="muted">${text(tx('Freight invoice summary'))}</div></div>
<div><strong>INV-${text(shipment.trackingNumber)}</strong><div class="muted">${text(tx('Created'))} ${text(invoiceDate)}</div></div></header>
<div class="grid"><section><h2>${text(tx('Shipper / account owner'))}</h2><div class="box"><strong>${text(shipment.customerName)}</strong><br>${text(shipment.customerEmail)}<br>${text(shipment.customerPhone)}</div></section>
<section><h2>${text(tx('Delivery recipient'))}</h2><div class="box"><strong>${text(shipment.recipientName || shipment.customerName)}</strong><br>${text(shipment.recipientEmail || shipment.customerEmail)}<br>${text(shipment.recipientPhone || shipment.customerPhone)}</div></section></div>
<h2>${text(tx('Shipment'))}</h2><div class="box">${text(tx('Tracking:'))} <strong>${text(shipment.trackingNumber)}</strong><br>${text(tx('Route:'))} ${text(shipment.originPort)}, ${text(shipment.originCountry)} &#8594; ${text(shipment.destinationPort)}, ${text(shipment.destinationCountry)}<br>${text(tx('Transport:'))} ${text(tx(shipment.transportMode))}<br>${text(tx('Container:'))} ${text(shipment.containerId)}<br>${text(tx('Cargo:'))} ${text(shipment.cargoDescription)}</div>
<h2>${text(tx('Charges and payment'))}</h2><div class="box">${text(tx('Freight total'))}: <span class="amount">${text(amount)}</span><br>${text(tx('Payment status:'))} <strong>${text(tx(shipment.paymentStatus))}</strong><br>${text(tx('Payment reference:'))} ${text(shipment.paymentReference)}</div>
<p class="muted">${text(tx('This summary reflects the shipment booking record. It does not replace a tax invoice issued by the carrier or finance team.'))}</p>
<button class="no-print" onclick="window.print()">${text(tx('Print / Save as PDF'))}</button>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`);
    printWindow.document.close();
  };

  if (!selectedShipment) {
    return (
      <div className={`p-8 rounded-3xl border shadow-xl max-w-2xl mx-auto my-8 space-y-4 ${
        isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <h3 className="text-xl font-extrabold">{loading ? tx('Loading your shipments…') : tx('No shipments on your account yet')}</h3>
        <p className={`text-sm ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
          {tx('Book a shipment while signed in, or link an existing one using its tracking number and the recipient email or phone.')}
        </p>
        <form onSubmit={handleClaim} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input required value={claimRef} onChange={e => setClaimRef(e.target.value)} placeholder={tx('Tracking number')}
            className="px-3 py-2 rounded-xl border text-xs bg-white text-slate-900 border-slate-300" />
          <input required value={claimDetail} onChange={e => setClaimDetail(e.target.value)} placeholder={tx('Recipient email or phone')}
            className="px-3 py-2 rounded-xl border text-xs bg-white text-slate-900 border-slate-300" />
          <button type="submit" className="px-4 py-2 rounded-xl font-bold text-xs bg-[#f05a36] hover:bg-[#d94a28] text-white cursor-pointer">{tx('Link shipment')}</button>
        </form>
        {claimMsg && <p className="text-xs font-semibold text-cyan-300">{claimMsg}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Header Banner */}
      <div className={`p-6 rounded-2xl border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              isOcean 
                ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30' 
                : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {tx('VERIFIED CUSTOMER AREA • FULL MANIFEST ACCESS')}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {tx('Customer Consignment Vault & Invoices')}
          </h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
            {tx('Logged in as')} <strong>{user?.name}</strong> ({user?.company || tx('Authorized Shipper')}) • {user?.email}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['SHIPMENTS', 'INVOICES', 'DOCUMENTS'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab
                  ? isOcean
                    ? 'bg-[#005f9e] text-white shadow-sm border border-white/60'
                    : 'bg-[#005f9e] text-white shadow-sm'
                  : isOcean 
                    ? 'bg-[#00385c] text-cyan-200 hover:text-white hover:bg-[#004d7c]' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab === 'SHIPMENTS' ? tx('Shipment History') : tab === 'INVOICES' ? tx('Invoices & Paystack') : tx('Customs Documents')}
            </button>
          ))}
        </div>
      </div>

      {pagination && onPageChange && <ShipmentPageControls page={pagination} onChange={onPageChange} />}

      {/* TAB 1: SHIPMENT HISTORY WITH UNMASKED FULL DETAILS */}
      {activeTab === 'SHIPMENTS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of Customer Shipments (1 Col) */}
            <div className={`p-4 rounded-2xl border shadow-lg space-y-3 ${
              isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <h3 className={`font-bold text-xs uppercase tracking-wider mb-2 ${
                isOcean ? 'text-cyan-200' : 'text-slate-500'
              }`}>
                {tx('Your Active & Delivered Consignments')} ({pagination?.total ?? shipments.length})
              </h3>
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {shipments.map(s => {
                  const isSelected = selectedShipment.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedShipment(s)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? isOcean
                            ? 'bg-[#005f9e] border-white/60 shadow-md ring-1 ring-cyan-300'
                            : 'bg-cyan-50 border-[#005f9e] ring-1 ring-[#005f9e]'
                          : isOcean 
                            ? 'bg-[#00385c] border-[#005f9e] hover:bg-[#00426d]' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`font-mono font-bold text-xs ${
                            isSelected ? 'text-white' : (isOcean ? 'text-cyan-200' : 'text-[#005f9e]')
                          }`}>
                            {s.trackingNumber}
                          </span>
                          <p className={`text-[11px] font-semibold truncate max-w-[170px] mt-0.5 ${
                            isSelected ? 'text-white' : (isOcean ? 'text-cyan-100' : 'text-slate-700')
                          }`}>
                            {s.cargoDescription}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'DELIVERED'
                            ? isOcean ? 'bg-emerald-400/20 text-emerald-200' : 'bg-emerald-500/10 text-emerald-700'
                            : isOcean ? 'bg-cyan-400/20 text-cyan-200' : 'bg-[#005f9e]/10 text-[#005f9e]'
                        }`}>
                          {tx(s.status.replace(/_/g, ' '))}
                        </span>
                      </div>

                      <div className={`flex items-center justify-between text-[10px] mt-2 pt-2 border-t ${
                        isOcean ? 'border-white/20 text-cyan-200' : 'border-slate-200 text-slate-500'
                      }`}>
                        <span>{tx(s.originPort.split(' ')[2] || 'Origin')} → {tx(s.destinationPort.split(' ')[2] || 'Dest')}</span>
                        <span className="font-mono font-bold">${s.priceUsd.toLocaleString()}</span>
                      </div>
                      <div className={`mt-1 text-[10px] font-semibold ${isOcean ? 'text-cyan-100' : 'text-slate-600'}`}>
                        {tx(s.paymentStatus === 'PAID'
                          ? s.paymentApprovalStatus === 'APPROVED' ? 'Payment approved' : 'Awaiting admin approval'
                          : 'Payment pending')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Shipment Full Unmasked Dossier (2 Cols) */}
            <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-lg space-y-6 ${
              isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
                isOcean ? 'border-[#006cae]/40' : 'border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${isOcean ? 'text-cyan-200' : 'text-[#005f9e]'}`}>
                      {selectedShipment.trackingNumber}
                    </span>
                    <span className={`text-xs font-mono ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
                      {tx('Container')}: {selectedShipment.containerId}
                    </span>
                  </div>
                  <h3 className={`text-lg font-bold mt-0.5 ${isOcean ? 'text-white' : 'text-slate-900'}`}>
                    {selectedShipment.cargoDescription}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={selectedShipment.priceUsd <= 0}
                    onClick={() => handleDownloadInvoice(selectedShipment)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                      isOcean 
                        ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white hover:bg-[#004d7c]' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-300" />
                    <span>{tx('Print / Save Invoice PDF')}</span>
                  </button>
                  <button
                    onClick={() => onSelectShipmentToTrack(selectedShipment)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#005f9e] hover:bg-[#004e82] text-white flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{tx('Open Live Stepper')}</span>
                  </button>
                </div>
              </div>

              {/* Unmasked Consignee & Commercial Data (Only in Logged-In Customer View) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${
                  isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                    isOcean ? 'text-cyan-200' : 'text-[#005f9e]'
                  }`}>
                    <User className="w-3.5 h-3.5" />
                    {tx('Verified Consignee Information')}
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Recipient Name:')} </span>
                      <strong className={isOcean ? 'text-white' : 'text-slate-900'}>{selectedShipment.recipientName || selectedShipment.customerName}</strong>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Direct Phone:')} </span>
                      <strong className={isOcean ? 'text-white' : 'text-slate-900'}>{selectedShipment.recipientPhone || selectedShipment.customerPhone}</strong>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Verified Email:')} </span>
                      <strong className={isOcean ? 'text-white' : 'text-slate-900'}>{selectedShipment.recipientEmail || selectedShipment.customerEmail}</strong>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Delivery Address:')} </span>
                      <span className={isOcean ? 'text-cyan-100' : 'text-slate-700'}>{selectedShipment.destinationPort}, Custom Terminal Berth</span>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    {tx('Commercial Tariff & Invoicing')}
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Freight Charge:')} </span>
                      <strong className="text-emerald-300 font-mono">${selectedShipment.priceUsd.toLocaleString()} USD</strong>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Payment Status:')} </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        selectedShipment.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                      }`}>
                        {tx(selectedShipment.paymentStatus === 'PAID' ? 'Paid' : 'Awaiting payment')}
                      </span>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Admin approval:')} </span>
                      <strong>{tx(selectedShipment.paymentApprovalStatus === 'APPROVED' ? 'Payment approved' : selectedShipment.paymentStatus === 'PAID' ? 'Awaiting admin approval' : 'After successful payment')}</strong>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Payment Reference:')} </span>
                      <span className="font-mono text-cyan-300">{selectedShipment.paymentReference || '—'}</span>
                    </div>
                    <div>
                      <span className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>{tx('Insured Cargo Value:')} </span>
                      <strong className={`font-mono ${isOcean ? 'text-white' : 'text-slate-900'}`}>${selectedShipment.insuranceValueUsd.toLocaleString()} USD</strong>
                    </div>
                    {selectedIsPayer && (
                      <Link
                        to={`/payment?trackingNumber=${encodeURIComponent(selectedShipment.trackingNumber)}`}
                        className="mt-3 inline-flex rounded-lg bg-[#005f9e] px-3 py-2 text-xs font-bold text-white hover:bg-[#004e82]"
                      >
                        {tx(selectedShipment.paymentStatus === 'PAID' ? 'View payment status' : 'Pay shipment charges')}
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Telematics & Milestones */}
              <div className={`p-4 rounded-xl border ${
                isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                  isOcean ? 'text-cyan-200' : 'text-[#005f9e]'
                }`}>
                  <Thermometer className="w-3.5 h-3.5 text-cyan-300" />
                  {tx('Live Cold Chain Sensor Stream')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className={`text-[10px] ${isOcean ? 'text-cyan-200' : 'text-slate-500'}`}>{tx('Reefer Temp')}</span>
                    <p className="font-mono font-bold text-cyan-300 text-sm mt-0.5">{fmtNum(selectedShipment.telemetry.temperatureCelsius, 1, '°C')}</p>
                  </div>
                  <div>
                    <span className={`text-[10px] ${isOcean ? 'text-cyan-200' : 'text-slate-500'}`}>{tx('Cargo Humidity')}</span>
                    <p className="font-mono font-bold text-blue-300 text-sm mt-0.5">{fmtNum(selectedShipment.telemetry.humidityPercent, 1, '%')}</p>
                  </div>
                  <div>
                    <span className={`text-[10px] ${isOcean ? 'text-cyan-200' : 'text-slate-500'}`}>{tx('Nautical Speed')}</span>
                    <p className={`font-mono font-bold text-sm mt-0.5 ${isOcean ? 'text-white' : 'text-slate-900'}`}>{fmtNum(selectedShipment.telemetry.speedKnots, 1)} knots</p>
                  </div>
                  <div>
                    <span className={`text-[10px] ${isOcean ? 'text-cyan-200' : 'text-slate-500'}`}>{tx('Security Seal')}</span>
                    <p className="font-bold text-emerald-300 text-xs mt-1">{tx('Verified Intact')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES & PAYSTACK */}
      {activeTab === 'INVOICES' && (
        <div className={`p-6 rounded-2xl border shadow-lg space-y-4 ${
          isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className={`pb-3 border-b ${isOcean ? 'border-[#006cae]/40' : 'border-slate-200'}`}>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-cyan-300" />
              <span>{tx('Invoices & payment summaries')}</span>
            </h3>
            <p className={`text-xs ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
              {tx('Review shipment charges and payment references. Print or save the invoice summary as PDF.')}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg" role="region" aria-label="Invoice summary table; scroll horizontally on small screens" tabIndex={0}>
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className={`border-b font-bold uppercase tracking-wider text-[11px] ${
                isOcean ? 'bg-[#00385c] text-cyan-200 border-[#005f9e]' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">{tx('Invoice #')}</th>
                  <th className="py-3 px-4">{tx('Tracking Number')}</th>
                  <th className="py-3 px-4">{tx('Paystack Ref')}</th>
                  <th className="py-3 px-4">{tx('Amount')}</th>
                  <th className="py-3 px-4">{tx('Status')}</th>
                  <th className="py-3 px-4 text-right">{tx('Receipt')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isOcean ? 'divide-[#006cae]/30' : 'divide-slate-200'}`}>
                {shipments.map(s => (
                  <tr key={s.id} className={isOcean ? 'hover:bg-[#005f9e]/30' : 'hover:bg-slate-50'}>
                    <td className={`py-3 px-4 font-mono font-bold ${isOcean ? 'text-cyan-200' : 'text-[#005f9e]'}`}>INV-{s.trackingNumber.slice(0, 10)}</td>
                    <td className="py-3 px-4 font-mono">{s.trackingNumber}</td>
                    <td className={`py-3 px-4 font-mono ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>{s.paymentReference || '—'}</td>
                    <td className="py-3 px-4 font-mono font-bold">${s.priceUsd.toLocaleString()} USD</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        s.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                      }`}>
                        {tx(s.paymentStatus === 'PAID' ? 'Paid' : 'Awaiting payment')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        disabled={s.priceUsd <= 0}
                        onClick={() => handleDownloadInvoice(s)}
                        className="px-2.5 py-1 rounded bg-[#005f9e] hover:bg-[#004e82] text-white font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-sm"
                      >
                        <Download className="w-3 h-3" />
                        <span>{s.priceUsd > 0 ? tx('Print / PDF') : tx('Billing restricted')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            {shipments.map(shipment => (
              <div key={shipment.id} className="rounded-xl border border-slate-400/30 p-4">
                <strong className="text-xs font-mono">{shipment.trackingNumber} · {tx('stored commercial invoices')}</strong>
                <ShipmentDocumentsPanel shipmentId={shipment.id} documentTypes={['COMMERCIAL_INVOICE']} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'SHIPMENTS' && selectedShipment && (
        <>
          {selectedCanViewDetails && <ShipmentItemsPanel shipmentId={selectedShipment.id} shipmentStatus={selectedShipment.status} canManage={!!user && selectedShipment.parties.some(p => p.role === 'SHIPPER' && p.canManage && ((p.userId === user.id) || p.email?.toLowerCase() === user.email.toLowerCase()))} onChanged={onReload} />}
          <ShipmentStopHistory shipmentId={selectedShipment.id} />
          <ShipmentPartiesPanel shipment={selectedShipment} />
        </>
      )}

      {/* TAB 3: Shipment documents from the authenticated document API */}
      {activeTab === 'DOCUMENTS' && (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border ${isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="font-bold text-base">{tx('Shipment documents')}</h3>
            <p className={`text-xs mt-1 ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
              {tx('Download active files uploaded by the shipping team and shared with your account.')}
            </p>
          </div>
          {documentShipments.map(shipment => (
            <div key={shipment.id} className={`p-4 rounded-2xl border space-y-3 ${isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <div>
                <strong className="font-mono text-sm">{shipment.trackingNumber}</strong>
                <p className="text-xs opacity-70">{shipment.originPort} → {shipment.destinationPort}</p>
              </div>
              <ShipmentDocumentsPanel shipmentId={shipment.id} />
            </div>
          ))}
          {shipments.length === 0 && <p className="text-sm opacity-70">No shipments are linked to your account yet.</p>}
          {shipments.length > 0 && documentShipments.length === 0 && <p className="text-sm opacity-70">No shipment documents have been shared with this account.</p>}
        </div>
      )}
    </div>
  );
};
