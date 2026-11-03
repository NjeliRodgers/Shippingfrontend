import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ConfigApi, PaymentsApi, ShipmentsApi, errorMessage } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { usePorts } from '../../hooks/usePorts';
import { BookingResult, Quote, Shipment, TransportMode } from '../../types/logistics';
import { Translations } from '../../i18n/translations';
import { fmtMoney } from '../../utils/format';
import { CreditCard, Ship, Plane, Truck, Train, ArrowRight, CheckCircle2, Lock, Receipt, AlertCircle } from 'lucide-react';

interface BookingItemDraft {
  itemReference: string;
  description: string;
  quantity: string;
  unitOfMeasure: string;
  unitWeightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  isFragile: boolean;
  isHazardous: boolean;
}

function newBookingItem(number: number): BookingItemDraft {
  return {
    itemReference: `ITEM-${String(number).padStart(2, '0')}`,
    description: '',
    quantity: '1',
    unitOfMeasure: 'unit',
    unitWeightKg: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    isFragile: false,
    isHazardous: false,
  };
}

interface Props {
  onShipmentCreated: (s: Shipment) => void;
  onNavigateToTracking: (trackingNumber: string) => void;
}

const MODE_ICONS: Record<TransportMode, React.ReactNode> = {
  OCEAN: <Ship className="w-4 h-4" />,
  AIR: <Plane className="w-4 h-4" />,
  ROAD: <Truck className="w-4 h-4" />,
  RAIL: <Train className="w-4 h-4" />,
};

const EQUIPMENT_LABELS: Record<string, keyof Translations> = {
  DRY_20: 'containerDry20',
  DRY_40: 'containerDry40',
  REEFER_20: 'containerReefer20',
  REEFER_40: 'containerReefer40',
  AIR_AKE: 'airUldAke',
  AIR_PMC: 'airPmcPallet',
};

