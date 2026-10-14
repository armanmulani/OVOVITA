import React, { useState } from 'react';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onInwardBatch: (productId: string, qty: number, note?: string) => Promise<any>;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({
  isOpen,
  onClose,
  product,
  onInwardBatch,
}) => {
  const [qty, setQty] = useState<number>(100);
  const [note, setNote] = useState<string>('Morning Harvest Batch #4 from Mandya Organic Farm');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onInwardBatch(product._id, qty, note);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to inward batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full shadow-2xl border border-surface-container-high p-5 animate-scaleUp">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">add_box</span>
            <h3 className="font-bold text-on-surface text-base">Inward Egg Batch to Depot</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-3">
          <div className="bg-surface-container-low p-3 rounded-xl">
            <div className="text-xs text-on-surface-variant">Product:</div>
            <div className="text-sm font-bold text-on-surface">{product.name}</div>
            <div className="text-xs text-primary font-semibold mt-0.5">
              Current Stock: {product.currentStock} eggs (Threshold: {product.lowStockThreshold})
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">
              Inward Batch Quantity (Eggs)
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[100, 200, 500].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setQty(preset)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                    qty === preset
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface border-outline-variant/40 text-on-surface hover:bg-surface-container'
                  }`}
                >
                  +{preset} Eggs
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              className="w-full text-base font-bold px-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">
              Batch Inward Note / Farm Source
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full text-xs bg-surface border border-outline-variant/40 rounded-xl p-2.5 text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>{isSubmitting ? 'Inwarding...' : `Add +${qty} Eggs`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
