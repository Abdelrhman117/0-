import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase client config is public by design — security comes from Firestore Rules
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyBntiUJmDMVbKGbhjIlyR0Vh8HjJD7RHKM',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'zero-2aa80.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'zero-2aa80',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'zero-2aa80.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1010120354709',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:1010120354709:web:6e87759b7814072637e49c',
};

const app  = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
