import React from 'react';

interface OrderPackingQueueProps {
  orders: any[];
  drivers: any[];
  onAssignRider: (orderId: string, driverId: string) => void;
}

export const OrderPackingQueue: React.FC<OrderPackingQueueProps> = ({
  orders,
  drivers,
  onAssignRider,
}) => {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">package_2</span>
          <h3 className="font-bold text-on-surface text-base">Packing & Dispatch Queue</h3>
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

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <select
                    defaultValue={drivers[0]?._id || ''}
                    id={`driver-select-${order._id}`}
                    className="text-xs bg-surface border border-outline-variant/40 rounded-lg px-2 py-1.5 text-on-surface focus:outline-none focus:border-primary"
                  >
                    {drivers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.phoneNumber})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      const selectEl = document.getElementById(
                        `driver-select-${order._id}`
                      ) as HTMLSelectElement;
                      const driverId = selectEl ? selectEl.value : drivers[0]?._id;
                      if (driverId) onAssignRider(order._id, driverId);
                    }}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 active:scale-95 transition"
                  >
                    <span className="material-symbols-outlined text-[15px]">send</span>
                    <span>Dispatch</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
