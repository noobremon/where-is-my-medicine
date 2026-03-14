// Firebase configuration and initialization
// Uses lazy initialization to ensure all Firebase component registrations
// (e.g. @firebase/auth's registerAuth()) complete before services are accessed.
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: 'AIzaSyB2OCMA0qsmEnUBiTfRzrFhALvs_vxS4Xo',
    authDomain: 'where-is-my-medicine-30e0a.firebaseapp.com',
    projectId: 'where-is-my-medicine-30e0a',
    storageBucket: 'where-is-my-medicine-30e0a.firebasestorage.app',
    messagingSenderId: '942251675078',
    appId: '1:942251675078:web:5792d2ab15291ccc5776c7',
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
            try {
                // Import AsyncStorage dynamically to avoid bundling issues
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                // Access getReactNativePersistence via require to avoid
                // dual-import issues with Metro's module resolution.
                const { getReactNativePersistence } = require('firebase/auth');
                _auth = initializeAuth(app, {
                    persistence: getReactNativePersistence(AsyncStorage),
                });
            } catch (error) {
                console.warn('Firebase Auth AsyncStorage setup failed, falling back to memory persistence:', error);
                // Fast refresh or hot reload may re-run this after auth
                // is already initialised — fall back to getAuth.
                _auth = getAuth(app);
            }
        } else {
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
