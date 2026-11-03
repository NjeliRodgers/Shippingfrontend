import { request,downloadFile, uploadFile } from './client';
import { AppConfig, BookingPayload, BookingResult, PaymentStatus, ShipmentDocument, Port, Quote, Shipment, ShipmentItem, ShipmentStatus, ShipmentStop, ShipmentParty, ShipmentPage, TrackResult, ShipmentLocation, TransportMode } from '../types/logistics';

export const ConfigApi = {
  get: () => request<AppConfig>('/config', { auth: false }),
  quote: (data: { transportMode: string; containerType: string; addInsurance: boolean; currency: string }) =>
    request<Quote>('/quotes', { method: 'POST', body: data, auth: false }),
  health: () => request<{ status: string; database: string }>('/health', { auth: false }),
};

export const PortsApi = {
  list: (transportMode?: TransportMode) => request<Port[]>('/ports', { query: { transportMode }, auth: false }),
  create: (data: Omit<Port, 'id'>) => request<Port>('/ports', { method: 'POST', body: data }),
  remove: (id: string) => request<{ message: string }>(`/ports/${id}`, { method: 'DELETE' }),
};

export interface StaffShipmentInput extends Omit<BookingPayload, 'items'> {
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  carrierName?: string;
  vesselOrFlightName?: string;
  containerId?: string;
  departureDate?: string;
  estimatedDeliveryDate?: string;
  paymentStatus?: 'PENDING' | 'PAID';
  priceUsd?: number;
}

