// Firestore helper functions for common operations
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    startAt,
    endAt,
    onSnapshot,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { getDbInstance } from './firebase';
import { COLLECTIONS } from '@wimm/shared';
import {
    getGeohashBounds,
    getDistanceKm,
} from '@wimm/shared';

// Re-export serverTimestamp so consumers don't need direct firebase/firestore imports
export { serverTimestamp } from 'firebase/firestore';

// ─── User Operations ─────────────────────────────────────

export async function createUserProfile(uid, data) {
    await setDoc(doc(getDbInstance(), COLLECTIONS.USERS, uid), {
        ...data,
        uid,
        createdAt: serverTimestamp(),
    });
}

export async function getUserProfile(uid) {
    const snap = await getDoc(doc(getDbInstance(), COLLECTIONS.USERS, uid));
    return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
    await updateDoc(doc(getDbInstance(), COLLECTIONS.USERS, uid), data);
}

export async function updateFcmToken(uid, token) {
    await updateDoc(doc(getDbInstance(), COLLECTIONS.USERS, uid), { fcmToken: token });
}

// ─── Pharmacy Operations ─────────────────────────────────

export async function createPharmacy(pharmacyId, data) {
    await setDoc(doc(getDbInstance(), COLLECTIONS.PHARMACIES, pharmacyId), {
        ...data,
        id: pharmacyId,
        createdAt: serverTimestamp(),
    });
}

export async function getPharmacy(pharmacyId) {
    const snap = await getDoc(doc(getDbInstance(), COLLECTIONS.PHARMACIES, pharmacyId));
    return snap.exists() ? snap.data() : null;
}

export async function updatePharmacy(pharmacyId, data) {
    await updateDoc(doc(getDbInstance(), COLLECTIONS.PHARMACIES, pharmacyId), data);
}

export async function getAllPharmacies() {
    const snap = await getDocs(collection(getDbInstance(), COLLECTIONS.PHARMACIES));
    return snap.docs.map((d) => d.data());
}

/**
 * Find nearby active pharmacies using Geohash bounding-box queries.
 * Optionally filter by a specific medicine name.
 */
export async function findNearbyPharmacies(center, radiusKm, medicineName) {
    const bounds = getGeohashBounds(center, radiusKm);

    const promises = bounds.map(([start, end]) => {
        const constraints = [
            where('isActive', '==', true),
            orderBy('location.geohash'),
            startAt(start),
            endAt(end),
        ];
        return getDocs(query(collection(getDbInstance(), COLLECTIONS.PHARMACIES), ...constraints));
    });

    const snapshots = await Promise.all(promises);
    const pharmacies = [];

    for (const snap of snapshots) {
        for (const d of snap.docs) {
            const pharmacy = d.data();
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
    const seen = new Set();
    const unique = pharmacies.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
    });

    return unique.sort((a, b) => a.distanceKm - b.distanceKm);
}

// ─── Medicine Request Operations ─────────────────────────

export async function createMedicineRequest(data) {
    const ref = doc(collection(getDbInstance(), COLLECTIONS.MEDICINE_REQUESTS));
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

export async function updateRequestStatus(requestId, status) {
    await updateDoc(doc(getDbInstance(), COLLECTIONS.MEDICINE_REQUESTS, requestId), { status });
}

export async function addPharmacyResponse(requestId, pharmacyId, response) {
    await updateDoc(doc(getDbInstance(), COLLECTIONS.MEDICINE_REQUESTS, requestId), {
        [`responses.${pharmacyId}`]: response,
    });
}

export async function acceptRequest(requestId, pharmacyId) {
    await updateDoc(doc(getDbInstance(), COLLECTIONS.MEDICINE_REQUESTS, requestId), {
        status: 'accepted',
        acceptedPharmacyId: pharmacyId,
    });
}

/**
 * Subscribe to real-time updates on a medicine request.
 * Returns an unsubscribe function.
 */
export function subscribeMedicineRequest(requestId, callback) {
    return onSnapshot(
        doc(getDbInstance(), COLLECTIONS.MEDICINE_REQUESTS, requestId),
        (snap) => {
            if (snap.exists()) {
                callback(snap.data());
            }
        }
    );
}

/**
 * Subscribe to medicine requests for a specific pharmacy.
 * Returns requests where this pharmacy is in notifiedPharmacies.
 */
export function subscribePharmacyRequests(pharmacyId, callback) {
    const q = query(
        collection(getDbInstance(), COLLECTIONS.MEDICINE_REQUESTS),
        where('notifiedPharmacies', 'array-contains', pharmacyId),
        where('status', '==', 'pending')
    );

    return onSnapshot(q, (snap) => {
        const requests = snap.docs.map((d) => d.data());
        callback(requests);
    });
}

/**
 * Subscribe to real-time updates on customer's own requests.
 * Uses client-side sorting to avoid requiring composite Firestore index.
 */
export function subscribeCustomerRequests(customerId, callback) {
    const q = query(
        collection(getDbInstance(), COLLECTIONS.MEDICINE_REQUESTS),
        where('customerId', '==', customerId)
    );

    return onSnapshot(q, (snap) => {
        const requests = snap.docs.map((d) => d.data());
        // Sort client-side by createdAt (descending)
        const sortedRequests = requests.sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
            return bTime - aTime; // descending order
        });
        callback(sortedRequests);
    });
}

// ─── Prescription Upload ──────────────────────────────────

export async function updatePrescription(requestId, prescription) {
    await updateDoc(doc(getDbInstance(), COLLECTIONS.MEDICINE_REQUESTS, requestId), {
        prescription,
    });
}

export async function updatePharmacyHighlights(requestId, pharmacyId, highlights) {
    await updateDoc(doc(getDbInstance(), COLLECTIONS.MEDICINE_REQUESTS, requestId), {
        [`responses.${pharmacyId}.pharmacyHighlights`]: highlights,
    });
}
