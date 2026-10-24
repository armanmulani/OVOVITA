import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { mobileApi } from '../api';
import { firebaseAuth, formatToE164, isFirebaseConfigured } from '../config/firebase';

interface AuthScreenProps {
  onAuthSuccess: (user: any, token: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [role, setRole] = useState<'customer' | 'staff'>('customer');
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('1234');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const mapAuthError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'INVALID_PHONE_NUMBER':
        return 'Invalid phone number. Enter a valid 10-digit Indian mobile number.';
      case 'INVALID_OTP':
        return 'The OTP code is incorrect or has expired. Please request a new one.';
      case 'TOO_MANY_ATTEMPTS':
        return 'Too many incorrect attempts. Please request a new OTP.';
      case 'OTP_EXPIRED':
        return 'The OTP has expired. Please request a new one.';
      case 'OTP_SEND_FAILED':
        return 'Could not send the OTP right now. Please try again in a moment.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many OTP requests. Please wait a minute before retrying.';
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
        return err?.message || 'Failed to send OTP. Please try again.';
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await mobileApi.requestOtp(phone);
      setDemoOtp(response.data?.demoOtp || '');
      setOtpSent(true);
    } catch (err: any) {
      console.error('[Phone Auth] sendOtp error:', err);
      setErrorMsg(mapAuthError(err));
    } finally {
      setIsLoading(false);
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await mobileApi.verifyOtp(phone, otp);
      onAuthSuccess(res.data.user, res.data.token);
    } catch (err: any) {
      console.error('[Phone Auth] verifyOtp error:', err);
      setErrorMsg(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await mobileApi.staffLogin(phone, pin, 'DELIVERY_EXECUTIVE');
      onAuthSuccess(res.data.user, res.data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Staff PIN verification failed');
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
            Farm-Direct Morning Harvest Egg Ordering & Delivery
          </p>
        </div>

        <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-3xl border border-surface-container shadow-md">
        {/* Auth Status Bar */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-surface-container">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-on-surface">
              Secure Phone OTP (Better Auth)
            </span>
          </div>
        </div>

        {/* Role Tab */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-container rounded-xl mb-3">
          <button
            type="button"
            onClick={() => {
              setRole('customer');
              setPhone('9876543210');
              setOtpSent(false);
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              role === 'customer'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Customer (Doorstep)
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('staff');
              setPhone('9876500002');
              setOtpSent(false);
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              role === 'staff'
                ? 'bg-surface text-secondary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Delivery Driver
          </button>
        </div>

        {/* Quick Select Account Chips */}
        <div className="mb-4">
          <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-1.5">
            Quick Select Account
          </div>
          {role === 'customer' ? (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPhone('9876543210');
                  setOtpSent(false);
                  setErrorMsg('');
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                  phone === '9876543210'
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-surface border-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                👤 Rahul Sharma (9876543210)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhone('9811223344');
                  setOtpSent(false);
                  setErrorMsg('');
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                  phone === '9811223344'
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-surface border-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                ✨ New Customer (9811223344)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhone('');
                  setOtpSent(false);
                  setErrorMsg('');
                }}
                className="text-[11px] px-2 py-1 rounded-lg border border-surface-container text-outline hover:bg-surface-container-high transition"
              >
                Custom #
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPhone('9876500002');
                  setPin('1234');
                  setErrorMsg('');
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                  phone === '9876500002'
                    ? 'bg-secondary/10 border-secondary text-secondary font-bold'
                    : 'bg-surface border-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                🛵 Ramesh (Koramangala)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhone('9876500003');
                  setPin('1234');
                  setErrorMsg('');
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                  phone === '9876500003'
                    ? 'bg-secondary/10 border-secondary text-secondary font-bold'
                    : 'bg-surface border-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                🛵 Suresh (Indiranagar)
              </button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-3 p-2.5 bg-error-container text-on-error-container text-xs rounded-xl font-medium flex items-start gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0 mt-0.5">error</span>
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {role === 'customer' ? (
          !otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Mobile Number (India)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-on-surface">+91</span>
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm font-bold pl-12 pr-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="text-[11px] text-on-surface-variant mt-1.5 flex items-center justify-between">
                  <span>
                    Sent to: <code className="text-primary font-mono font-semibold">{formatToE164(phone) || '+91...'}</code>
                  </span>
                </div>
                <div className="mt-2 p-2 bg-surface-container-high/60 rounded-lg text-[10px] text-on-surface-variant leading-relaxed">
                  {demoOtp ? (
                    <>💡 <strong>Development demo OTP:</strong> <code className="font-bold text-primary">{demoOtp}</code>. No SMS gateway is configured; real SMS requires MSG91 credentials.</>
                  ) : (
                    <>💡 <strong>Local development:</strong> If no SMS gateway is configured, the OTP appears in the API server console. Real SMS requires MSG91 credentials.</>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isLoading ? 'Requesting OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Enter 6-Digit Verification OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full text-center text-lg font-extrabold tracking-widest py-2 bg-surface border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:border-primary"
                />
                <span className="text-[11px] text-on-surface-variant mt-1 block text-center">
                  Enter the 6-digit code sent to <strong className="text-primary">{formatToE164(phone)}</strong>
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify & Enter Ovovita'}
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="w-full text-[11px] text-on-surface-variant hover:underline text-center mt-1"
              >
                ← Change Phone Number
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleStaffLogin} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Driver Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setDemoOtp('');
                }}
                className="w-full text-sm font-bold px-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Driver Security PIN
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-sm font-bold px-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:border-secondary tracking-widest"
              />
              <span className="text-[11px] text-on-surface-variant mt-1 block">
                Demo Driver PIN: <strong className="text-secondary">1234</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-secondary hover:bg-secondaryDark text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Access Driver POS'}
            </button>
          </form>
        )}
        {role === 'customer' && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
              <span className="h-px flex-1 bg-surface-container" />
              <span>Or continue with</span>
              <span className="h-px flex-1 bg-surface-container" />
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-surface border border-outline-variant/50 text-on-surface text-xs font-bold rounded-xl shadow-sm transition hover:bg-surface-container disabled:opacity-50"
            >
              <span className="text-base font-black text-[#4285F4]">G</span>
              Continue with Google
            </button>
            {!isFirebaseConfigured() && (
              <p className="mt-2 text-center text-[10px] text-on-surface-variant">
                Requires Firebase web settings and Google provider setup.
              </p>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
