import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase client configuration.
 *
 * Firebase Authentication provides Google identity; the API verifies its ID
 * token before issuing an app session.
 */

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || '',
  authDomain:
    (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN ||
    `${(import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || ''}.firebaseapp.com`,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || '',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '',
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const isFirebaseConfigured = (): boolean => {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
};

const app = isFirebaseConfigured() && getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0] || null;

export const firestoreDb = app ? getFirestore(app) : null;
export const firebaseAuth = app ? getAuth(app) : null;
export { app as firebaseApp };
