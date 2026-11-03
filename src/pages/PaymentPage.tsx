import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfigApi, PaymentsApi, errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { PaymentStatus } from '../types/logistics';
import { fmtMoney } from '../utils/format';
import { ui } from '../utils/ui';

export const PaymentPage: React.FC = () => {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { tx } = useLanguage();
  const { isOcean } = useTheme();
  const config = useAsync(() => ConfigApi.get(), []);
  const u = ui(isOcean);
  const [trackingNumber, setTrackingNumber] = useState(params.get('trackingNumber') || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currency, setCurrency] = useState('USD');
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(current => current || user.email);
  }, [user]);

  useEffect(() => {
    const available = config.data?.paystackCurrencies || [];
    if (available.length && !available.includes(currency)) setCurrency(available[0]);
  }, [config.data, currency]);

  const checkStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setChecking(true);
    try {
      const result = await PaymentsApi.status(trackingNumber.trim(), email.trim());
      setPayment(result);
      if (config.data?.paystackCurrencies.includes(result.currency)) setCurrency(result.currency);
    } catch (err) {
      setPayment(null);
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  const startCheckout = async () => {
    setError('');
    setPaying(true);
    try {
      const latest = await PaymentsApi.status(trackingNumber.trim(), email.trim());
      setPayment(latest);
      if (latest.paymentStatus === 'PAID') {
        setError(tx('This shipment has already been paid.'));
        return;
      }
      const result = await PaymentsApi.initialize(trackingNumber.trim(), email.trim(), currency);
      window.location.assign(result.authorizationUrl);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const currencies = config.data?.paystackCurrencies || ['USD'];
  return (
    <div className={`${u.card} max-w-xl mx-auto space-y-5`}>
      <div>
        <h1 className="text-2xl font-extrabold">{tx('Pay shipment charges')}</h1>
        <p className={u.muted}>{tx('Enter the shipment tracking number and designated payer email to pay or check payment status.')}</p>
      </div>

      <form onSubmit={checkStatus} className="space-y-4">
        <label className="block text-sm font-semibold">
          {tx('Tracking number')}
          <input required value={trackingNumber} onChange={event => { setTrackingNumber(event.target.value); setPayment(null); }} className={`${u.field} mt-1`} />
        </label>
        <label className="block text-sm font-semibold">
          {tx('Payer email')}
          <input required type="email" value={email} onChange={event => { setEmail(event.target.value); setPayment(null); }} className={`${u.field} mt-1`} />
        </label>
        <button type="submit" disabled={checking || !trackingNumber || !email} className={`${u.btnPrimary} disabled:opacity-50`}>
          {checking ? tx('Checking…') : tx('Check payment status')}
        </button>
      </form>

      {payment && (
        <div className={`rounded-xl border p-4 space-y-3 ${isOcean ? 'border-[#006cae] bg-[#00385c]' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex justify-between gap-4 text-sm">
            <span>{tx('Shipment total, including applicable charges')}</span>
            <strong>{fmtMoney(payment.priceUsd, 'USD')}</strong>
          </div>
          <div className="text-sm">{tx('Admin approval')}: <strong>{tx(payment.paymentApprovalStatus === 'APPROVED' ? 'Payment approved' : payment.paymentStatus === 'PAID' ? 'Awaiting admin approval' : 'After successful payment')}</strong></div>
          <div className="text-sm">{tx('Payment status')}: <strong>{tx(payment.paymentStatus)}</strong></div>
          {payment.paymentStatus === 'PAID' && <p className="text-emerald-500 font-semibold">{tx('This shipment has already been paid.')}</p>}
          {payment.paymentStatus !== 'PAID' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold">
                {tx('Payment currency')}
                <select value={currency} onChange={event => setCurrency(event.target.value)} className={`${u.field} mt-1`}>
                  {currencies.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <p className={u.muted}>{tx('Paystack securely presents the payment methods enabled for this merchant account and payer region. Apple Pay availability depends on those settings. Admin approval happens after successful payment.')}</p>
              <button type="button" onClick={() => void startCheckout()} disabled={paying || !config.data?.paystackEnabled} className={`${u.btnPrimary} disabled:opacity-50`}>
                {paying ? tx('Opening secure checkout…') : tx('Continue')}
              </button>
              {config.loading && <p className={u.muted}>{tx('Loading payment settings…')}</p>}
              {config.error && <p role="alert" className="text-rose-500 text-sm">{tx('Could not load payment settings:')} {config.error}</p>}
              {!config.loading && config.data && !config.data.paystackEnabled && <p className="text-rose-500 text-sm">{tx('Online payment is not configured.')}</p>}
            </div>
          )}
        </div>
      )}

      {error && <div role="alert" className={u.error}>{error}</div>}
    </div>
  );
};
