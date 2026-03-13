// Firebase configuration and initialization
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import {
    getAuth as getFirebaseAuth,
    getReactNativePersistence,
    initializeAuth,
} from '@firebase/auth';
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const isReactNative =
    typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

let auth: Auth;

if (isReactNative) {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;

    try {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    } catch (_error) {
        // Fast refresh can re-run this module after auth is already initialised.
        auth = getFirebaseAuth(app);
    }
} else {
    auth = getFirebaseAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

