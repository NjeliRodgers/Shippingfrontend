import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ShipmentsApi, errorMessage } from '../../api';
import { Shipment } from '../../types/logistics';
import { ui } from '../../utils/ui';

interface Props {
  shipment: Shipment;
  onClose: () => void;
  onSaved: (s: Shipment) => void;
}

/** Records a staff-entered telemetry reading; location coordinates are tagged as MANUAL until a provider reports GPS. */
export const TelemetryModal: React.FC<Props> = ({ shipment, onClose, onSaved }) => {
  const { isOcean } = useTheme();
  const c = ui(isOcean);
  const [f, setF] = useState({
    latitude: String((shipment.currentCoords || shipment.originCoords)[0]), longitude: String((shipment.currentCoords || shipment.originCoords)[1]),
    temperatureCelsius: '', humidityPercent: '', batteryPercent: '', speedKnots: '', headingDegrees: '', sealIntact: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const n = (v: string) => (v === '' ? null : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const s = await ShipmentsApi.addTelemetry(shipment.id, {
        latitude: n(f.latitude), longitude: n(f.longitude),
        temperatureCelsius: n(f.temperatureCelsius), humidityPercent: n(f.humidityPercent),
        batteryPercent: n(f.batteryPercent), speedKnots: n(f.speedKnots), headingDegrees: n(f.headingDegrees),
        containerSealIntact: f.sealIntact,
      });
      onSaved(s);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const fld = (k: keyof typeof f, label: string) => (
    <div>
      <label className={c.label}>{label}</label>
      <input type="number" step="any" className={c.field} value={f[k] as string} onChange={e => setF({ ...f, [k]: e.target.value })} />
    </div>
  );

  return (
    <div className={c.modalWrap}>
      <form onSubmit={submit} className={c.modal}>
        <h3 className="text-lg font-bold">Record telemetry / position</h3>
        <p className={`text-xs mb-4 ${c.muted}`}>{shipment.trackingNumber}. Alert rules are evaluated on save.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fld('latitude', 'Latitude')}{fld('longitude', 'Longitude')}{fld('speedKnots', 'Speed (kts)')}
          {fld('headingDegrees', 'Heading (°)')}{fld('temperatureCelsius', 'Temperature (°C)')}{fld('humidityPercent', 'Humidity (%)')}
          {fld('batteryPercent', 'Battery (%)')}
          <label className="flex items-center gap-2 text-xs font-semibold pt-6">
            <input type="checkbox" checked={f.sealIntact} onChange={e => setF({ ...f, sealIntact: e.target.checked })} /> Seal intact
          </label>
        </div>
        {error && <div className={c.error + ' mt-3'}>{error}</div>}
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className={c.btnGhost}>Cancel</button>
          <button type="submit" disabled={busy} className={c.btnPrimary}>{busy ? 'Saving…' : 'Save reading'}</button>
        </div>
      </form>
    </div>
  );
};
