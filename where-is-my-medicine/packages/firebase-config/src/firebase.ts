// Firebase configuration and initialization
// Replace these values with your actual Firebase project config
import { initializeApp } from 'firebase/app';
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

const app = initializeApp(firebaseConfig);

// For React Native, use initializeAuth with AsyncStorage persistence.
// For web, fall back to getAuth which uses browser persistence.
let auth: ReturnType<typeof getAuth>;
try {
    // These imports only resolve in React Native (Metro bundler)
    const { getReactNativePersistence: getRNPersistence } = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    auth = initializeAuth(app, {
        persistence: getRNPersistence(AsyncStorage),
    });
} catch (_e) {
    auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

