// ─── Where Is My Medicine — Cloud Functions ──────────────
// Handles: medicine request fan-out notifications, pharmacy response notifications,
// and admin user setup.

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getAuth } = require('firebase-admin/auth');
const { geohashQueryBounds, distanceBetween } = require('geofire-common');

initializeApp();

const db = getFirestore();

// ─── HELPER: Find nearby active pharmacies ───────────────
async function findNearbyPharmacies(center, radiusKm, medicineName) {
    const radiusMeters = radiusKm * 1000;
    const bounds = geohashQueryBounds([center.lat, center.lng], radiusMeters);

    const promises = bounds.map(([start, end]) =>
        db
            .collection('pharmacies')
            .where('isActive', '==', true)
            .orderBy('location.geohash')
            .startAt(start)
            .endAt(end)
            .get()
    );

    const snapshots = await Promise.all(promises);
    const pharmacies = [];
    const seen = new Set();

    for (const snap of snapshots) {
        for (const doc of snap.docs) {
            if (seen.has(doc.id)) continue;
            seen.add(doc.id);

            const data = doc.data();
            const distKm =
                distanceBetween(
                    [data.location.lat, data.location.lng],
                    [center.lat, center.lng]
                );

            if (distKm <= radiusKm) {
                // Filter by medicine if provided
                if (
                    medicineName &&
                    !data.medicines.includes(medicineName.toLowerCase())
                ) {
                    continue;
                }
                pharmacies.push({ ...data, id: doc.id, distanceKm: distKm });
            }
        }
    }

    return pharmacies.sort((a, b) => a.distanceKm - b.distanceKm);
}

// ═════════════════════════════════════════════════════════
// 1. ON MEDICINE REQUEST CREATED — Fan-out FCM to pharmacies
// ═════════════════════════════════════════════════════════
exports.onMedicineRequestCreated = onDocumentCreated(
    'medicineRequests/{requestId}',
    async (event) => {
        const request = event.data.data();
        const requestId = event.params.requestId;

        try {
            // Get config for radius (default 10 km)
            let radiusKm = 10;
            const configSnap = await db.doc('adminConfig/settings').get();
            if (configSnap.exists) {
                radiusKm = configSnap.data().maxRequestRadiusKm || 10;
            }

            // Find nearby pharmacies that have the medicine
            const pharmacies = await findNearbyPharmacies(
                request.customerLocation,
                radiusKm,
                request.medicineName
            );

            if (pharmacies.length === 0) {
                console.log(`No nearby pharmacies found for request ${requestId}`);
                return;
            }

            // Collect FCM tokens and pharmacy IDs
            const tokens = [];
            const pharmacyIds = [];

            for (const pharmacy of pharmacies) {
                pharmacyIds.push(pharmacy.id);
                if (pharmacy.fcmToken) {
                    tokens.push(pharmacy.fcmToken);
                }
            }

            // Update the request with notified pharmacies
            await db.doc(`medicineRequests/${requestId}`).update({
                notifiedPharmacies: pharmacyIds,
            });

            // Send FCM notifications
            if (tokens.length > 0) {
                const message = {
                    tokens,
                    notification: {
                        title: 'New Medicine Request',
                        body: `Someone nearby needs ${request.medicineName}. Tap to respond.`,
                    },
                    data: {
                        type: 'MEDICINE_REQUEST',
                        requestId,
                        medicineName: request.medicineName,
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            channelId: 'medicine_requests',
                            sound: 'default',
                        },
                    },
                    apns: {
                        payload: {
                            aps: {
                                sound: 'default',
                                badge: 1,
                            },
                        },
                    },
                };

                const response = await getMessaging().sendEachForMulticast(message);
                console.log(
                    `Sent ${response.successCount}/${tokens.length} notifications for request ${requestId}`
                );
            }
        } catch (error) {
            console.error('Error processing medicine request:', error);
        }
    }
);

