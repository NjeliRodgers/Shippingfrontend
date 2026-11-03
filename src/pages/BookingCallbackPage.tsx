import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PaymentsApi, errorMessage } from '../api';
import { useTheme } from '../context/ThemeContext';
import { ui } from '../utils/ui';
import { useLanguage } from '../context/LanguageContext';

/** Paystack redirects here (…/booking/callback?reference=…). We ask the backend to verify and settle. */
export const BookingCallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || '';
  const { isOcean } = useTheme();
  const { tx } = useLanguage();
  const u = ui(isOcean);
  const [state, setState] = useState<'loading' | 'ok' | 'pending' | 'error'>('loading');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!reference) { setState('error'); setMsg('No payment reference was supplied.'); return; }
    PaymentsApi.verify(reference)
      .then(r => { setTrackingNumber(r.trackingNumber || ''); setState(r.verified ? 'ok' : 'pending'); setMsg(r.status); })
      .catch(e => { setState('error'); setMsg(errorMessage(e)); });
  }, [reference]);

  return (
    <div className={`${u.card} max-w-xl mx-auto text-center space-y-4`}>
      {state === 'loading' && <p>{tx('Verifying your payment…')}</p>}
      {state === 'ok' && <>
        <h2 className="text-2xl font-extrabold">{tx('Payment confirmed')}</h2>
        <p className={u.muted}>{tx('Your booking is paid.')} {trackingNumber && <>{tx('Tracking number')}: <strong className="font-mono">{trackingNumber}</strong></>}</p>
      </>}
      {state === 'pending' && <>
        <h2 className="text-2xl font-extrabold">{tx('Payment not completed')}</h2>
        <p className={u.muted}>{tx('Status')}: {msg}. {tx('If you were charged, it will update automatically once Paystack confirms.')}</p>
      </>}
      {state === 'error' && <><h2 className="text-2xl font-extrabold">{tx('Could not verify payment')}</h2><div className={u.error}>{msg}</div></>}
      <div className="flex justify-center gap-3">
        {trackingNumber && <Link to={`/track/${trackingNumber}`} className={u.btnPrimary}>{tx('Track shipment')}</Link>}
        <Link to="/booking" className={u.btnGhost}>{tx('Back to booking')}</Link>
        {trackingNumber && state !== 'ok' && <Link to={`/payment?trackingNumber=${encodeURIComponent(trackingNumber)}`} className={u.btnGhost}>{tx('Retry payment')}</Link>}
      </div>
    </div>
  );
};
