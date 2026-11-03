const configuredRefreshMs = Number(import.meta.env.VITE_TRACKING_REFRESH_MS);

/** Polling backs the live map when the backend has no push channel. */
export const TRACKING_REFRESH_MS = Number.isFinite(configuredRefreshMs)
  && configuredRefreshMs >= 10_000
  && configuredRefreshMs <= 300_000
  ? configuredRefreshMs
  : 15_000;

export const TRACKING_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
