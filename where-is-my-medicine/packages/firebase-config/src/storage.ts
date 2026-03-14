// Firebase Storage helpers for prescription image uploads
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { getStorageInstance } from './firebase';

/**
 * Upload a prescription image to Firebase Storage.
 */
export async function uploadPrescriptionImage(requestId, imageBlob) {
    const storageRef = ref(getStorageInstance(), `prescriptions/${requestId}.jpg`);
    await uploadBytes(storageRef, imageBlob, {
        contentType: 'image/jpeg',
    });
    return getDownloadURL(storageRef);
}

/**
 * Get the download URL for an existing prescription image
 */
export async function getPrescriptionImageUrl(requestId) {
    const storageRef = ref(getStorageInstance(), `prescriptions/${requestId}.jpg`);
    return getDownloadURL(storageRef);
}

/**
 * Delete a prescription image
 */
export async function deletePrescriptionImage(requestId) {
    const storageRef = ref(getStorageInstance(), `prescriptions/${requestId}.jpg`);
    await deleteObject(storageRef);
}
