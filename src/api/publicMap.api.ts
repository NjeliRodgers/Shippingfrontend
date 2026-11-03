import { request } from './client';

export type PublicMapPayload = {
  trackingNumber: string;
  version: number;
  etag: string;
  status: string;
  isDelayed: boolean;
  progressPercent: number;
  estimatedDeliveryDate: string | null;
  origin: { name: string; country: string; latitude: number; longitude: number };
  destination: { name: string; country: string; latitude: number; longitude: number };
  current: {
    latitude: number;
    longitude: number;
    name: string;
    source: string;
    sourceLabel: string;
    updatedAt: string;
    version: number;
  } | null;
  trail: Array<{ latitude: number; longitude: number; name: string; recordedAt: string }>;
  serverTime: string;
};

export const PublicMapApi = {
  getMap: (ref: string, signal?: AbortSignal) => request<PublicMapPayload>(`/public/track/${encodeURIComponent(ref.trim())}/map`, { auth: false, signal }),
  getVersion: (ref: string, signal?: AbortSignal) => request<{ version: number; status: string; updatedAt: string; etag: string }>(`/public/track/${encodeURIComponent(ref.trim())}/map/version`, { auth: false, signal }),
};
