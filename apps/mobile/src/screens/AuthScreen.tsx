import React, { useState } from 'react';
import { mobileApi } from '../api';

interface AuthScreenProps {
  onAuthSuccess: (user: any, token: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [role, setRole] = useState<'customer' | 'staff'>('customer');
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('123456');
  const [pin, setPin] = useState('1234');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      await mobileApi.requestOtp(phone);
      setOtpSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP');
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
      setErrorMsg(err.message || 'OTP verification failed');
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
    <div className="flex-1 flex flex-col justify-center p-6 bg-surface">
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

      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-md">
        {/* Role Tab */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-container rounded-xl mb-4">
          <button
            type="button"
            onClick={() => {
              setRole('customer');
              setPhone('9876543210');
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

        {errorMsg && (
          <div className="mb-3 p-2 bg-error-container text-on-error-container text-xs rounded-lg font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">error</span>
            <span>{errorMsg}</span>
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
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm font-bold pl-12 pr-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                {isLoading ? 'Sending WhatsApp OTP...' : 'Get Instant WhatsApp OTP'}
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
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full text-center text-lg font-extrabold tracking-widest py-2 bg-surface border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:border-primary"
                />
                <span className="text-[11px] text-on-surface-variant mt-1 block text-center">
                  Demo OTP is pre-filled: <strong className="text-primary">123456</strong>
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                {isLoading ? 'Verifying...' : 'Verify & Enter Ovovita'}
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="w-full text-[11px] text-on-surface-variant hover:underline text-center mt-1"
              >
                Change Phone Number
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
                onChange={(e) => setPhone(e.target.value)}
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
              className="w-full py-2.5 bg-secondary hover:bg-secondaryDark text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              {isLoading ? 'Verifying...' : 'Access Driver POS'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