// ═════════════════════════════════════════════════════════
// 2. ON PHARMACY RESPONSE — Notify customer
// ═════════════════════════════════════════════════════════
exports.onMedicineRequestUpdated = onDocumentUpdated(
    'medicineRequests/{requestId}',
    async (event) => {
        const before = event.data.before.data();
        const after = event.data.after.data();
        const requestId = event.params.requestId;

        // Detect new pharmacy responses
        const beforeResponseKeys = Object.keys(before.responses || {});
        const afterResponseKeys = Object.keys(after.responses || {});

        const newResponses = afterResponseKeys.filter(
            (key) => !beforeResponseKeys.includes(key)
        );

        if (newResponses.length === 0) return;

        try {
            // Get the customer's FCM token
            const customerSnap = await db.doc(`users/${after.customerId}`).get();
            if (!customerSnap.exists) return;

            const customer = customerSnap.data();
            if (!customer.fcmToken) return;

            for (const pharmacyId of newResponses) {
                const response = after.responses[pharmacyId];

                // Get pharmacy name
                const pharmacySnap = await db.doc(`pharmacies/${pharmacyId}`).get();
                const pharmacyName = pharmacySnap.exists
                    ? pharmacySnap.data().name
                    : 'A pharmacy';

                const statusText =
                    response.status === 'accepted'
                        ? `${pharmacyName} has your medicine! (${response.distanceKm} km away)`
                        : `${pharmacyName} does not have your medicine.`;

                const message = {
                    token: customer.fcmToken,
                    notification: {
                        title:
                            response.status === 'accepted'
                                ? '✅ Medicine Available!'
                                : 'Response Received',
                        body: statusText,
                    },
                    data: {
                        type: 'PHARMACY_RESPONSE',
                        requestId,
                        pharmacyId,
                        responseStatus: response.status,
                    },
                };

                await getMessaging().send(message);
            }
        } catch (error) {
            console.error('Error sending customer notification:', error);
        }
    }
);

// ═════════════════════════════════════════════════════════
// 3. CALLABLE: Set user role as admin (for admin panel use)
// ═════════════════════════════════════════════════════════
exports.setAdminRole = onCall(async (request) => {
    // Only existing admins can create new admins
    const callerUid = request.auth?.uid;
    if (!callerUid) {
        throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const callerSnap = await db.doc(`users/${callerUid}`).get();
    if (!callerSnap.exists || callerSnap.data().role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can set admin roles.');
    }

    const { targetUid } = request.data;
    if (!targetUid) {
        throw new HttpsError('invalid-argument', 'targetUid is required.');
    }

    // Update user role in Firestore
    await db.doc(`users/${targetUid}`).update({ role: 'admin' });

    // Set custom claim for future use
    await getAuth().setCustomUserClaims(targetUid, { role: 'admin' });

    return { success: true };
});

// ═════════════════════════════════════════════════════════
// 4. CALLABLE: Onboard new pharmacy (creates user, sets role, creates docs)
// ═════════════════════════════════════════════════════════
exports.onboardPharmacy = onCall(async (request) => {
    // Only existing admins can onboard new pharmacies
    const callerUid = request.auth?.uid;
    if (!callerUid) {
        throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const callerSnap = await db.doc(`users/${callerUid}`).get();
    if (!callerSnap.exists || callerSnap.data().role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can onboard pharmacies.');
    }

    const { email, password, name, ownerName, phone, address, location } = request.data;
    if (!email || !password || !name || !ownerName || !phone || !address || !location) {
        throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    // Create auth user
    let userRecord;
    try {
        userRecord = await getAuth().createUser({
            email,
            password,
            displayName: name,
            phoneNumber: phone.startsWith('+') ? phone : undefined,
        });
    } catch (authError) {
        console.error('Error creating auth user:', authError);
        throw new HttpsError('already-exists', authError.message || 'Auth user creation failed.');
    }

    const uid = userRecord.uid;

    try {
        // Set custom claim for pharmacy role
        await getAuth().setCustomUserClaims(uid, { role: 'pharmacy' });

        // Create user profile document in Firestore
        await db.doc(`users/${uid}`).set({
            uid,
            displayName: name,
            email,
            phone,
            role: 'pharmacy',
            fcmToken: '',
            createdAt: FieldValue.serverTimestamp(),
        });

        // Create pharmacy document in Firestore
        await db.doc(`pharmacies/${uid}`).set({
            id: uid,
            name,
            ownerName,
            email,
            phone,
            address,
            location,
            isActive: true,
            subscription: { plan: 'basic', isActive: true, expiresAt: null },
            fcmToken: '',
            medicines: [],
            createdAt: FieldValue.serverTimestamp(),
        });

        return { success: true, uid };
    } catch (error) {
        console.error('Error during onboarding db setup, rolling back auth user:', error);
        try {
            await getAuth().deleteUser(uid);
        } catch (delError) {
            console.error('Rollback deleteUser failed:', delError);
        }
        throw new HttpsError('internal', error.message || 'Onboarding database setup failed.');
    }
});

