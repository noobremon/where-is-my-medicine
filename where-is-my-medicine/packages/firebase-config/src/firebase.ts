// Firebase configuration and initialization
// Uses lazy initialization to ensure all Firebase component registrations
// (e.g. @firebase/auth's registerAuth()) complete before services are accessed.
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Note: Firebase Auth imports are done dynamically to avoid registration issues

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

        try {
            if (isReactNative) {
                // For React Native, dynamically import Firebase Auth to avoid registration issues
                const firebaseAuth = require('firebase/auth');
                
                // First try to initialize with AsyncStorage if available
                try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    const { getReactNativePersistence } = firebaseAuth;
                    
                    if (getReactNativePersistence && AsyncStorage) {
                        _auth = firebaseAuth.initializeAuth(app, {
                            persistence: getReactNativePersistence(AsyncStorage),
                        });
                        console.log('Firebase Auth initialized with AsyncStorage for React Native');
                    } else {
                        throw new Error('AsyncStorage or getReactNativePersistence not available');
                    }
                } catch (asyncError) {
                    console.warn('AsyncStorage setup failed, using memory persistence:', asyncError.message);
                    // Fall back to initializeAuth without persistence
                    _auth = firebaseAuth.initializeAuth(app);
                    console.log('Firebase Auth initialized with memory persistence for React Native');
                }
            } else {
                // Web platform - use standard getAuth
                const { getAuth } = require('firebase/auth');
                _auth = getAuth(app);
                console.log('Firebase Auth initialized for web platform');
            }
        } catch (error) {
            console.error('Firebase Auth initialization failed:', error);
            throw new Error(`Firebase Auth initialization failed: ${error.message}`);
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
