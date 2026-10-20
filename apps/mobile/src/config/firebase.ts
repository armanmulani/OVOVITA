import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || '',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || '',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '',
};

/**
 * Returns true when Firebase env vars are configured (production mode).
 * Returns false when running in dev/demo mode without Firebase keys.
 */
export const isFirebaseConfigured = (): boolean => {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
};

const app = isFirebaseConfigured() && getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0] || null;

export const firebaseAuth = app ? getAuth(app) : null;

/**
 * Set up invisible reCAPTCHA verifier on a DOM element.
 * Must be called once before signInWithPhoneNumber.
 */
export const setupRecaptcha = (containerId: string): RecaptchaVerifier | null => {
  if (!firebaseAuth) return null;

  // Clear any existing verifier
  if ((window as any).__ovovitaRecaptcha) {
    try {
      (window as any).__ovovitaRecaptcha.clear();
    } catch (_) { /* ignore */ }
  }

  const verifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved — will proceed with signInWithPhoneNumber
    },
    'expired-callback': () => {
      console.warn('[Firebase] reCAPTCHA expired. User may need to retry.');
    },
  });

  (window as any).__ovovitaRecaptcha = verifier;
  return verifier;
};

/**
 * Send OTP to a phone number using Firebase Phone Auth.
 * Returns a ConfirmationResult to verify the OTP later.
 */
export const sendFirebaseOtp = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  if (!firebaseAuth) {
    throw new Error('Firebase is not configured');
  }
  // Firebase requires E.164 format: +91XXXXXXXXXX
  const e164 = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
  return signInWithPhoneNumber(firebaseAuth, e164, recaptchaVerifier);
};

/**
 * Verify the OTP code entered by the user.
 * Returns the Firebase ID token for backend verification.
 */
export const verifyFirebaseOtp = async (
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<string> => {
  const userCredential = await confirmationResult.confirm(otpCode);
  const idToken = await userCredential.user.getIdToken();
  return idToken;
};
