import React from 'react';

interface LowStockBannerProps {
  criticalProducts: any[];
  onOpenAddBatch: (product: any) => void;
}

export const LowStockBanner: React.FC<LowStockBannerProps> = ({
  criticalProducts,
  onOpenAddBatch,
}) => {
  if (!criticalProducts || criticalProducts.length === 0) return null;

  const targetProduct = criticalProducts[0];

  return (
    <div className="bg-error-container text-on-error-container rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-error/20 animate-fadeIn">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-error text-[26px] flex-shrink-0 mt-0.5">
          warning
        </span>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider font-extrabold text-error">
              Critical Stock Level
            </span>
            <span className="text-xs bg-error text-white font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">chat</span>
              WhatsApp Alert Sent
            </span>
          </div>
          <p className="text-sm font-medium mt-1">
            <strong>{targetProduct.name}</strong> down to{' '}
            <span className="underline decoration-2 font-bold text-error">
              {targetProduct.currentStock} eggs
            </span>{' '}
            (Depot min threshold: {targetProduct.lowStockThreshold}).
          </p>
          <span className="text-xs opacity-90 flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">send_to_mobile</span>
            Alerted Farm Logistics & Mandya Organic Pasture Farm
          </span>
        </div>
      </div>

      <button
        onClick={() => onOpenAddBatch(targetProduct)}
        className="self-start sm:self-auto px-4 py-2 bg-tertiary hover:bg-tertiary-container text-on-tertiary rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition"
      >
        <span className="material-symbols-outlined text-[18px]">add_box</span>
        <span>+ Add Batch Inward</span>
      </button>
    </div>
  );
};
