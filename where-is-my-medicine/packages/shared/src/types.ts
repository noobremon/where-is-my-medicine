// Shared TypeScript types for Where Is My Medicine
// Used by customer app, pharmacy app, admin panel, and cloud functions

// ─── User Roles ──────────────────────────────────────────
export type UserRole = 'customer' | 'pharmacy' | 'admin';

// ─── Location ────────────────────────────────────────────
export interface GeoLocation {
  lat: number;
  lng: number;
  geohash: string;
}

// ─── User Profile ────────────────────────────────────────
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: any; // Firestore Timestamp
  fcmToken: string;
  location?: GeoLocation;
}

// ─── Subscription ────────────────────────────────────────
export type SubscriptionPlan = 'free' | 'basic' | 'premium';

export interface Subscription {
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt: any; // Firestore Timestamp
}

// ─── Pharmacy ────────────────────────────────────────────
export interface Pharmacy {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  location: GeoLocation;
  isActive: boolean;
  subscription: Subscription;
  fcmToken: string;
  medicines: string[]; // lowercase normalized
  createdAt: any;
}

// ─── Highlight (Normalized 0–1 coordinates) ──────────────
export interface Highlight {
  x: number;      // 0.0 – 1.0 (left edge)
  y: number;      // 0.0 – 1.0 (top edge)
  width: number;  // 0.0 – 1.0
  height: number; // 0.0 – 1.0
}

// ─── Prescription ────────────────────────────────────────
export interface Prescription {
  imageUrl: string;
  selectAll: boolean;
  customerHighlights: Highlight[];
}

// ─── Pharmacy Response ───────────────────────────────────
export type ResponseStatus = 'accepted' | 'rejected';

export interface PharmacyResponse {
  status: ResponseStatus;
  pharmacyName: string;
  pharmacyHighlights: Highlight[];
  distanceKm: number;
  respondedAt: any; // Firestore Timestamp
}

// ─── Medicine Request ────────────────────────────────────
export type RequestStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface MedicineRequest {
  id: string;
  customerId: string;
  medicineName: string;
  status: RequestStatus;
  customerLocation: GeoLocation;
  prescription: Prescription | null;
  notifiedPharmacies: string[];
  responses: Record<string, PharmacyResponse>;
  acceptedPharmacyId: string | null;
  createdAt: any;
  expiresAt: any;
}

// ─── Admin Config ────────────────────────────────────────
export interface AdminConfig {
  maxRequestRadiusKm: number;
  requestTTLMinutes: number;
  subscriptionPlans: Record<string, any>;
}

// ─── Firestore Collection Names ──────────────────────────
export const COLLECTIONS = {
  USERS: 'users',
  PHARMACIES: 'pharmacies',
  MEDICINE_REQUESTS: 'medicineRequests',
  ADMIN_CONFIG: 'adminConfig',
} as const;

// ─── Request Status Constants ────────────────────────────
export const REQUEST_STATUS = {
  PENDING: 'pending' as RequestStatus,
  ACCEPTED: 'accepted' as RequestStatus,
  EXPIRED: 'expired' as RequestStatus,
  CANCELLED: 'cancelled' as RequestStatus,
} as const;

// ─── Default Config ──────────────────────────────────────
export const DEFAULT_SEARCH_RADIUS_KM = 10;
export const DEFAULT_REQUEST_TTL_MINUTES = 30;