export const FreightBookingPaystack: React.FC<Props> = ({ onShipmentCreated, onNavigateToTracking }) => {
  const { isOcean } = useTheme();
  const { t, tx } = useLanguage();
  const { user } = useAuth();
  const { data: config } = useAsync(() => ConfigApi.get(), []);
  const { ports, loading: portsLoading } = usePorts();

  const [originPortId, setOriginPortId] = useState('');
  const [destinationPortId, setDestinationPortId] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('OCEAN');
  const [containerType, setContainerType] = useState('');
  const [items, setItems] = useState<BookingItemDraft[]>([newBookingItem(1)]);
  const [volumeCbm, setVolumeCbm] = useState('');
  const modePorts = ports.filter(port => port.transportModes.includes(transportMode));
  const countries = [...new Set(modePorts.map(port => port.country))].sort((a, b) => a.localeCompare(b));
  const equipmentOptions = (config?.containerTypes || []).filter(option => option.transportModes.includes(transportMode));

  const weightKg = items.reduce(
    (total, item) => total + Number(item.quantity || 0) * Number(item.unitWeightKg || 0),
    0
  );

  const cargoDescription = items
    .filter(item => item.description.trim())
    .map(item => `${item.quantity} ${item.unitOfMeasure}: ${item.description.trim()}`)
    .join('; ');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientSameAsShipper, setRecipientSameAsShipper] = useState(true);
  const [payerSameAsShipper, setPayerSameAsShipper] = useState(true);
  const [payerName, setPayerName] = useState(user?.name || '');
  const [payerEmail, setPayerEmail] = useState(user?.email || '');
  const [payerPhone, setPayerPhone] = useState(user?.phone || '');
  const [currency, setCurrency] = useState('USD');
  const [addInsurance, setAddInsurance] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentStarting, setPaymentStarting] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);

  // prefill from account when it loads
  useEffect(() => {
    if (user) {
      setCustomerName(v => v || user.name);
      setCustomerEmail(v => v || user.email);
      setCustomerPhone(v => v || user.phone || '');
      setPayerName(v => v || user.name);
      setPayerEmail(v => v || user.email);
      setPayerPhone(v => v || user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (!config) return;
    if (!equipmentOptions.some(option => option.id === containerType)) {
      setContainerType(equipmentOptions[0]?.id || '');
    }
  }, [config, transportMode, containerType, equipmentOptions]);

  // live server-side quote
  useEffect(() => {
    let cancelled = false;
    setQuoteError('');
    // Only quote once the user has chosen a route and entered the cargo weight.
    if (!originPortId || !destinationPortId || !(Number(weightKg) > 0)) {
      setQuote(null);
      return;
    }
    ConfigApi.quote({ transportMode, containerType, addInsurance, currency })
      .then(q => !cancelled && setQuote(q))
      .catch(e => {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [originPortId, destinationPortId, weightKg, transportMode, containerType, addInsurance, currency]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await ShipmentsApi.book({
        originPortId,
        destinationPortId,
        transportMode,
        containerType,
        weightKg,
        volumeCbm: Number(volumeCbm),
        cargoDescription,
        items: items.map(item => ({
          itemReference: item.itemReference.trim(),
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitOfMeasure: item.unitOfMeasure.trim() || 'unit',
          unitWeightKg: Number(item.unitWeightKg),
          lengthCm: item.lengthCm ? Number(item.lengthCm) : null,
          widthCm: item.widthCm ? Number(item.widthCm) : null,
          heightCm: item.heightCm ? Number(item.heightCm) : null,
          currency,
          isFragile: item.isFragile,
          isHazardous: item.isHazardous,
        })),
        customerName,
        customerEmail,
        customerPhone,
        recipientName: recipientSameAsShipper ? customerName : recipientName,
        recipientEmail: recipientSameAsShipper ? customerEmail : recipientEmail,
        recipientPhone: recipientSameAsShipper ? customerPhone : recipientPhone,
        payerName: payerSameAsShipper ? customerName : payerName,
        payerEmail: payerSameAsShipper ? customerEmail : payerEmail,
        payerPhone: payerSameAsShipper ? customerPhone : payerPhone,
        currency,
        addInsurance,
      });
      onShipmentCreated(res.shipment);
      setResult(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const payForShipment = async (shipment: Shipment) => {
    setPaymentStarting(true);
    setPaymentError('');
    try {
      const email = payerSameAsShipper ? customerEmail : payerEmail;
      const payment = await PaymentsApi.initialize(shipment.trackingNumber, email.trim(), currency);
      window.location.assign(payment.authorizationUrl);
    } catch (err) {
      setPaymentError(errorMessage(err));
    } finally {
      setPaymentStarting(false);
    }
  };

  const paystackCurrencyOk = !!config?.paystackEnabled && config.paystackCurrencies.includes(currency);

  const card = `p-6 rounded-2xl border shadow-lg ${isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'}`;
  const labelCls = `block text-xs font-semibold mb-1 ${isOcean ? 'text-cyan-200' : 'text-slate-600'}`;
  const fieldCls = `w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
    isOcean ? 'bg-[#003152] border-[#006cae] text-white placeholder:text-cyan-200/50' : 'bg-slate-50 border-slate-300 text-slate-900'
  }`;
  const muted = isOcean ? 'text-cyan-100' : 'text-slate-600';

  if (result) {
    const s = result.shipment;
    return (
      <div className={`${card} max-w-2xl mx-auto text-center space-y-4`}>
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-2xl font-extrabold">{tx('Booking registered')}</h2>
        <p className={`text-sm ${muted}`}>{tx('Your tracking number (keep it safe):')}</p>
        <div className="font-mono text-2xl font-extrabold text-cyan-300 break-all">{s.trackingNumber}</div>
        <div className={`text-sm ${muted}`}>
          {tx('Freight total:')} <strong>{fmtMoney(s.priceUsd, 'USD')}</strong> — {tx('payment status')} <strong>{tx(s.paymentStatus)}</strong>
        </div>
        {result.paymentError && (
          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {tx('Online payment could not be started:')} {result.paymentError}. {tx('Our team will send you an invoice.')}
          </div>
        )}
        <div className={`text-xs ${muted}`}>
          {tx('You can pay now through Paystack. Admin approval happens after Paystack verifies successful payment and does not block checkout.')}
        </div>
        {paymentError && <div role="alert" className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs">{paymentError}</div>}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {s.paymentStatus !== 'PAID' && paystackCurrencyOk && (
            <button
              type="button"
              onClick={() => void payForShipment(s)}
              disabled={paymentStarting}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white cursor-pointer flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {paymentStarting ? tx('Opening secure checkout…') : tx('Pay now with Paystack')}
            </button>
          )}
          <button onClick={() => onNavigateToTracking(s.trackingNumber)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-[#005f9e] hover:bg-[#004e82] text-white cursor-pointer flex items-center gap-2">
            {tx('Track this shipment')} <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => setResult(null)} className={`px-5 py-2.5 rounded-xl font-bold text-sm border cursor-pointer ${isOcean ? 'border-[#005f9e] text-cyan-200' : 'border-slate-300 text-slate-700'}`}>
            {tx('Book another')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`${card} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00c3f7]/20 text-[#00c3f7] border border-[#00c3f7]/30 inline-flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> {config?.paystackEnabled ? tx('PAYSTACK CHECKOUT ENABLED') : tx('INVOICE BOOKING')}
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1">{t.newBooking}</h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${muted}`}>
            {tx('Get an instant tariff estimate. Payment becomes available after admin approval.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(config?.currencies || ['USD']).map(cur => (
            <button key={cur} type="button" onClick={() => setCurrency(cur)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                currency === cur ? 'bg-[#005f9e] text-white border border-white/60' : isOcean ? 'bg-[#00385c] text-cyan-200' : 'bg-slate-100 text-slate-700'
              }`}>{cur}</button>
          ))}
        </div>
      </div>

      {!portsLoading && modePorts.length < 2 && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{modePorts.length === 0 ? t.noModePorts : t.needTwoModePorts}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={submit} className={`lg:col-span-2 ${card} space-y-5`}>
          <nav aria-label={tx('Booking steps')} className={`flex flex-wrap gap-2 pb-4 border-b ${isOcean ? 'border-[#006cae]/40' : 'border-slate-200'}`}>
            {[['booking-route', '1. Route'], ['booking-products', '2. Products'], ['booking-people', '3. People'], ['booking-review', '4. Quote & payment']].map(([id, label]) => <a key={id} href={`#${id}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${isOcean ? 'border-[#005f9e] bg-[#00385c] text-cyan-100 hover:bg-[#004d7c]' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-cyan-50 hover:text-[#005f9e]'}`}>{tx(label)}</a>)}
          </nav>
          <h3 id="booking-route" className="font-bold text-base flex items-center gap-2 scroll-mt-28"><Ship className="w-5 h-5 text-cyan-300" /> 1. {tx('Route & cargo')}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t.transportMode}</label>
              <div className="grid grid-cols-4 gap-2">
                {(config?.transportModes || ['OCEAN', 'AIR', 'ROAD', 'RAIL']).map(m => (
                  <button key={m} type="button" onClick={() => {
                    if (m === transportMode) return;
                    setTransportMode(m);
                    setOriginPortId('');
                    setDestinationPortId('');
                  }} title={tx(m)}
                    className={`py-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer ${
                      transportMode === m ? 'bg-[#005f9e] text-white border-white/60' : isOcean ? 'bg-[#00385c] border-[#005f9e] text-cyan-200' : 'bg-slate-50 border-slate-300 text-slate-700'
                    }`}>
                    {MODE_ICONS[m]}{tx(m)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>{t.containerEquipmentType}</label>
              <select required value={containerType} onChange={e => setContainerType(e.target.value)} className={fieldCls}>
                <option value="">{t.selectContainerEquipment}</option>
                {equipmentOptions.map(option => <option key={option.id} value={option.id}>
                  {t[EQUIPMENT_LABELS[option.id]] || option.label}
                </option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t.originPort}</label>
              <select required value={originPortId} onChange={e => setOriginPortId(e.target.value)} className={fieldCls}>
                <option value="">{t.selectOriginPort}</option>
                {countries.map(country => <optgroup key={country} label={country}>
                  {modePorts.filter(port => port.country === country).map(port =>
                    <option key={port.id} value={port.id}>{port.name}</option>
                  )}
                </optgroup>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.destinationPort}</label>
              <select required value={destinationPortId} onChange={e => setDestinationPortId(e.target.value)} className={fieldCls}>
                <option value="">{t.selectDestinationPort}</option>
                {countries.map(country => {
                  const countryPorts = modePorts.filter(port => port.country === country && port.id !== originPortId);
                  return countryPorts.length ? <optgroup key={country} label={country}>
                    {countryPorts.map(port => <option key={port.id} value={port.id}>{port.name}</option>)}
                  </optgroup> : null;
                })}
              </select>
            </div>
          </div>

          <div id="booking-products" className="space-y-3 scroll-mt-28">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm">{tx('2. Products in this shipment')}</h3>
                <p className={`text-xs ${muted}`}>
                  {tx('Add one row for each product type. Gross weight is calculated from quantity × unit weight.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setItems(current => [...current, newBookingItem(current.length + 1)])}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-[#005f9e] text-white"
              >
                {tx('Add product')}
              </button>
            </div>

            {items.map((item, index) => (
              <div key={item.itemReference} className="p-3 rounded-xl border border-slate-400/30 space-y-3">
                <div className="flex justify-between items-center">
                  <strong className="text-xs">{item.itemReference}</strong>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems(current => current.filter((_, i) => i !== index))}
                      className="text-xs text-rose-400"
                    >
                      {tx('Remove')}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    required
                    value={item.itemReference}
                    onChange={e => setItems(current => current.map((row, i) =>
                      i === index ? { ...row, itemReference: e.target.value } : row
                    ))}
                    className={fieldCls}
                    placeholder={tx('Item reference')}
                  />
                  <input
                    required
                    value={item.description}
                    onChange={e => setItems(current => current.map((row, i) =>
                      i === index ? { ...row, description: e.target.value } : row
                    ))}
                    className={fieldCls}
                    placeholder={tx('Product description')}
                  />
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={e => setItems(current => current.map((row, i) =>
                      i === index ? { ...row, quantity: e.target.value } : row
                    ))}
                    className={fieldCls}
                    placeholder={tx('Quantity')}
                  />
                  <input
                    value={item.unitOfMeasure}
                    onChange={e => setItems(current => current.map((row, i) =>
                      i === index ? { ...row, unitOfMeasure: e.target.value } : row
                    ))}
                    className={fieldCls}
                    placeholder={tx('Unit (carton, box, pallet...)')}
                  />
                  <input
                    required
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.unitWeightKg}
                    onChange={e => setItems(current => current.map((row, i) =>
                      i === index ? { ...row, unitWeightKg: e.target.value } : row
                    ))}
                    className={fieldCls}
                    placeholder={tx('Weight per unit (kg)')}
                  />
                  <div className="grid grid-cols-2 min-[420px]:grid-cols-3 gap-2">
                    {(['lengthCm', 'widthCm', 'heightCm'] as const).map((dimension, dimensionIndex) => (
                      <input
                        key={dimension}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item[dimension]}
                        onChange={e => setItems(current => current.map((row, i) =>
                          i === index ? { ...row, [dimension]: e.target.value } : row
                        ))}
                        className={fieldCls}
                        placeholder={tx(['L cm', 'W cm', 'H cm'][dimensionIndex])}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={item.isFragile}
                      onChange={e => setItems(current => current.map((row, i) =>
                        i === index ? { ...row, isFragile: e.target.checked } : row
                      ))}
                    />
                    {tx('Fragile')}
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={item.isHazardous}
                      onChange={e => setItems(current => current.map((row, i) =>
                        i === index ? { ...row, isHazardous: e.target.checked } : row
                      ))}
                    />
                    {tx('Hazardous goods')}
                  </label>
                </div>
              </div>
            ))}

            <div className={`text-xs font-semibold ${muted}`}>
              {tx('Calculated gross weight:')} {weightKg.toFixed(3)} kg
            </div>
          </div>

          <div>
            <label className={labelCls}>{tx('Total shipment volume (CBM)')}</label>
            <input
              required
              type="number"
              min="0.001"
              step="any"
              value={volumeCbm}
              onChange={e => setVolumeCbm(e.target.value)}
              className={fieldCls}
            />
          </div>


          <div id="booking-people" className="space-y-4 pt-2 scroll-mt-28">
            <h3 className="font-bold text-base flex items-center gap-2"><Receipt className="w-5 h-5 text-cyan-300" /> {tx('3. People involved')}</h3>
            <p className={`text-xs ${muted}`}>{tx('Tell us who is sending, receiving, and paying for this shipment. You can use the same contact for all three.')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className={labelCls}>{tx('Shipper / account owner')}</label><input required value={customerName} onChange={e => setCustomerName(e.target.value)} className={fieldCls} /></div>
              <div><label className={labelCls}>{tx('Shipper email')}</label><input required type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className={fieldCls} /></div>
              <div><label className={labelCls}>{tx('Shipper phone')}</label><input required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className={fieldCls} /></div>
            </div>
            <label className="flex items-start gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" checked={recipientSameAsShipper} onChange={e => setRecipientSameAsShipper(e.target.checked)} className="mt-0.5" />
              <span><strong>{tx('Recipient is the same as the shipper')}</strong><span className={`block ${muted}`}>{tx('Uncheck this if someone else will receive the goods.')}</span></span>
            </label>
            {!recipientSameAsShipper && <div className="space-y-2">
              <h4 className="font-semibold text-sm">{tx('Delivery recipient')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className={labelCls}>{tx('Recipient name')}</label><input required value={recipientName} onChange={e => setRecipientName(e.target.value)} className={fieldCls} /></div>
                <div><label className={labelCls}>{tx('Recipient email')}</label><input required type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} className={fieldCls} /></div>
                <div><label className={labelCls}>{tx('Recipient phone')}</label><input required value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className={fieldCls} /></div>
              </div>
            </div>}
            <label className="flex items-start gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" checked={payerSameAsShipper} onChange={e => setPayerSameAsShipper(e.target.checked)} className="mt-0.5" />
              <span><strong>{tx('Shipper will pay')}</strong><span className={`block ${muted}`}>{tx('Uncheck this if another person or company is paying.')}</span></span>
            </label>
            {!payerSameAsShipper && <div className="space-y-2">
              <h4 className="font-semibold text-sm">{tx('Payer')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className={labelCls}>{tx('Payer name')}</label><input required value={payerName} onChange={e => setPayerName(e.target.value)} className={fieldCls} /></div>
                <div><label className={labelCls}>{tx('Payer email')}</label><input required type="email" value={payerEmail} onChange={e => setPayerEmail(e.target.value)} className={fieldCls} /></div>
                <div><label className={labelCls}>{tx('Payer phone')}</label><input value={payerPhone} onChange={e => setPayerPhone(e.target.value)} className={fieldCls} /></div>
              </div>
            </div>}
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={addInsurance} onChange={e => setAddInsurance(e.target.checked)} />
            {tx('Add cargo insurance')}
          </label>

          <div className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-cyan-50 border-cyan-200'}`} aria-live="polite">
            <div><strong className="text-sm">{tx('Estimated total')}</strong><p className={`text-xs ${muted}`}>{quote ? tx('Server-calculated quote') : tx('Choose the route and add product weight to see your price.')}</p></div>
            <strong className="text-lg font-mono">{quote ? fmtMoney(quote.totalAmount, quote.currency) : '—'}</strong>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button type="submit" disabled={submitting || ports.length < 2}
            className="w-full py-3 rounded-xl font-bold text-sm bg-[#f05a36] hover:bg-[#d94a28] disabled:opacity-50 text-white shadow-md cursor-pointer flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            {submitting ? tx('Processing…') : tx('Book shipment for review')}
          </button>
        </form>

        <div id="booking-review" className="h-fit space-y-4 scroll-mt-28 rounded-2xl border border-[#004f83] bg-[#005f9e] p-6 text-white shadow-lg">
          <h3 className="font-bold text-base">{tx('4. Quote & payment')}</h3>
          <p className="text-xs text-blue-100">{tx('The price updates when you choose a route and cargo. Review it before confirming.')}</p>
          {quote ? (
            <div className="space-y-2 text-sm">
              <Row label={tx('Base freight')} value={fmtMoney(quote.baseUsd * quote.fxRate, quote.currency)} />
              <Row label={tx('Insurance')} value={fmtMoney(quote.insuranceUsd * quote.fxRate, quote.currency)} />
              <Row label={tx('Fuel / bunker adj.')} value={fmtMoney(quote.fuelAdjustmentUsd * quote.fxRate, quote.currency)} />
              <div className="pt-3 border-t border-white/25 flex justify-between font-extrabold text-lg">
                <span>{tx('Total')}</span><span className="text-emerald-300">{fmtMoney(quote.totalAmount, quote.currency)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-blue-100">
              {quoteError || tx('Choose the origin, destination and cargo weight to see a quote.')}
            </p>
          )}

          <div className="space-y-2 pt-2 text-xs">
            <p className="font-bold">{tx('Pay immediately or later')}</p>
            <p className="text-blue-100">{tx('Checkout is available as soon as the shipment is booked. Admin approval is an internal step after Paystack confirms payment.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between"><span className="opacity-80">{label}</span><span className="font-mono">{value}</span></div>
);
