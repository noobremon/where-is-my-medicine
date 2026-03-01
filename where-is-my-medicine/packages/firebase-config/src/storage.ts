// Firebase Storage helpers for prescription image uploads
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a prescription image to Firebase Storage.
 * @param requestId - Medicine request ID (used as filename)
 * @param imageBlob - Image as Blob or Uint8Array
 * @returns Download URL of the uploaded image
 */
export async function uploadPrescriptionImage(
    requestId: string,
    imageBlob: Blob | Uint8Array
): Promise<string> {
    const storageRef = ref(storage, `prescriptions/${requestId}.jpg`);
    await uploadBytes(storageRef, imageBlob, {
        contentType: 'image/jpeg',
    });
    return getDownloadURL(storageRef);
}

/**
 * Get the download URL for an existing prescription image
 */
export async function getPrescriptionImageUrl(
    requestId: string
): Promise<string> {
    const storageRef = ref(storage, `prescriptions/${requestId}.jpg`);
    return getDownloadURL(storageRef);
}

/**
 * Delete a prescription image
 */
export async function deletePrescriptionImage(
    requestId: string
): Promise<void> {
    const storageRef = ref(storage, `prescriptions/${requestId}.jpg`);
    await deleteObject(storageRef);
}
