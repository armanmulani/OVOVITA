import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { mobileApi } from '../api';
import { firebaseAuth, isFirebaseConfigured } from '../config/firebase';

interface AuthScreenProps {
  onAuthSuccess: (user: any, token: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const mapAuthError = (err: any): string => {
    switch (err?.code) {
      case 'GOOGLE_AUTH_NOT_CONFIGURED':
        return 'Google sign-in is not configured yet. Add the Firebase web API key to the root .env and enable Google in Firebase Authentication.';
      case 'INVALID_GOOGLE_TOKEN':
      case 'INVALID_GOOGLE_ACCOUNT':
        return 'Google could not verify this account. Please try again.';
      case 'GOOGLE_ACCOUNT_NOT_ALLOWED':
        return 'This Google account is not registered as an Ovovita customer.';
      case 'GOOGLE_AUTH_UNAVAILABLE':
        return 'Google sign-in is temporarily unavailable. Please try again.';
      default:
        return err?.message || 'Google sign-in failed. Please try again.';
    }
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured() || !firebaseAuth) {
      setErrorMsg(
        'Google sign-in needs Firebase web app settings. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID to the root .env.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const idToken = await credential.user.getIdToken();
      const response = await mobileApi.googleLogin(idToken);
      onAuthSuccess(response.data.user, response.data.token);
    } catch (err: any) {
      console.error('[Google Auth] sign-in error:', err);
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setErrorMsg('Add localhost to Authorized domains in Firebase Console → Authentication → Settings.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg('Enable the Google provider in Firebase Console → Authentication → Sign-in method.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Your browser blocked the Google sign-in popup. Allow popups and try again.');
      } else {
        setErrorMsg(mapAuthError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 bg-surface min-h-screen">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-primary mx-auto flex items-center justify-center text-white shadow-lg mb-3">
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              egg
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-on-surface">Ovovita</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Farm-Direct Morning Harvest Egg Ordering &amp; Delivery
          </p>
        </div>

        <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-3xl border border-surface-container shadow-md">
          <div className="text-center mb-5">
            <h2 className="text-sm font-bold text-on-surface">Welcome to Ovovita</h2>
            <p className="text-xs text-on-surface-variant mt-1">Sign in securely with your Google account</p>
          </div>

          {errorMsg && (
            <div className="mb-3 p-2.5 bg-error-container text-on-error-container text-xs rounded-xl font-medium flex items-start gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0 mt-0.5">error</span>
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3 bg-surface border border-outline-variant/50 text-on-surface text-sm font-bold rounded-xl shadow-sm transition hover:bg-surface-container disabled:opacity-50"
          >
            <span className="text-base font-black text-[#4285F4]">G</span>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {!isFirebaseConfigured() && (
            <p className="mt-3 text-center text-[10px] text-on-surface-variant">
              Google sign-in requires Firebase web settings and Google provider setup.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