export interface TelemetryInput {
  temperatureCelsius?: number | null;
  humidityPercent?: number | null;
  batteryPercent?: number | null;
  containerSealIntact?: boolean;
  speedKnots?: number | null;
  headingDegrees?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export const ShipmentsApi = {
  book: (data: BookingPayload) => request<BookingResult>('/shipments/book', { method: 'POST', body: data }),
  mine: (params?: { q?: string; status?: string; limit?: number; offset?: number }) => request<ShipmentPage<Shipment>>('/shipments/mine', { query: params }),
  list: (params?: { q?: string; status?: string; limit?: number; offset?: number }) => request<ShipmentPage<Shipment>>('/shipments', { query: params }),
  get: (id: string) => request<Shipment>(`/shipments/${id}`),
  create: (data: StaffShipmentInput) => request<Shipment>('/shipments', { method: 'POST', body: data }),
  update: (id: string, data: Record<string, unknown>) => request<Shipment>(`/shipments/${id}`, { method: 'PATCH', body: data }),
  updateLocation: (id: string, data: { latitude: number; longitude: number; locationName?: string; note?: string }) =>
    request<{ shipment: Shipment; emailStatuses: { recipient: string; status: 'QUEUED' | 'SENT' | 'FAILED' }[] }>(`/shipments/${encodeURIComponent(id)}/location`, { method: 'PATCH', body: data }),
  previewEmail: (id: string, data: { recipientMode: 'OWNER' | 'RECIPIENT' | 'BOTH'; subject: string; message: string }) =>
    request<{ trackingNumber: string; recipients: { name: string; email: string }[]; subject: string; message: string; emailConfigured: boolean; previewToken: string }>(`/shipments/${encodeURIComponent(id)}/email/preview`, { method: 'POST', body: data }),
  sendEmail: (id: string, data: { recipientMode: 'OWNER' | 'RECIPIENT' | 'BOTH'; subject: string; message: string; previewToken: string }) =>
    request<{ notifications: { recipient: string; status: 'QUEUED' | 'SENT' | 'FAILED' }[] }>(`/shipments/${encodeURIComponent(id)}/email/send`, { method: 'POST', body: data }),
  updateStatus: (id: string, data: { status: ShipmentStatus; note?: string; location?: string; receivedBy?: string }) =>
    request<Shipment>(`/shipments/${id}/status`, { method: 'PATCH', body: data }),
  setPaymentApproval: (id: string) =>
    request<{ shipment: Shipment; notificationStatus: 'QUEUED' | 'SENT' | 'FAILED' | null }>(`/shipments/${encodeURIComponent(id)}/payment-approval`, { method: 'PATCH', body: {} }),
  addTelemetry: (id: string, data: TelemetryInput) =>
    request<Shipment>(`/shipments/${id}/telemetry`, { method: 'POST', body: data }),
  addMilestone: (id: string, data: { title: string; description?: string; location?: string; status?: ShipmentStatus; completed?: boolean }) =>
    request<Shipment>(`/shipments/${id}/milestones`, { method: 'POST', body: data }),
  setPublicMap: (id: string, enabled: boolean) =>
    request<{ message: string; enabled: boolean }>(`/shipments/${encodeURIComponent(id)}/public-map`, { method: 'PATCH', body: { enabled } }),
  remove: (id: string) => request<{ message: string }>(`/shipments/${id}`, { method: 'DELETE' }),
  claim: (trackingNumber: string, verify: string) =>
    request<Shipment>('/shipments/claim', { method: 'POST', body: { trackingNumber, verify } }),
};

export const ShipmentStopsApi = {
  list: (shipmentId: string) =>
    request<ShipmentStop[]>(`/shipments/${encodeURIComponent(shipmentId)}/stops`),

  create: (
    shipmentId: string,
    data: { locationName: string; latitude: number; longitude: number; arrivedAt?: string }
  ) =>
    request<ShipmentStop>(`/shipments/${encodeURIComponent(shipmentId)}/stops`, {
      method: 'POST',
      body: data,
    }),

  depart: (shipmentId: string, stopId: string, departedAt?: string) =>
    request<ShipmentStop>(
      `/shipments/${encodeURIComponent(shipmentId)}/stops/${encodeURIComponent(stopId)}/depart`,
      {
        method: 'PATCH',
        body: departedAt ? { departedAt } : {},
      }
    ),
};

export interface ShipmentItemInput {
  status?: ShipmentItem['status'];
  itemReference: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitWeightKg: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  hsCode?: string | null;
  countryOfOrigin?: string | null;
  declaredValue?: number | null;
  currency: string;
  isFragile: boolean;
  isHazardous: boolean;
  handlingNotes?: string | null;
}

export const ShipmentItemsApi = {
  list: (shipmentId: string) =>
    request<ShipmentItem[]>(`/shipments/${encodeURIComponent(shipmentId)}/items`),

  create: (shipmentId: string, data: ShipmentItemInput) =>
    request<ShipmentItem>(`/shipments/${encodeURIComponent(shipmentId)}/items`, {
      method: 'POST',
      body: data,
    }),

  update: (shipmentId: string, itemId: string, data: ShipmentItemInput) =>
    request<ShipmentItem>(
      `/shipments/${encodeURIComponent(shipmentId)}/items/${encodeURIComponent(itemId)}`,
      { method: 'PUT', body: data }
    ),

  remove: (shipmentId: string, itemId: string) =>
    request<{ message: string }>(
      `/shipments/${encodeURIComponent(shipmentId)}/items/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' }
    ),
  setStatus: (shipmentId: string, itemId: string, status: ShipmentItem['status']) =>
    request<ShipmentItem>(`/shipments/${encodeURIComponent(shipmentId)}/items/${encodeURIComponent(itemId)}/status`, { method: 'PATCH', body: { status } }),
};

export const TrackingApi = {
  track: (ref: string, verify?: string) =>
    request<TrackResult>(`/track/${encodeURIComponent(ref.trim())}`, { query: { verify } }),
  locationHistory: (ref: string, verify?: string, limit = 50) =>
    request<ShipmentLocation[]>(`/track/${encodeURIComponent(ref.trim())}/location-history`, { query: { verify, limit } }),
  subscribe: (ref: string, recipient: string) =>
    request<{ message: string }>(`/track/${encodeURIComponent(ref.trim())}/subscribe`, { method: 'POST', body: { recipient }, auth: false }),
};

export const PaymentsApi = {
  status: (trackingNumber: string, email: string) =>
    request<PaymentStatus>('/payments/status', { method: 'POST', body: { trackingNumber, email }, auth: false }),
  initialize: (trackingNumber: string, email: string, currency: string) =>
    request<{ reference: string; authorizationUrl: string }>('/payments/initialize', {
      method: 'POST', body: { trackingNumber, email, currency },
    }),
  verify: (reference: string) =>
    request<{ verified: boolean; status: string; trackingNumber?: string }>('/payments/paystack/verify', {
      query: { reference }, auth: false,
    }),
};

export const ShipmentPartiesApi = {
  list: (shipmentId: string) => request<ShipmentParty[]>(`/shipments/${encodeURIComponent(shipmentId)}/parties`),
  addViewer: (shipmentId: string, data: { name: string; email: string; phone?: string; canViewDetails: boolean; canViewDocuments: boolean }) =>
    request<ShipmentParty>(`/shipments/${encodeURIComponent(shipmentId)}/parties`, { method: 'POST', body: data }),
  removeViewer: (shipmentId: string, partyId: string) =>
    request<{ message: string }>(`/shipments/${encodeURIComponent(shipmentId)}/parties/${encodeURIComponent(partyId)}`, { method: 'DELETE' }),
};

export const ShipmentDocumentsApi = {
  list: (shipmentId: string) =>
    request<ShipmentDocument[]>(
      `/shipments/${encodeURIComponent(shipmentId)}/documents`
    ),

  upload: (
    shipmentId: string,
    file: File,
    metadata: {
      documentType: ShipmentDocument['documentType'];
      visibility: ShipmentDocument['visibility'];
      documentNumber?: string;
      issuer?: string;
      issuedAt?: string;
      expiresAt?: string;
    }
  ) =>
    uploadFile<ShipmentDocument>(
      `/shipments/${encodeURIComponent(shipmentId)}/documents`,
      file,
      metadata
    ),

  download: (shipmentId: string, documentId: string, filename: string) =>
    downloadFile(
      `/shipments/${encodeURIComponent(shipmentId)}/documents/${encodeURIComponent(documentId)}/download`,
      filename
    ),

  revoke: (shipmentId: string, documentId: string) =>
    request<{ message: string }>(
      `/shipments/${encodeURIComponent(shipmentId)}/documents/${encodeURIComponent(documentId)}`,
      { method: 'DELETE' }
    ),
};