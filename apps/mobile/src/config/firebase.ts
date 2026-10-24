import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase client configuration.
 *
 * Phone OTP is handled by the API server. Firebase Authentication provides
 * Google identity; the API verifies its ID token before issuing an app session.
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

/**
 * Formats a phone number to strict E.164 standard (+[country_code][digits]).
 * Strips whitespace, dashes, brackets, and handles leading zeros.
 */
export const formatToE164 = (phoneNumber: string, defaultCountryCode = '+91'): string => {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  const digitsOnly = cleaned.replace(/\D/g, '');
  // Standard 10-digit number
  if (digitsOnly.length === 10) {
    return `${defaultCountryCode}${digitsOnly}`;
  }
  // 11 digits with leading 0 (e.g. 09876543210)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return `${defaultCountryCode}${digitsOnly.slice(1)}`;
  }
  // 12 digits starting with 91 (e.g. 919876543210)
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }
  return `${defaultCountryCode}${digitsOnly}`;
};

/**
 * Validates whether a phone number matches standard E.164 pattern.
 */
export const isValidE164 = (phoneNumber: string): boolean => {
  return /^\+[1-9]\d{7,14}$/.test(phoneNumber);
};
