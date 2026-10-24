import React from 'react';

interface OrderPackingQueueProps {
  orders: any[];
  drivers: any[];
  onAssignRider: (orderId: string, driverId: string) => void;
  onConfirmOrder: (orderId: string) => void;
  onStartPacking: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  PLACED: 'Awaiting Confirmation',
  CONFIRMED: 'Confirmed — Not Packed',
  PACKING: 'Packing Now',
  READY_FOR_DELIVERY: 'Ready for Driver',
};

const STATUS_BADGE: Record<string, string> = {
  PLACED: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  CONFIRMED: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
  PACKING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  READY_FOR_DELIVERY: 'bg-secondary-container/60 text-on-secondary-container border-secondary/30',
};

export const OrderPackingQueue: React.FC<OrderPackingQueueProps> = ({
  orders,
  drivers,
  onAssignRider,
  onConfirmOrder,
  onStartPacking,
  onMarkReady,
  onCancelOrder,
}) => {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">package_2</span>
          <h3 className="font-bold text-on-surface text-base">Packing &amp; Dispatch Queue</h3>
          <span className="text-xs bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-bold">
            {orders.length} Pending
          </span>
        </div>
        <span className="text-xs text-on-surface-variant font-medium">Morning Rush Priority</span>
      </div>

      {orders.length === 0 ? (
        <div className="py-8 text-center text-on-surface-variant text-sm flex flex-col items-center">
          <span className="material-symbols-outlined text-[36px] text-outline-variant mb-1">check_circle</span>
          <span>All orders are currently packed and dispatched!</span>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const firstItem = order.items?.[0];
            const status = order.status as string;

            return (
              <div
                key={order._id || order.id}
                className="bg-surface-container-low rounded-xl p-3 border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[20px]">egg</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-on-surface">{order.orderNumber}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.2 rounded-full border ${
                          STATUS_BADGE[status] ||
                          'bg-surface-container text-on-surface-variant border-surface-container-high'
                        }`}
                      >
                        {STATUS_LABEL[status] || status}
                      </span>
                      <span className="text-[11px] bg-secondary-container text-on-secondary-container px-2 py-0.2 rounded-full font-semibold">
                        {order.deliverySlot === 'MORNING_RUSH' ? 'Morning Rush (6:30 - 8:00 AM)' : 'Evening Drop'}
                      </span>
                      <span className="text-[11px] bg-primary-fixed/80 text-on-primary-fixed px-1.5 py-0.2 rounded font-medium">
                        {order.paymentMethod === 'UPI_ON_DELIVERY' ? 'Doorstep UPI' : 'Cash on Delivery'}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-on-surface mt-1">
                      {firstItem ? `${firstItem.quantity}x ${firstItem.productName} (${firstItem.unit})` : 'Egg Order'}
                    </p>

                    <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-2">
                      <span>{order.customerName}</span>
                      <span>•</span>
                      <span>{order.deliveryAddress?.flatPlotNumber}, {order.deliveryAddress?.apartmentName || order.deliveryAddress?.streetName}</span>
                      <span>•</span>
                      <strong className="text-primary">₹{order.finalPayableAmount}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                  {/* PLACED — the shop has not accepted the order yet, so no
                      stock is held and it can be cancelled freely. */}
                  {status === 'PLACED' && (
                    <>
                      <button
                        onClick={() => onConfirmOrder(order._id)}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 active:scale-95 transition"
                      >
                        <span className="material-symbols-outlined text-[15px]">task_alt</span>
                        <span>Confirm</span>
                      </button>
                      <button
                        onClick={() => onCancelOrder(order._id)}
                        className="px-2.5 py-1.5 bg-surface-container hover:bg-error/15 text-on-surface rounded-lg font-bold text-xs flex items-center gap-1 active:scale-95 transition"
                        title="Cancel this order (no stock is held yet)"
                      >
                        <span className="material-symbols-outlined text-[15px] text-error">cancel</span>
                        <span>Cancel</span>
                      </button>
                    </>
                  )}

                  {/* CONFIRMED — stock is held; packing can start. */}
                  {status === 'CONFIRMED' && (
                    <>
                      <button
                        onClick={() => onStartPacking(order._id)}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 active:scale-95 transition"
                      >
                        <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                        <span>Start Packing</span>
                      </button>
                      <button
                        onClick={() => onCancelOrder(order._id)}
                        className="px-2.5 py-1.5 bg-surface-container hover:bg-error/15 text-on-surface rounded-lg font-bold text-xs flex items-center gap-1 active:scale-95 transition"
                        title="Cancel this order (stock is released back)"
                      >
                        <span className="material-symbols-outlined text-[15px] text-error">cancel</span>
                        <span>Cancel</span>
                      </button>
                    </>
                  )}

                  {/* PACKING — the eggs are in the tray. */}
                  {status === 'PACKING' && (
                    <>
                      <button
                        onClick={() => onMarkReady(order._id)}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 active:scale-95 transition"
                      >
                        <span className="material-symbols-outlined text-[15px]">done_all</span>
                        <span>Packing Done</span>
                      </button>
                      <button
                        onClick={() => onCancelOrder(order._id)}
                        className="px-2.5 py-1.5 bg-surface-container hover:bg-error/15 text-on-surface rounded-lg font-bold text-xs flex items-center gap-1 active:scale-95 transition"
                        title="Cancel this order (packed eggs go back to the shelf)"
                      >
                        <span className="material-symbols-outlined text-[15px] text-error">cancel</span>
                        <span>Cancel</span>
                      </button>
                    </>
                  )}

                  {/* READY_FOR_DELIVERY — needs a driver. */}
                  {status === 'READY_FOR_DELIVERY' &&
                    (() => {
                      const sortedDrivers = [...drivers].sort((a, b) => {
                        if (a.phoneNumber === '9876500002') return -1;
                        if (b.phoneNumber === '9876500002') return 1;
                        return a.name.localeCompare(b.name);
                      });
                      const defaultDriverId = sortedDrivers[0]?._id || '';

                      return (
                        <>
                          <select
                            defaultValue={defaultDriverId}
                            id={`driver-select-${order._id}`}
                            className="text-xs bg-surface border border-outline-variant/40 rounded-lg px-2 py-1.5 text-on-surface focus:outline-none focus:border-primary font-semibold"
                          >
                            {sortedDrivers.map((d) => (
                              <option key={d._id} value={d._id}>
                                🛵 {d.name} {d.phoneNumber === '9876500002' ? '(KA-01-EQ-9872)' : `(${d.phoneNumber})`}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => {
                              const selectEl = document.getElementById(
                                `driver-select-${order._id}`
                              ) as HTMLSelectElement;
                              const driverId = selectEl ? selectEl.value : defaultDriverId;
                              if (driverId) onAssignRider(order._id, driverId);
                            }}
                            className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 active:scale-95 transition"
                          >
                            <span className="material-symbols-outlined text-[15px]">send</span>
                            <span>Dispatch</span>
                          </button>

                          <button
                            onClick={() => onCancelOrder(order._id)}
                            className="px-2.5 py-1.5 bg-surface-container hover:bg-error/15 text-on-surface rounded-lg font-bold text-xs flex items-center gap-1 active:scale-95 transition"
                            title="Cancel this order (stock is released back)"
                          >
                            <span className="material-symbols-outlined text-[15px] text-error">cancel</span>
                            <span>Cancel</span>
                          </button>
                        </>
                      );
                    })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
