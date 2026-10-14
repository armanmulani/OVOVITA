import React from 'react';

interface HubBannerProps {
  depotName?: string;
  leadName?: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const HubBanner: React.FC<HubBannerProps> = ({
  depotName = 'Depot Hub • Koramangala',
  leadName = 'Amit Patel (Admin / Lead)',
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[22px]">storefront</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-on-surface">{depotName}</h2>
            <div className="flex items-center gap-1.5 bg-secondary-fixed/50 text-on-secondary-fixed px-2 py-0.5 rounded-full text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              <span>Live Dispatch</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-outline">badge</span>
              {leadName}
            </span>
            <span>•</span>
            <span>Pincodes: 560034, 560095, 560068</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium transition"
        >
          <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}>
            sync
          </span>
          <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
        </button>
      </div>
    </div>
  );
};
