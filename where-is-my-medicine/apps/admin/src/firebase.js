// Firebase config for admin panel (same project, separate init for web)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB2OCMA0qsmEnUBiTfRzrFhALvs_vxS4Xo',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'where-is-my-medicine-30e0a.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'where-is-my-medicine-30e0a',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'where-is-my-medicine-30e0a.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '942251675078',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:942251675078:web:5792d2ab15291ccc5776c7',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export default app;

