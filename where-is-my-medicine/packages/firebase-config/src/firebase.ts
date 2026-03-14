// Firebase configuration and initialization
// Uses lazy initialization to ensure all Firebase component registrations
// (e.g. @firebase/auth's registerAuth()) complete before services are accessed.
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth as getFirebaseAuth, initializeAuth } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: 'AIzaSyB2OCMA0qsmEnUBiTfRzrFhALvs_vxS4Xo',
    authDomain: 'where-is-my-medicine-30e0a.firebaseapp.com',
    projectId: 'where-is-my-medicine-30e0a',
    storageBucket: 'where-is-my-medicine-30e0a.firebasestorage.app',
    messagingSenderId: '942251675078',
    appId: '1:942251675078:web:5792d2ab15291ccc5776c7',
};

// ── Lazy singletons ────────────────────────────────────────
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getAppInstance(): FirebaseApp {
    if (!_app) {
        _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    }
    return _app;
}

export function getAuthInstance(): Auth {
    if (!_auth) {
        const app = getAppInstance();
        const isReactNative =
            typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

        if (isReactNative) {
            const AsyncStorage =
                require('@react-native-async-storage/async-storage').default;
            try {
                _auth = initializeAuth(app, {
                    persistence: (firebaseAuth as any).getReactNativePersistence(
                        AsyncStorage
                    ),
                });
            } catch (_error) {
                // Fast refresh can re-run this module after auth is already initialised.
                _auth = getFirebaseAuth(app);
            }
        } else {
            _auth = getFirebaseAuth(app);
        }
    }
    return _auth;
}

export function getDbInstance(): Firestore {
    if (!_db) {
        _db = getFirestore(getAppInstance());
    }
    return _db;
}

export function getStorageInstance(): FirebaseStorage {
    if (!_storage) {
        _storage = getStorage(getAppInstance());
    }
    return _storage;
}
