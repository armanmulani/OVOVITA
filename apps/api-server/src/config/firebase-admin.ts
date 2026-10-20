import { initializeApp, getApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from './index';

const isFirebaseAdminConfigured = (): boolean => {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
};

let firebaseAdminApp: any = null;

if (isFirebaseAdminConfigured() && getApps().length === 0) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    firebaseAdminApp = initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    });
  } else {
    firebaseAdminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
  }
  console.log('[Firebase Admin] ✅ Initialized successfully');
} else if (!isFirebaseAdminConfigured()) {
  console.log('[Firebase Admin] ⚠️  Not configured — running in DEMO mode (OTP 123456 accepted)');
}

export const getFirebaseAdmin = (): any => {
  if (!firebaseAdminApp) {
    firebaseAdminApp = getApp();
  }
  return firebaseAdminApp;
};

export const getFirebaseAuth = (): any => {
  return getAuth(getFirebaseAdmin());
};

export { isFirebaseAdminConfigured };
