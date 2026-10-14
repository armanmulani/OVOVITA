import React, { useState } from 'react';

interface ProfileScreenProps {
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const [morningReminder, setMorningReminder] = useState(true);
  const [whatsappReceipts, setWhatsappReceipts] = useState(true);

  return (
    <div className="flex-1 flex flex-col pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-4 py-3 border-b border-surface-container shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">
            OV
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold text-primary tracking-wider">Ovovita</span>
            <h2 className="text-sm font-bold text-on-surface">Profile & Settings</h2>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="text-xs font-semibold text-error hover:bg-error-container/30 px-2.5 py-1 rounded-lg transition"
        >
          Sign Out
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* Profile Hero Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl border-2 border-primary/20">
              RS
            </div>
            <span className="absolute -bottom-1 -right-1 bg-secondary text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] shadow">
              <span className="material-symbols-outlined text-[12px]">verified</span>
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface truncate">Rahul Sharma</h3>
              <span className="text-[10px] bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-bold">
                Gold Member
              </span>
            </div>
            <div className="text-xs text-on-surface-variant mt-0.5">+91 98765 43210</div>
            <div className="text-xs text-on-surface-variant truncate">rahul.sharma@gmail.com</div>
          </div>
        </div>

        {/* Quick Metrics Bento Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-surface-container-low rounded-xl text-center border border-surface-container">
            <div className="text-lg font-extrabold text-primary">28</div>
            <div className="text-[10px] text-on-surface-variant mt-0.5 font-medium">Orders Placed</div>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl text-center border border-surface-container">
            <div className="text-lg font-extrabold text-on-surface">34</div>
            <div className="text-[10px] text-on-surface-variant mt-0.5 font-medium">Trays Delivered</div>
          </div>
          <div className="p-3 bg-secondary-container/50 rounded-xl text-center border border-secondary/20">
            <div className="text-lg font-extrabold text-secondary flex items-center justify-center gap-0.5">
              <span>5.0</span>
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
            </div>
            <div className="text-[10px] text-secondary font-bold mt-0.5">Zero-Crack</div>
          </div>
        </div>

        {/* Saved Addresses Section */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Saved Delivery Addresses
            </h4>
            <span className="text-xs font-bold text-primary cursor-pointer hover:underline">
              + Add New
            </span>
          </div>

          <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">home</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface">Home (Default)</span>
                  <span className="text-[9px] bg-secondary-container text-on-secondary-container px-1.5 py-0.2 rounded font-bold">
                    Koramangala Hub Serviced
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Flat 402, Silver Oak Heights, 5th Main, Koramangala, Bengaluru - 560034
                </p>
                <div className="text-[11px] text-outline mt-1 italic">
                  Note: Leave with security guard if bell not answered
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Morning Harvest Preferences */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Fresh Harvest Alerts & Preferences
          </h4>

          <div className="flex items-center justify-between py-1">
            <div>
              <div className="text-xs font-bold text-on-surface">Daily 6:30 AM Harvest Reminder</div>
              <div className="text-[11px] text-on-surface-variant">
                Alert when farm harvest crates arrive at depot
              </div>
            </div>
            <input
              type="checkbox"
              checked={morningReminder}
              onChange={(e) => setMorningReminder(e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer rounded"
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-surface-container pt-2">
            <div>
              <div className="text-xs font-bold text-on-surface">WhatsApp Order & Dispatch Receipts</div>
              <div className="text-[11px] text-on-surface-variant">
                Receive rider GPS details and POD due snapshot
              </div>
            </div>
            <input
              type="checkbox"
              checked={whatsappReceipts}
              onChange={(e) => setWhatsappReceipts(e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
