import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage, PublicMapApi, PublicMapPayload } from '../api';
import { TRACKING_REFRESH_MS } from '../config/tracking';

export type PublicMapStatus = 'idle' | 'loading' | 'ready' | 'retrying' | 'error';

export function usePublicShipmentMap(trackingNumber?: string | null) {
  const [data, setData] = useState<PublicMapPayload | null>(null);
  const [status, setStatus] = useState<PublicMapStatus>('idle');
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [justUpdated, setJustUpdated] = useState(false);
  const etag = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const retryCount = useRef(0);
  const retryable = useRef(true);
  const timer = useRef<number | null>(null);
  const updatedTimer = useRef<number | null>(null);
  const activeReference = useRef('');
  const dataRef = useRef<PublicMapPayload | null>(null);

  const refreshNow = useCallback(async () => {
    const ref = trackingNumber?.trim();
    if (!ref || document.visibilityState === 'hidden') return;

    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    activeReference.current = ref;
    const previousEtag = etag.current;
    if (!dataRef.current) setStatus('loading');

    try {
      const version = await PublicMapApi.getVersion(ref, requestController.signal);
      if (requestController.signal.aborted || activeReference.current !== ref) return;
      if (previousEtag && version.etag === previousEtag) {
        setLastCheckedAt(new Date());
        setError('');
        setStatus('ready');
        retryCount.current = 0;
        retryable.current = true;
        return;
      }

      const next = await PublicMapApi.getMap(ref, requestController.signal);
      if (requestController.signal.aborted || activeReference.current !== ref) return;
      const changed = !!previousEtag && next.etag !== previousEtag;
      etag.current = next.etag;
      dataRef.current = next;
      setData(next);
      setLastCheckedAt(new Date());
      setError('');
      setStatus('ready');
      retryCount.current = 0;
      retryable.current = true;
      if (changed) {
        setJustUpdated(true);
        if (updatedTimer.current !== null) window.clearTimeout(updatedTimer.current);
        updatedTimer.current = window.setTimeout(() => setJustUpdated(false), 3000);
      }
    } catch (err) {
      if (requestController.signal.aborted || activeReference.current !== ref) return;
      retryCount.current = Math.min(retryCount.current + 1, 4);
      setError(errorMessage(err));
      retryable.current = !(err instanceof ApiError && err.status !== 429 && err.status !== 0);
      setStatus(retryable.current ? 'retrying' : 'error');
    }
  }, [trackingNumber]);

  useEffect(() => {
    const ref = trackingNumber?.trim() || '';
    activeReference.current = ref;
    controller.current?.abort();
    controller.current = null;
    etag.current = null;
    dataRef.current = null;
    retryCount.current = 0;
    retryable.current = true;
    setData(null);
    setError('');
    setLastCheckedAt(null);
    setJustUpdated(false);
    setStatus(ref ? 'loading' : 'idle');
    if (!ref) return;

    const schedule = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (document.visibilityState === 'hidden' || !retryable.current) return;
      const delay = retryCount.current
        ? Math.min(15_000 * (2 ** (retryCount.current - 1)), 120_000)
        : TRACKING_REFRESH_MS;
      timer.current = window.setTimeout(async () => {
        await refreshNow();
        schedule();
      }, delay);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshNow().finally(schedule);
      } else if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };

    void refreshNow().finally(schedule);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (updatedTimer.current !== null) window.clearTimeout(updatedTimer.current);
      controller.current?.abort();
      activeReference.current = '';
    };
  }, [trackingNumber, refreshNow]);

  return { data, status, lastCheckedAt, error, refreshNow, justUpdated };
}
