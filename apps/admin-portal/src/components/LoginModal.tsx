import React, { useState } from 'react';

interface LoginModalProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('9876500001');
  const [pin, setPin] = useState('1234');
  const [role, setRole] = useState<'SHOPKEEPER' | 'DELIVERY_EXECUTIVE' | 'SYSTEM_ADMIN'>('SHOPKEEPER');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:4000/api/v1/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, pin, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      onLoginSuccess(data.data.user, data.data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl shadow-xl border border-surface-container-high p-6 animate-scaleUp">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-primary mx-auto flex items-center justify-center text-white shadow-md mb-2">
            <span className="material-symbols-outlined text-[32px]">egg</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface">Ovovita Portal</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Depot Hub Inventory, Orders & Fleet Access
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Role selector tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-container rounded-xl">
            <button
              type="button"
              onClick={() => {
                setRole('SHOPKEEPER');
                setPhoneNumber('9876500001');
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition ${
                role === 'SHOPKEEPER'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Shop / Depot Lead
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('DELIVERY_EXECUTIVE');
                setPhoneNumber('9876500002');
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition ${
                role === 'DELIVERY_EXECUTIVE'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Delivery Partner
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('SYSTEM_ADMIN');
                setPhoneNumber('9876500000');
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition ${
                role === 'SYSTEM_ADMIN'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              System Admin
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">
              Registered Mobile Number
            </label>
            <input
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full text-sm font-semibold px-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">
              Security PIN
            </label>
            <input
              type="password"
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full text-sm font-semibold px-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:border-primary tracking-widest"
            />
            <span className="text-[11px] text-on-surface-variant mt-1 block">
              Default Demo PIN: <strong className="text-primary">1234</strong>
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-primary hover:bg-primary-container text-white text-sm font-bold rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 mt-2"
          >
            <span className="material-symbols-outlined text-[18px]">lock_open</span>
            <span>{isLoading ? 'Verifying PIN...' : 'Access Portal'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
