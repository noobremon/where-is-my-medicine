// Authentication helpers
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile,
} from '@firebase/auth';
import { getAuthInstance } from './firebase';
import { createUserProfile, getUserProfile } from './firestore';

/**
 * Register a new user and create their Firestore profile
 */
export async function registerUser(
    email,
    password,
    displayName,
    phone,
    role
) {
    const cred = await createUserWithEmailAndPassword(getAuthInstance(), email, password);
    await updateProfile(cred.user, { displayName });

    await createUserProfile(cred.user.uid, {
        displayName,
        email,
        phone,
        role,
        fcmToken: '',
    });

    return cred.user;
}

/**
 * Sign in existing user
 */
export async function signIn(email, password) {
    const cred = await signInWithEmailAndPassword(getAuthInstance(), email, password);
    return cred.user;
}

/**
 * Sign out current user
 */
export async function signOut() {
    await firebaseSignOut(getAuthInstance());
}

/**
 * Get current authenticated user (null if not signed in)
 */
export function getCurrentUser() {
    return getAuthInstance().currentUser;
}

/**
 * Subscribe to auth state changes. Returns unsubscribe function.
 */
export function onAuthChange(callback) {
    return onAuthStateChanged(getAuthInstance(), callback);
}

/**
 * Get the full user profile from Firestore for the current user
 */
export async function getCurrentUserProfile() {
    const user = getAuthInstance().currentUser;
    if (!user) return null;
    return getUserProfile(user.uid);
}
