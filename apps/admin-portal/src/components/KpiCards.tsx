import React from 'react';

interface KpiCardsProps {
  metrics: {
    totalOrdersCount: number;
    packingQueueCount: number;
    activeRunsCount: number;
    deliveredCount: number;
    totalCodCash: number;
    totalUpiDigital: number;
    totalRevenue: number;
  };
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Card 1: Orders & Pay-on-Delivery */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-high flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Orders Today
          </span>
          <span className="w-7 h-7 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
          </span>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-extrabold text-on-surface">{metrics.totalOrdersCount}</div>
          <div className="text-xs text-on-surface-variant mt-1 flex items-center justify-between">
            <span>COD Cash: <strong className="text-primary font-bold">₹{metrics.totalCodCash}</strong></span>
            <span>UPI: <strong className="text-secondary font-bold">₹{metrics.totalUpiDigital}</strong></span>
          </div>
        </div>
      </div>

      {/* Card 2: Packing Queue */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-high flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Packing Queue
          </span>
          <span className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[16px]">inventory_2</span>
          </span>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-extrabold text-primary">{metrics.packingQueueCount}</div>
          <div className="text-xs text-on-surface-variant mt-1">
            Candling & molded tray queue
          </div>
        </div>
      </div>

      {/* Card 3: Active Driver Runs */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-high flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Active Runs
          </span>
          <span className="w-7 h-7 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
            <span className="material-symbols-outlined text-[16px]">moped</span>
          </span>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-extrabold text-secondary">{metrics.activeRunsCount}</div>
          <div className="text-xs text-on-surface-variant mt-1">
            Live GPS route execution
          </div>
        </div>
      </div>

      {/* Card 4: Delivered & Zero Crack */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-high flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Delivered & Paid
          </span>
          <span className="w-7 h-7 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
            <span className="material-symbols-outlined text-[16px]">verified</span>
          </span>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-extrabold text-on-surface">{metrics.deliveredCount}</div>
          <div className="text-xs text-secondary font-bold mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">stars</span>
            100% Zero-Crack Success
          </div>
        </div>
      </div>
    </div>
  );
};
