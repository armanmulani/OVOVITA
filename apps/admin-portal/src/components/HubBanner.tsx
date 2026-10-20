import React from 'react';

interface DepotItem {
  _id: string;
  name: string;
  code: string;
  servicedPincodes: string[];
}

interface HubBannerProps {
  depotName?: string;
  leadName?: string;
  depots?: DepotItem[];
  selectedDepotId?: string;
  onSelectDepot?: (id: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const HubBanner: React.FC<HubBannerProps> = ({
  depotName = 'Depot Hub • Koramangala',
  leadName = 'Amit Patel (Admin / Lead)',
  depots = [],
  selectedDepotId,
  onSelectDepot,
  onRefresh,
  isRefreshing,
}) => {
  const currentDepot = depots.find((d) => d._id === selectedDepotId);
  const activeName = currentDepot ? currentDepot.name : depotName;
  const pincodesText = currentDepot
    ? `Pincodes: ${currentDepot.servicedPincodes.slice(0, 4).join(', ')}${currentDepot.servicedPincodes.length > 4 ? '...' : ''}`
    : 'Pincodes: 560034, 560095, 560068';

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[22px]">storefront</span>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {depots.length > 1 ? (
              <div className="relative">
                <select
                  value={selectedDepotId || ''}
                  onChange={(e) => onSelectDepot && onSelectDepot(e.target.value)}
                  className="bg-surface-container font-bold text-sm text-on-surface rounded-lg px-2.5 py-1 border border-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer pr-7"
                >
                  {depots.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <h2 className="text-base font-bold text-on-surface">{activeName}</h2>
            )}

            <div className="flex items-center gap-1.5 bg-secondary-fixed/50 text-on-secondary-fixed px-2 py-0.5 rounded-full text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              <span>Live Dispatch</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-1">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-outline">badge</span>
              {leadName}
            </span>
            <span>•</span>
            <span>{pincodesText}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium transition active:scale-95"
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
