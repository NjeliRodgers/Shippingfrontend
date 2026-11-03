export type ShipmentStatus =
  | 'BOOKED' | 'PICKED_UP' | 'CUSTOMS_EXPORT' | 'CUSTOMS_HOLD' | 'IN_TRANSIT'
  | 'CARGO_STOP' | 'PORT_ARRIVAL' | 'CUSTOMS_IMPORT' | 'DELIVERY_ATTEMPTED'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'EXCEPTION';

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  'BOOKED', 'PICKED_UP', 'CUSTOMS_EXPORT', 'CUSTOMS_HOLD', 'IN_TRANSIT',
  'CARGO_STOP', 'PORT_ARRIVAL', 'CUSTOMS_IMPORT', 'DELIVERY_ATTEMPTED',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION',
];

export type TransportMode = 'OCEAN' | 'AIR' | 'ROAD' | 'RAIL';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  location: string;
  timestamp: string;
  completed: boolean;
  status: ShipmentStatus;
  coordinates?: [number, number]; // [lat, lng]
}

export type ShipmentDocumentType =
  | 'BILL_OF_LADING'
  | 'COMMERCIAL_INVOICE'
  | 'PACKING_LIST'
  | 'CUSTOMS_DECLARATION'
  | 'CERTIFICATE_OF_ORIGIN'
  | 'DELIVERY_PROOF'
  | 'INSURANCE_CERTIFICATE'
  | 'OTHER';

export interface ShipmentDocument {
  id: string;
  shipmentId: string;
  documentType: ShipmentDocumentType;
  documentNumber: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  visibility: 'STAFF_ONLY' | 'CUSTOMER';
  issuer: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
}

export interface ShipmentItem {
  id: string;
  shipmentId: string;
  itemReference: string;
  description: string;
  status: 'BOOKED' | 'PACKED' | 'PICKED_UP' | 'IN_TRANSIT' | 'HELD' | 'DELIVERED' | 'DAMAGED' | 'MISSING';
  quantity: number;
  unitOfMeasure: string;
  unitWeightKg: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  hsCode: string | null;
  countryOfOrigin: string | null;
  declaredValue: number | null;
  currency: string;
  isFragile: boolean;
  isHazardous: boolean;
  handlingNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentStop {
  id: string;
  shipmentId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  arrivedAt: string;
  departedAt: string | null;
  durationSeconds: number | null;
  source: 'GPS' | 'MANUAL' | 'CARRIER';
}

export type ShipmentLocationSource = 'GPS' | 'MANUAL' | 'CARRIER' | 'BOOKING' | 'STATUS' | 'LEGACY';

export interface ShipmentLocation {
  id: string;
  shipmentId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  source: ShipmentLocationSource;
  recordedAt: string;
  recordedByName: string | null;
}

export interface TelemetryData {
  temperatureCelsius: number | null;
  humidityPercent: number | null;
  batteryPercent: number | null;
  containerSealIntact: boolean;
  speedKnots: number | null;
  headingDegrees: number | null;
  currentLat: number | null;
  currentLng: number | null;
  lastPingTimestamp: string | null;
}

export interface ShipmentParty {
  id: string;
  shipmentId: string;
  role: 'SHIPPER' | 'CONSIGNEE' | 'PAYER' | 'AUTHORIZED_VIEWER';
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  canTrack: boolean;
  canViewDetails: boolean;
  canViewDocuments: boolean;
  canManage: boolean;
  createdAt: string;
}

export interface ShipmentPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  originPort: string;
  originCountry: string;
  destinationPort: string;
  destinationCountry: string;
  originCoords: [number, number];
  destinationCoords: [number, number];
  currentCoords: [number, number] | null;
  currentLocationName: string;
  currentLocationSource: ShipmentLocationSource;
  currentLocationUpdatedAt: string | null;
  transportMode: TransportMode;
  containerType?: string;
  carrierName: string;
  vesselOrFlightName: string;
  containerId: string;
  weightKg: number;
  volumeCbm: number;
  cargoDescription: string;
  status: ShipmentStatus;
  parties: ShipmentParty[];
  progressPercent: number;
  estimatedDeliveryDate: string | null;
  departureDate: string | null;
  deliveredAt: string | null;
  deliveryReceivedBy: string | null;
  isDelayed: boolean;
  delayReason?: string;
  isInsured: boolean;
  insuranceValueUsd: number;
  milestones: Milestone[];
  telemetry: TelemetryData;
  priceUsd: number;
  currency: string;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  paymentApprovalStatus: 'PENDING' | 'APPROVED';
  paymentApprovedAt: string | null;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
  publicMapEnabled?: boolean;
}

