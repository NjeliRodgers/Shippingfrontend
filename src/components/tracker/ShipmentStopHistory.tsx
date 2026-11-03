import React, { useCallback, useEffect, useState } from 'react';
import { ShipmentStop } from '../../types/logistics';
import { ShipmentStopsApi, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  shipmentId: string;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale);
}

function formatDuration(seconds: number, tx: (text: string) => string): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}${tx('h')} ${minutes}${tx('m')}`;
  return `${minutes}${tx('m')}`;
}

export const ShipmentStopHistory: React.FC<Props> = ({ shipmentId }) => {
  const { isAuthenticated, isStaff } = useAuth();
  const { isOcean } = useTheme();
  const { language, tx } = useLanguage();
  const locale = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', zh: 'zh-CN', ar: 'ar' }[language];

  const [stops, setStops] = useState<ShipmentStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const loadStops = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      setStops(await ShipmentStopsApi.list(shipmentId));
    } catch (err) {
      setError(tx(errorMessage(err)));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, shipmentId]);

  useEffect(() => {
    void loadStops();

    const timer = window.setInterval(() => {
      void loadStops();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [loadStops]);

  const createStop = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await ShipmentStopsApi.create(shipmentId, {
        locationName,
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      setLocationName('');
      setLatitude('');
      setLongitude('');
      await loadStops();
    } catch (err) {
      setError(tx(errorMessage(err)));
    } finally {
      setSaving(false);
    }
  };

  const closeStop = async (stopId: string) => {
    setError('');
    try {
      await ShipmentStopsApi.depart(shipmentId, stopId);
      await loadStops();
    } catch (err) {
      setError(tx(errorMessage(err)));
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="p-5 rounded-2xl border bg-slate-50 border-slate-200 text-slate-700">
        {tx('Sign in to view the shipment stop history.')}
      </section>
    );
  }

  return (
    <section className={`p-5 rounded-2xl border space-y-4 ${
      isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">{tx('Stops & time at location')}</h3>
          <p className={`text-xs mt-1 ${isOcean ? 'text-cyan-100' : 'text-slate-500'}`}>
            {tx('Arrival, departure, and recorded dwell time')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadStops()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#005f9e] text-white"
        >
          {tx('Refresh')}
        </button>
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {isStaff && (
        <form onSubmit={createStop} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            required
            value={locationName}
            onChange={event => setLocationName(event.target.value)}
            placeholder={tx('Location name')}
            className="px-3 py-2 rounded-lg border text-sm text-slate-900"
          />
          <input
            required
            type="number"
            step="any"
            min="-90"
            max="90"
            value={latitude}
            onChange={event => setLatitude(event.target.value)}
            placeholder={tx('Latitude')}
            className="px-3 py-2 rounded-lg border text-sm text-slate-900"
          />
          <input
            required
            type="number"
            step="any"
            min="-180"
            max="180"
            value={longitude}
            onChange={event => setLongitude(event.target.value)}
            placeholder={tx('Longitude')}
            className="px-3 py-2 rounded-lg border text-sm text-slate-900"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 rounded-lg text-sm font-bold bg-[#f05a36] text-white disabled:opacity-50"
          >
            {saving ? tx('Saving…') : tx('Record stop')}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm opacity-70">{tx('Loading stops…')}</p>
      ) : stops.length === 0 ? (
        <p className="text-sm opacity-70">{tx('No stops recorded for this shipment yet.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg" role="region" aria-label={tx('Shipment stop history; scroll horizontally on small screens')} tabIndex={0}>
          <table className="w-full min-w-[580px] text-left text-xs">
            <thead>
              <tr className={isOcean ? 'text-cyan-200' : 'text-slate-500'}>
                <th className="py-2 pr-4">{tx('Location')}</th>
                <th className="py-2 pr-4">{tx('Arrival')}</th>
                <th className="py-2 pr-4">{tx('Departure')}</th>
                <th className="py-2 pr-4">{tx('Time stopped')}</th>
                <th className="py-2 pr-4">{tx('Source')}</th>
                {isStaff && <th className="py-2 text-right">{tx('Action')}</th>}
              </tr>
            </thead>
            <tbody>
              {stops.map(stop => {
                const elapsed = stop.durationSeconds ??
                  Math.max(0, Math.floor((Date.now() - new Date(stop.arrivedAt).getTime()) / 1000));

                return (
                  <tr key={stop.id} className="border-t border-slate-300/30">
                    <td className="py-3 pr-4">
                      <strong>{stop.locationName}</strong>
                      <span className="block opacity-70">
                        {stop.latitude}, {stop.longitude}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{formatDate(stop.arrivedAt, locale)}</td>
                    <td className="py-3 pr-4">
                      {stop.departedAt ? formatDate(stop.departedAt, locale) : tx('Stopped now')}
                    </td>
                    <td className="py-3 pr-4">
                      {stop.durationSeconds === null
                        ? `${tx('Ongoing')} · ${formatDuration(elapsed, tx)}`
                        : formatDuration(stop.durationSeconds, tx)}
                    </td>
                    <td className="py-3 pr-4">{tx(stop.source)}</td>
                    {isStaff && (
                      <td className="py-3 text-right">
                        {!stop.departedAt && (
                          <button
                            type="button"
                            onClick={() => void closeStop(stop.id)}
                            className="px-2 py-1 rounded bg-[#005f9e] text-white"
                          >
                            {tx('Record departure')}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};