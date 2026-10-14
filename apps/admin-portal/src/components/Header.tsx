import React from 'react';

interface HeaderProps {
  user: any;
  onLogout: () => void;
  onOpenShiftModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onOpenShiftModal }) => {
  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-surface-container-high px-4 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[24px]">egg</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wider uppercase text-primary">Ovovita Portal</span>
              <span className="bg-secondary-fixed/60 text-on-secondary-fixed text-xs px-2 py-0.5 rounded-full font-semibold">
                Farm-Direct OS
              </span>
            </div>
            <h1 className="text-lg font-bold text-on-surface leading-tight">Admin Inventory & Orders</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface text-sm font-semibold transition"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">payments</span>
            <span>Shift Cash Close</span>
          </button>

          <div className="h-6 w-px bg-outline-variant/30 mx-1"></div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-on-surface">{user?.name || 'Amit Patel'}</div>
              <div className="text-xs text-primary font-medium">{user?.role || 'SHOPKEEPER'}</div>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-error-container hover:text-error flex items-center justify-center text-on-surface-variant transition"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
