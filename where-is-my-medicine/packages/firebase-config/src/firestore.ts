// Firestore helper functions for common operations
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    startAt,
    endAt,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    QueryConstraint,
    DocumentReference,
    DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import {
    COLLECTIONS,
    UserProfile,
    Pharmacy,
    MedicineRequest,
    GeoLocation,
    Prescription,
    PharmacyResponse,
    RequestStatus,
} from '@wimm/shared';
import {
    getGeohashBounds,
    getDistanceKm,
    createGeoLocation,
} from '@wimm/shared';

// ─── User Operations ─────────────────────────────────────

export async function createUserProfile(
    uid: string,
    data: Omit<UserProfile, 'uid' | 'createdAt'>
): Promise<void> {
    await setDoc(doc(db, COLLECTIONS.USERS, uid), {
        ...data,
        uid,
        createdAt: serverTimestamp(),
    });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserProfile(
    uid: string,
    data: Partial<UserProfile>
): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), data as DocumentData);
}

export async function updateFcmToken(uid: string, token: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), { fcmToken: token });
}

// ─── Pharmacy Operations ─────────────────────────────────

export async function createPharmacy(
    pharmacyId: string,
    data: Omit<Pharmacy, 'id' | 'createdAt'>
): Promise<void> {
    await setDoc(doc(db, COLLECTIONS.PHARMACIES, pharmacyId), {
        ...data,
        id: pharmacyId,
        createdAt: serverTimestamp(),
    });
}

export async function getPharmacy(pharmacyId: string): Promise<Pharmacy | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.PHARMACIES, pharmacyId));
    return snap.exists() ? (snap.data() as Pharmacy) : null;
}

export async function updatePharmacy(
    pharmacyId: string,
    data: Partial<Pharmacy>
): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.PHARMACIES, pharmacyId), data as DocumentData);
}

export async function getAllPharmacies(): Promise<Pharmacy[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.PHARMACIES));
    return snap.docs.map((d) => d.data() as Pharmacy);
}

/**
 * Find nearby active pharmacies using Geohash bounding-box queries.
 * Optionally filter by a specific medicine name.
 */
export async function findNearbyPharmacies(
    center: { lat: number; lng: number },
    radiusKm: number,
    medicineName?: string
): Promise<(Pharmacy & { distanceKm: number })[]> {
    const bounds = getGeohashBounds(center, radiusKm);

    const promises = bounds.map(([start, end]) => {
        const constraints: QueryConstraint[] = [
            where('isActive', '==', true),
            orderBy('location.geohash'),
            startAt(start),
            endAt(end),
        ];
        return getDocs(query(collection(db, COLLECTIONS.PHARMACIES), ...constraints));
    });

    const snapshots = await Promise.all(promises);
    const pharmacies: (Pharmacy & { distanceKm: number })[] = [];

    for (const snap of snapshots) {
        for (const d of snap.docs) {
            const pharmacy = d.data() as Pharmacy;
            const distKm = getDistanceKm(pharmacy.location, center);

            if (distKm <= radiusKm) {
                // Filter by medicine if specified
                if (
                    medicineName &&
                    !pharmacy.medicines.includes(medicineName.toLowerCase())
                ) {
                    continue;
                }
                pharmacies.push({ ...pharmacy, distanceKm: distKm });
            }
        }
    }

    // Deduplicate (geohash ranges can overlap)
    const seen = new Set<string>();
    const unique = pharmacies.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
    });

    return unique.sort((a, b) => a.distanceKm - b.distanceKm);
}

// ─── Medicine Request Operations ─────────────────────────

export async function createMedicineRequest(
    data: Omit<MedicineRequest, 'id' | 'createdAt' | 'expiresAt' | 'responses' | 'notifiedPharmacies' | 'acceptedPharmacyId'>
): Promise<string> {
    const ref = doc(collection(db, COLLECTIONS.MEDICINE_REQUESTS));
    const now = Timestamp.now();
    const ttl = 30; // minutes
    const expiresAt = Timestamp.fromMillis(now.toMillis() + ttl * 60 * 1000);

    await setDoc(ref, {
        ...data,
        id: ref.id,
        responses: {},
        notifiedPharmacies: [],
        acceptedPharmacyId: null,
        createdAt: serverTimestamp(),
        expiresAt,
    });

    return ref.id;
}

export async function updateRequestStatus(
    requestId: string,
    status: RequestStatus
): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.MEDICINE_REQUESTS, requestId), { status });
}

export async function addPharmacyResponse(
    requestId: string,
    pharmacyId: string,
    response: PharmacyResponse
): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.MEDICINE_REQUESTS, requestId), {
        [`responses.${pharmacyId}`]: response,
    });
}

export async function acceptRequest(
    requestId: string,
    pharmacyId: string
): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.MEDICINE_REQUESTS, requestId), {
        status: 'accepted',
        acceptedPharmacyId: pharmacyId,
    });
}

/**
 * Subscribe to real-time updates on a medicine request.
 * Returns an unsubscribe function.
 */
export function subscribeMedicineRequest(
    requestId: string,
    callback: (request: MedicineRequest) => void
): () => void {
    return onSnapshot(
        doc(db, COLLECTIONS.MEDICINE_REQUESTS, requestId),
        (snap) => {
            if (snap.exists()) {
                callback(snap.data() as MedicineRequest);
            }
        }
    );
}

/**
 * Subscribe to medicine requests for a specific pharmacy.
 * Returns requests where this pharmacy is in notifiedPharmacies.
 */
export function subscribePharmacyRequests(
    pharmacyId: string,
    callback: (requests: MedicineRequest[]) => void
): () => void {
    const q = query(
        collection(db, COLLECTIONS.MEDICINE_REQUESTS),
        where('notifiedPharmacies', 'array-contains', pharmacyId),
        where('status', '==', 'pending')
    );

    return onSnapshot(q, (snap) => {
        const requests = snap.docs.map((d) => d.data() as MedicineRequest);
        callback(requests);
    });
}

/**
 * Subscribe to real-time updates on customer's own requests.
 */
export function subscribeCustomerRequests(
    customerId: string,
    callback: (requests: MedicineRequest[]) => void
): () => void {
    const q = query(
        collection(db, COLLECTIONS.MEDICINE_REQUESTS),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
        const requests = snap.docs.map((d) => d.data() as MedicineRequest);
        callback(requests);
    });
}

// ─── Prescription Upload ──────────────────────────────────

export async function updatePrescription(
    requestId: string,
    prescription: Prescription
): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.MEDICINE_REQUESTS, requestId), {
        prescription,
    });
}

export async function updatePharmacyHighlights(
    requestId: string,
    pharmacyId: string,
    highlights: { x: number; y: number; width: number; height: number }[]
): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.MEDICINE_REQUESTS, requestId), {
        [`responses.${pharmacyId}.pharmacyHighlights`]: highlights,
    });
}
