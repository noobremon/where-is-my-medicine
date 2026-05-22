// Firebase configuration and initialization
// Uses lazy initialization to ensure all Firebase component registrations
// (e.g. @firebase/auth's registerAuth()) complete before services are accessed.
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB2OCMA0qsmEnUBiTfRzrFhALvs_vxS4Xo',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'where-is-my-medicine-30e0a.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'where-is-my-medicine-30e0a',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'where-is-my-medicine-30e0a.firebasestorage.app',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '942251675078',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:942251675078:web:5792d2ab15291ccc5776c7',
};


// ── Lazy singletons ────────────────────────────────────────
let _app = null;
let _auth = null;
let _db = null;
let _storage = null;

export function getAppInstance() {
    if (!_app) {
        _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    }
    return _app;
}

export function getAuthInstance() {
    if (!_auth) {
        const app = getAppInstance();
        const isReactNative =
            typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

        if (isReactNative) {
            // React Native: must use initializeAuth (not getAuth) to set persistence.
            // initializeAuth can only be called ONCE per app; if it was already called
            // (e.g. hot-reload) it throws — catch that and fall back to getAuth.
            try {
                const AsyncStorage =
                    require('@react-native-async-storage/async-storage').default;
                // At runtime Metro resolves 'firebase/auth' to @firebase/auth's RN
                // bundle which exports getReactNativePersistence. The static TS types
                // (from the web entry) don't include it, so we require dynamically.
                const { getReactNativePersistence } =
                    require('@firebase/auth') as { getReactNativePersistence: (storage: any) => any };

                _auth = initializeAuth(app, {
                    persistence: getReactNativePersistence(AsyncStorage),
                });
                console.log('Firebase Auth initialized with AsyncStorage persistence');
            } catch (e) {
                // Two possible reasons:
                //  1. AsyncStorage require failed
                //  2. initializeAuth was already called (e.g. Fast Refresh)
                // In both cases, getAuth returns the existing instance.
                console.warn('initializeAuth failed, falling back to getAuth:', e.message);
                _auth = getAuth(app);
            }
        } else {
            // Web platform — getAuth handles everything automatically
            _auth = getAuth(app);
        }
    }
    return _auth;
}

export function getDbInstance() {
    if (!_db) {
        _db = getFirestore(getAppInstance());
    }
    return _db;
}

export function getStorageInstance() {
    if (!_storage) {
        _storage = getStorage(getAppInstance());
    }
    return _storage;
}

