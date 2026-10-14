import React, { useState } from 'react';

interface PriceMasterProps {
  products: any[];
  onUpdatePrice: (productId: string, unitPricing: any[]) => void;
  onOpenAddBatch: (product: any) => void;
}

export const PriceMaster: React.FC<PriceMasterProps> = ({
  products,
  onUpdatePrice,
  onOpenAddBatch,
}) => {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [tempPricing, setTempPricing] = useState<any[]>([]);

  const startEdit = (product: any) => {
    setEditingProductId(product._id);
    setTempPricing(JSON.parse(JSON.stringify(product.unitPricing || [])));
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    const updated = [...tempPricing];
    updated[index].price = newPrice;
    setTempPricing(updated);
  };

  const handleSave = (productId: string) => {
    onUpdatePrice(productId, tempPricing);
    setEditingProductId(null);
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">currency_rupee</span>
          <h3 className="font-bold text-on-surface text-base">Live Price & Inventory Master</h3>
        </div>
        <span className="text-xs text-on-surface-variant font-medium">WebSocket Live Broadcast Active</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {products.map((product) => {
          const isEditing = editingProductId === product._id;
          const isLowStock = product.currentStock <= product.lowStockThreshold;

          return (
            <div
              key={product._id}
              className={`rounded-xl p-3 border ${
                isLowStock
                  ? 'border-error/40 bg-error-container/20'
                  : 'border-surface-container bg-surface-container-low'
              } flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-on-surface">{product.name}</h4>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-surface-container text-on-surface-variant">
                        {product.type}
                      </span>
                    </div>
                    <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-secondary">eco</span>
                      <span>{product.farmOriginName}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isLowStock
                          ? 'bg-error text-white'
                          : 'bg-secondary-container text-on-secondary-container'
                      }`}
                    >
                      {product.currentStock} eggs left
                    </span>
                  </div>
                </div>

                {/* Tiers */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(isEditing ? tempPricing : product.unitPricing || []).map((tier: any, idx: number) => (
                    <div key={tier.unit} className="bg-surface rounded-lg p-2 text-center border border-surface-container">
                      <div className="text-[10px] text-on-surface-variant font-semibold">{tier.label}</div>
                      {isEditing ? (
                        <div className="mt-1 flex items-center justify-center">
                          <span className="text-xs text-primary font-bold">₹</span>
                          <input
                            type="number"
                            step="0.5"
                            value={tier.price}
                            onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-14 text-center font-bold text-sm bg-surface-container-high rounded border border-outline-variant px-1"
                          />
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-primary mt-1">₹{tier.price}</div>
                      )}
                      {tier.savingsPercent ? (
                        <div className="text-[9px] text-secondary font-bold mt-0.5">Save {tier.savingsPercent}%</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-surface-container flex items-center justify-between">
                <button
                  onClick={() => onOpenAddBatch(product)}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>+ Inward Batch</span>
                </button>

                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingProductId(null)}
                      className="px-2 py-1 text-xs text-on-surface-variant font-semibold hover:bg-surface-container rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(product._id)}
                      className="px-2.5 py-1 bg-secondary hover:bg-secondaryDark text-white text-xs font-bold rounded shadow-sm"
                    >
                      Save Live Rates
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(product)}
                    className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    <span>Edit Rates</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
