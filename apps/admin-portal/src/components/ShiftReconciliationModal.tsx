import React, { useState } from 'react';

interface ShiftReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: any[];
  onConfirmReconciliation: (data: {
    depotId: string;
    deliveryPersonId: string;
    shiftDate: string;
    physicalCashDeposited: number;
    managerNotes?: string;
  }) => Promise<any>;
}

export const ShiftReconciliationModal: React.FC<ShiftReconciliationModalProps> = ({
  isOpen,
  onClose,
  drivers,
  onConfirmReconciliation,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?._id || '');
  const [physicalCash, setPhysicalCash] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await onConfirmReconciliation({
        depotId: 'demo_depot',
        deliveryPersonId: selectedDriverId || drivers[0]?._id,
        shiftDate: today,
        physicalCashDeposited: parseFloat(physicalCash) || 0,
        managerNotes: notes,
      });
      setResult(res.data);
    } catch (err: any) {
      alert(err.message || 'Failed to reconcile shift drawer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full shadow-2xl border border-surface-container-high p-5 animate-scaleUp">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">point_of_sale</span>
            <h3 className="font-bold text-on-surface text-base">Shift Cash Drawer Close</h3>
          </div>
          <button
            onClick={() => {
              setResult(null);
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {result ? (
          <div className="py-4 space-y-3">
            <div
              className={`p-3 rounded-xl flex items-center gap-2.5 ${
                result.status === 'BALANCED'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">
                {result.status === 'BALANCED' ? 'check_circle' : 'warning'}
              </span>
              <div>
                <h4 className="font-bold text-sm">
                  {result.status === 'BALANCED' ? 'Shift Drawer Balanced Perfectly!' : 'Discrepancy Logged'}
                </h4>
                <p className="text-xs">
                  {result.status === 'BALANCED'
                    ? 'Physical cash exactly matched expected COD deliveries.'
                    : `Variance of ₹${result.varianceAmount}. Supervisor override recorded.`}
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Driver:</span>
                <span className="font-bold text-on-surface">{result.deliveryPersonName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Delivered Runs:</span>
                <span className="font-bold text-on-surface">{result.ordersDeliveredCount} orders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Expected Cash:</span>
                <span className="font-bold text-primary">₹{result.expectedCashAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Deposited Cash:</span>
                <span className="font-bold text-on-surface">₹{result.physicalCashDeposited}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">UPI QR Collections:</span>
                <span className="font-bold text-secondary">₹{result.upiTotalAmount}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setResult(null);
                onClose();
              }}
              className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-xl mt-2 shadow-sm"
            >
              Done & Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Select Delivery Partner
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full text-sm bg-surface border border-outline-variant/40 rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:border-primary"
              >
                {drivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.phoneNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Physical Cash Deposited in Drawer (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-primary">₹</span>
                <input
                  type="number"
                  step="1"
                  required
                  value={physicalCash}
                  onChange={(e) => setPhysicalCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-base font-bold pl-8 pr-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <span className="text-[11px] text-on-surface-variant mt-1 block">
                Count notes and physical currency handed over at depot counter.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Shift Supervisor Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. 2 broken eggs accounted from buffer crate, all morning harvest runs completed"
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
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>{isSubmitting ? 'Balancing...' : 'Verify & Close Shift'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