export type UserRole = 'CUSTOMER' | 'DISPATCHER' | 'ADMIN' | 'OPERATIONS_DIRECTOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  phone?: string;
  apiKeyPrefix?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface Port {
  id: string;
  name: string;
  country: string;
  type: 'SEA' | 'AIR' | 'INLAND';
  transportModes: TransportMode[];
  latitude: number;
  longitude: number;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: 'TEMPERATURE' | 'DELAY_HOURS' | 'SEAL_TAMPER' | 'CUSTOMS_HOLD';
  threshold: number | boolean | string;
  active: boolean;
  notifyChannels: ('EMAIL' | 'SMS' | 'WEBHOOK')[];
}

export interface NotificationLog {
  id: string;
  trackingNumber: string;
  recipient: string;
  channel: 'EMAIL' | 'SMS' | 'WEBHOOK';
  subject: string;
  message: string;
  timestamp: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  error?: string;
}

export interface MonthlyReportMetric {
  month: string;
  monthKey: string;
  totalShipments: number;
  deliveredShipments: number;
  onTimePercent: number | null;
  revenueUsd: number;
  avgTransitDays: number | null;
  newUsers: number;
  trackingQueries: number;
}

export interface TradeLaneMetric {
  name: string;
  volumePercent: number;
  activeContainers: number;
  shipments: number;
}

export interface DailyMetric {
  day: string;
  date: string;
  newShipments: number;
  trackingQueries: number;
  newUsers: number;
}

export interface AnalyticsSummary {
  monthly: MonthlyReportMetric[];
  tradeLanes: TradeLaneMetric[];
  daily: DailyMetric[];
  totals: { shipments: number; active: number; delivered: number; users: number; revenueUsd: number; trackingQueries: number };
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  filename: string;
  sizeMb: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'VERIFIED' | 'FAILED';
  type: 'AUTOMATED_DAILY' | 'MANUAL_SNAPSHOT';
  checksum: string;
  encrypted: boolean;
}

export interface ContainerTypeOption {
  id: string;
  label: string;
  reefer: boolean;
  transportModes: TransportMode[];
}

export interface AppConfig {
  companyName: string;
  paystackEnabled: boolean;
  paystackCurrencies: string[];
  currencies: string[];
  transportModes: TransportMode[];
  containerTypes: ContainerTypeOption[];
}

export interface Quote {
  transportMode: TransportMode;
  containerType: string;
  baseUsd: number;
  insuranceUsd: number;
  fuelAdjustmentUsd: number;
  totalUsd: number;
  currency: string;
  fxRate: number;
  totalAmount: number;
  insuredValueUsd: number;
}

export interface BookingItemPayload {
  itemReference: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitWeightKg: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  currency: string;
  isFragile: boolean;
  isHazardous: boolean;
}

export interface BookingPayload {
  originPortId: string;
  destinationPortId: string;
  transportMode: TransportMode;
  containerType: string;
  weightKg: number;
  volumeCbm: number;
  cargoDescription: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  currency: string;
  addInsurance: boolean;
  items: BookingItemPayload[];
}

export interface BookingResult {
  shipment: Shipment;
  payment: { reference: string; authorizationUrl: string; amountMinor: number; currency: string } | null;
  paymentError: string | null;
  paystackEnabled: boolean;
}

export interface PaymentStatus {
  trackingNumber: string;
  paymentStatus: Shipment['paymentStatus'];
  paymentApprovalStatus: Shipment['paymentApprovalStatus'];
  priceUsd: number;
  currency: string;
}

export interface TrackResult {
  access: 'PUBLIC' | 'LIMITED' | 'FULL';
  documentsAllowed: boolean;
  verified: boolean | null;
  shipment: Shipment;
}
