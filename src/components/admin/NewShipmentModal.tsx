import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { ConfigApi, ShipmentsApi, errorMessage } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Port, Shipment, TransportMode } from '../../types/logistics';
import { Translations } from '../../i18n/translations';
import { ui } from '../../utils/ui';

interface Props {
  ports: Port[];
  onClose: () => void;
  onCreated: (s: Shipment) => void;
}

/** Staff form that registers a shipment directly in MySQL via POST /api/shipments. */
export const NewShipmentModal: React.FC<Props> = ({ ports, onClose, onCreated }) => {
  const { isOcean } = useTheme();
  const { t, tx } = useLanguage();
  const c = ui(isOcean);
  const { data: config } = useAsync(() => ConfigApi.get(), []);
  const [f, setF] = useState({
    originPortId: '', destinationPortId: '', transportMode: 'OCEAN' as TransportMode, containerType: '',
    weightKg: '', volumeCbm: '', cargoDescription: '', customerName: '', customerEmail: '', customerPhone: '',
    recipientName: '', recipientEmail: '', recipientPhone: '',
    payerName: '', payerEmail: '', payerPhone: '',
    carrierName: '', vesselOrFlightName: '', containerId: '', departureDate: '', estimatedDeliveryDate: '',
    paymentStatus: 'PENDING', priceUsd: '', addInsurance: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }));
  const modePorts = ports.filter(port => port.transportModes.includes(f.transportMode));
  const countries = [...new Set(modePorts.map(port => port.country))].sort((a, b) => a.localeCompare(b));
  const equipmentOptions = (config?.containerTypes || []).filter(option => option.transportModes.includes(f.transportMode));
  const equipmentLabels: Record<string, keyof Translations> = {
    DRY_20: 'containerDry20',
    DRY_40: 'containerDry40',
    REEFER_20: 'containerReefer20',
    REEFER_40: 'containerReefer40',
    AIR_AKE: 'airUldAke',
    AIR_PMC: 'airPmcPallet',
  };

  useEffect(() => {
    if (!config) return;
    if (!equipmentOptions.some(option => option.id === f.containerType)) {
      set('containerType', equipmentOptions[0]?.id || '');
    }
  }, [config, f.transportMode, f.containerType, equipmentOptions]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const s = await ShipmentsApi.create({
        originPortId: f.originPortId,
        destinationPortId: f.destinationPortId,
        transportMode: f.transportMode,
        containerType: f.containerType,
        weightKg: Number(f.weightKg),
        volumeCbm: Number(f.volumeCbm),
        cargoDescription: f.cargoDescription,
        customerName: f.customerName,
        customerEmail: f.customerEmail,
        customerPhone: f.customerPhone,
        recipientName: f.recipientName || f.customerName,
        recipientEmail: f.recipientEmail || f.customerEmail,
        recipientPhone: f.recipientPhone || f.customerPhone,
        payerName: f.payerName || f.customerName,
        payerEmail: f.payerEmail || f.customerEmail,
        payerPhone: f.payerPhone || f.customerPhone,
        currency: 'USD',
        addInsurance: f.addInsurance,
        carrierName: f.carrierName || undefined,
        vesselOrFlightName: f.vesselOrFlightName || undefined,
        containerId: f.containerId || undefined,
        departureDate: f.departureDate ? new Date(f.departureDate).toISOString() : undefined,
        estimatedDeliveryDate: f.estimatedDeliveryDate ? new Date(f.estimatedDeliveryDate).toISOString() : undefined,
        paymentStatus: f.paymentStatus as 'PENDING' | 'PAID',
        priceUsd: f.priceUsd !== '' ? Number(f.priceUsd) : undefined,
      });
      onCreated(s);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const input = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className={c.label}>{tx(label)}</label>
      <input className={c.field} value={f[k] as string} onChange={e => set(k, e.target.value)} {...props} />
    </div>
  );

  return (
    <div className={c.modalWrap}>
      <form onSubmit={submit} className={c.modal}>
        <h3 className="text-lg font-bold mb-4">{tx('Register new shipment')}</h3>
        {modePorts.length < 2 && <div className={c.error + ' mb-3'}>{modePorts.length === 0 ? t.noModePorts : t.needTwoModePorts}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={c.label}>{t.transportMode}</label>
            <select className={c.field} value={f.transportMode} onChange={e => {
              const mode = e.target.value as TransportMode;
              if (mode === f.transportMode) return;
              set('transportMode', mode);
              set('originPortId', '');
              set('destinationPortId', '');
            }}>
              {['OCEAN', 'AIR', 'ROAD', 'RAIL'].map(mode => <option key={mode} value={mode}>{tx(mode)}</option>)}
            </select>
          </div>
          <div>
            <label className={c.label}>{t.containerEquipmentType}</label>
            <select required className={c.field} value={f.containerType} onChange={e => set('containerType', e.target.value)}>
              <option value="">{t.selectContainerEquipment}</option>
              {equipmentOptions.map(option =>
                <option key={option.id} value={option.id}>{t[equipmentLabels[option.id]] || option.label}</option>
              )}
            </select>
          </div>
          <div>
            <label className={c.label}>{t.originPort}</label>
            <select required className={c.field} value={f.originPortId} onChange={e => set('originPortId', e.target.value)}>
              <option value="">{t.selectOriginPort}</option>
              {countries.map(country => <optgroup key={country} label={country}>
                {modePorts.filter(port => port.country === country).map(port =>
                  <option key={port.id} value={port.id}>{port.name}</option>
                )}
              </optgroup>)}
            </select>
          </div>
          <div>
            <label className={c.label}>{t.destinationPort}</label>
            <select required className={c.field} value={f.destinationPortId} onChange={e => set('destinationPortId', e.target.value)}>
              <option value="">{t.selectDestinationPort}</option>
              {countries.map(country => {
                const countryPorts = modePorts.filter(port => port.country === country && port.id !== f.originPortId);
                return countryPorts.length ? <optgroup key={country} label={country}>
                  {countryPorts.map(port => <option key={port.id} value={port.id}>{port.name}</option>)}
                </optgroup> : null;
              })}
            </select>
          </div>
          {input('customerName', 'Account owner / shipper name', { required: true })}
          {input('customerEmail', 'Shipper email', { required: true, type: 'email' })}
          {input('customerPhone', 'Account owner phone', { required: true })}
          <div className="sm:col-span-2 border-t border-slate-400/30 pt-3">
            <p className="text-xs font-bold mb-2">Delivery recipient (defaults to account owner)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {input('recipientName', 'Recipient name')}
              {input('recipientEmail', 'Recipient email', { type: 'email' })}
              {input('recipientPhone', 'Recipient phone')}
            </div>
          </div>
          <div className="sm:col-span-2 border-t border-slate-400/30 pt-3">
            <p className="text-xs font-bold mb-2">Payer (defaults to shipper)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {input('payerName', 'Payer name')}
              {input('payerEmail', 'Payer email', { type: 'email' })}
              {input('payerPhone', 'Payer phone')}
            </div>
          </div>
          {input('cargoDescription', 'Cargo description', { required: true })}
          {input('weightKg', 'Weight (kg)', { required: true, type: 'number', min: 1, step: 'any' })}
          {input('volumeCbm', 'Volume (CBM)', { required: true, type: 'number', min: 0.1, step: 'any' })}
          {input('carrierName', 'Carrier (optional)')}
          {input('vesselOrFlightName', 'Vessel / flight (optional)')}
          {input('containerId', 'Container ID (auto if empty)')}
          {input('priceUsd', 'Price USD (auto tariff if empty)', { type: 'number', min: 0, step: 'any' })}
          {input('departureDate', 'Departure', { type: 'datetime-local' })}
          {input('estimatedDeliveryDate', 'ETA', { type: 'datetime-local' })}
          <div>
            <label className={c.label}>{tx('Payment status')}</label>
            <select className={c.field} value={f.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}>
              <option value="PENDING">{tx('PENDING')}</option><option value="PAID">{tx('PAID')}</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold pt-6">
            <input type="checkbox" checked={f.addInsurance} onChange={e => set('addInsurance', e.target.checked)} /> {tx('Insured')}
          </label>
        </div>
        {error && <div className={c.error + ' mt-3'}>{error}</div>}
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className={c.btnGhost}>{tx('Cancel')}</button>
          <button type="submit" disabled={busy || ports.length < 2} className={c.btnPrimary}>{busy ? tx('Saving…') : tx('Create shipment')}</button>
        </div>
      </form>
    </div>
  );
};
