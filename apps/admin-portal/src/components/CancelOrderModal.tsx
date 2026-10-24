import React, { useEffect, useState } from 'react';

interface CancelOrderModalProps {
  isOpen: boolean;
  orderId: string | null;
  onClose: () => void;
  onConfirmCancel: (orderId: string, reason: string) => Promise<any>;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  orderId,
  onClose,
  onConfirmCancel,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
      setResult(null);
      setIsSubmitting(false);
    }
  }, [isOpen, orderId]);

  if (!isOpen || !orderId) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      setResult((await onConfirmCancel(orderId, reason.trim())) ?? {});
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
        className="bg-surface-container-lowest rounded-2xl max-w-md w-full shadow-2xl border border-surface-container-high p-5 animate-scaleUp"
      >
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[22px]">cancel</span>
            <h3 id="cancel-order-title" className="font-bold text-on-surface text-base">
              {result ? 'Order Cancelled' : 'Cancel Order'}
            </h3>
          </div>
          {!isSubmitting && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {result ? (
          <div className="py-4 space-y-3">
            <p className="text-sm text-on-surface">Order cancellation completed.</p>
            {result.refundOwed && (
              <div className="bg-error-container text-on-error-container p-3 rounded-xl text-sm">
                A refund of ₹{result.refundAmount} is owed to the customer. There is no payment
                gateway in this app, so please reverse it manually.
              </div>
            )}
            {result.requiresEggReturn && (
              <div className="bg-secondary-container text-on-secondary-container p-3 rounded-xl text-sm">
                The driver has these eggs and must return them to the shop.
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-3">
            <p className="text-sm text-on-surface-variant">
              Why is this order being cancelled? For a delivered order, this becomes the note on a
              refund the owner must action manually.
            </p>
            <div>
              <label
                htmlFor="cancel-order-reason"
                className="text-xs font-bold text-on-surface-variant block mb-1"
              >
                Cancellation reason (optional)
              </label>
              <textarea
                id="cancel-order-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                disabled={isSubmitting}
                className="w-full text-sm bg-surface border border-outline-variant/40 rounded-xl p-2.5 text-on-surface focus:outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg disabled:opacity-60"
              >
                Keep Order
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-error text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                <span>{isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
