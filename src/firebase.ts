import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID,
} = import.meta.env;

export const firebaseConfigured =
  !!VITE_FIREBASE_API_KEY &&
  !!VITE_FIREBASE_PROJECT_ID &&
  !!VITE_FIREBASE_APP_ID;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (firebaseConfigured) {
  app  = getApps().length === 0
    ? initializeApp({
        apiKey:            VITE_FIREBASE_API_KEY,
        authDomain:        VITE_FIREBASE_AUTH_DOMAIN,
        projectId:         VITE_FIREBASE_PROJECT_ID,
        storageBucket:     VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId:             VITE_FIREBASE_APP_ID,
      })
    : getApp();

  auth = getAuth(app!);
  db   = getFirestore(app!);
}

export { auth, db };
export default app!;
