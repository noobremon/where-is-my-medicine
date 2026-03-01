// Authentication helpers
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
    updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile, getUserProfile } from './firestore';
import { UserRole, UserProfile } from '@wimm/shared';

/**
 * Register a new user and create their Firestore profile
 */
export async function registerUser(
    email: string,
    password: string,
    displayName: string,
    phone: string,
    role: UserRole
): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
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
export async function signIn(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
}

/**
 * Get current authenticated user (null if not signed in)
 */
export function getCurrentUser(): User | null {
    return auth.currentUser;
}

/**
 * Subscribe to auth state changes. Returns unsubscribe function.
 */
export function onAuthChange(
    callback: (user: User | null) => void
): () => void {
    return onAuthStateChanged(auth, callback);
}

/**
 * Get the full user profile from Firestore for the current user
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return getUserProfile(user.uid);
}
