import React from 'react';

interface HeaderProps {
  user: any;
  activeTab: 'dashboard' | 'history';
  onSelectTab: (tab: 'dashboard' | 'history') => void;
  onLogout: () => void;
  onOpenShiftModal: () => void;
  packingQueueCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  onSelectTab,
  onLogout,
  onOpenShiftModal,
  packingQueueCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-surface-container-high px-4 py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[24px]">egg</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs tracking-wider uppercase text-primary">Ovovita Portal</span>
              <span className="bg-secondary-fixed/60 text-on-secondary-fixed text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                Farm-Direct OS
              </span>
            </div>
            <h1 className="text-base font-bold text-on-surface leading-tight">Admin Operations</h1>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-surface-container-high/60 p-1 rounded-xl order-last sm:order-none w-full sm:w-auto justify-center">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'dashboard'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">hub</span>
            <span>Live Hub & Packing</span>
            {packingQueueCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'dashboard' ? 'bg-white/20 text-white' : 'bg-primary-fixed text-on-primary-fixed'
              }`}>
                {packingQueueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'history'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">history</span>
            <span>Order History</span>
            <span className="text-[9px] bg-secondary text-white px-1.5 py-0.2 rounded-full font-bold">
              New
            </span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-semibold transition"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">payments</span>
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
