import React from 'react';

interface OrderDetailModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-secondary/15 text-secondary border-secondary/30';
      case 'OUT_FOR_DELIVERY':
        return 'bg-primary-fixed text-on-primary-fixed border-primary/30';
      case 'PACKING':
      case 'READY_FOR_DELIVERY':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'CONFIRMED':
      case 'PLACED':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'CANCELLED':
        return 'bg-error/15 text-error border-error/30';
      default:
        return 'bg-surface-container text-on-surface-variant border-surface-container-high';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalEggs = order.items?.reduce((sum: number, it: any) => sum + (it.totalEggsCount || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-container bg-surface-container-low/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-on-surface">#{order.orderNumber}</h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(order.status)}`}>
                  {order.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Placed on {new Date(order.createdAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print Order Receipt"
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface transition"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Customer & Delivery Slot Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">person</span>
                  Customer Information
                </span>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="text-[11px] text-primary font-bold hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[12px]">call</span>
                  Call
                </a>
              </div>
              <div className="font-bold text-sm text-on-surface">{order.customerName}</div>
              <div className="text-on-surface-variant font-medium">+91 {order.customerPhone}</div>
            </div>

            <div className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-secondary">schedule</span>
                Delivery Slot & Date
              </span>
              <div className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span>{order.deliverySlot === 'MORNING_RUSH' ? '🌅 Morning Rush (6 AM - 9 AM)' : '🌆 Evening Drop (4 PM - 7 PM)'}</span>
              </div>
              <div className="text-on-surface-variant">
                Scheduled for {order.scheduledDeliveryDate || new Date(order.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
              Delivery Destination
            </span>
            <div className="text-xs text-on-surface font-medium leading-relaxed">
              {order.deliveryAddress?.flatPlotNumber && `${order.deliveryAddress.flatPlotNumber}, `}
              {order.deliveryAddress?.apartmentName && `${order.deliveryAddress.apartmentName}, `}
              {order.deliveryAddress?.streetName && `${order.deliveryAddress.streetName}, `}
              {order.deliveryAddress?.landmark && `Near ${order.deliveryAddress.landmark}, `}
              {order.deliveryAddress?.city || 'Bengaluru'} - {order.deliveryAddress?.pincode}
            </div>
            {order.deliveryAddress?.gateSecurityInstructions && (
              <div className="mt-1 text-[11px] text-outline font-semibold italic flex items-center gap-1 bg-surface-container-lowest p-2 rounded-lg">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span>Gate / Security: {order.deliveryAddress.gateSecurityInstructions}</span>
              </div>
            )}
          </div>

          {/* Assigned Delivery Executive */}
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                  Delivery Partner
                </span>
                <span className="font-bold text-on-surface text-xs">
                  {order.assignedDeliveryPersonName || 'Ramesh Kumar (KA-01-EQ-9872)'}
                </span>
              </div>
            </div>
            <span className="text-[11px] bg-secondary-container/60 text-on-secondary-container px-2 py-0.5 rounded font-bold">
              Buffer Crate Equipped
            </span>
          </div>

          {/* Itemized Egg Crates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                Items Ordered ({order.items?.length || 0} Products • {totalEggs} Eggs Total)
              </h4>
              <span className="text-[11px] font-semibold text-secondary flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                Molded Pulp Packed
              </span>
            </div>

            <div className="border border-surface-container rounded-xl overflow-hidden bg-surface-container-lowest">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-[10px] uppercase font-bold text-on-surface-variant border-b border-surface-container">
                    <th className="py-2.5 px-3">Product & Egg Type</th>
                    <th className="py-2.5 px-2 text-center">Packaging Unit</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-2 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {order.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-container-low/40 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-on-surface">{item.productName}</div>
                        <div className="text-[10px] text-on-surface-variant">{item.eggType}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="text-[10px] bg-surface-container px-1.5 py-0.5 rounded font-semibold text-on-surface">
                          {item.unit === 'TRAY_30' ? 'Tray of 30' : item.unit === 'DOZEN' ? '12 Pack' : 'Single'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-on-surface">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-2 text-right text-on-surface-variant">
                        ₹{item.priceAtPurchase}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-primary">
                        ₹{item.lineTotal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zero-Crack Adjustment Notice (If any) */}
          {order.brokenEggsAdjusted > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">broken_image</span>
                <div>
                  <div className="font-bold text-xs text-amber-900 dark:text-amber-200">
                    Zero-Crack Doorstep Adjustment Recorded
                  </div>
                  <div className="text-[10px] text-amber-800 dark:text-amber-300">
                    {order.brokenEggsAdjusted} damaged egg(s) addressed during doorstep unboxing.
                  </div>
                </div>
              </div>
              {order.brokenEggsDeductionAmount > 0 && (
                <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
                  - ₹{order.brokenEggsDeductionAmount} Deducted
                </span>
              )}
            </div>
          )}

          {/* Bill Breakdown */}
          <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container space-y-2">
            <div className="flex justify-between text-on-surface-variant">
              <span>Items Subtotal</span>
              <span>₹{order.subtotal?.toFixed(2) || order.totalAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Farm Direct Delivery</span>
              <span>{order.deliveryCharge === 0 ? <strong className="text-secondary">FREE</strong> : `₹${order.deliveryCharge}`}</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Eco Pulp Packaging & Cushioning</span>
              <span>{order.packagingCharge === 0 ? <strong className="text-secondary">FREE</strong> : `₹${order.packagingCharge}`}</span>
            </div>
            {order.brokenEggsDeductionAmount > 0 && (
              <div className="flex justify-between text-tertiary font-medium">
                <span>Zero-Crack Bill Markdown</span>
                <span>- ₹{order.brokenEggsDeductionAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-surface-container flex justify-between items-center text-sm font-extrabold text-on-surface">
              <span>Final Payable Amount</span>
              <span className="text-base text-primary">₹{order.finalPayableAmount?.toFixed(2)}</span>
            </div>
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-on-surface-variant">Payment Mode:</span>
              <span className="font-bold text-on-surface">
                {order.paymentMethod === 'UPI_ON_DELIVERY' ? 'Bharat UPI on Delivery' : 'Cash on Delivery (POD)'}
                {' '}({order.paymentStatus || 'COLLECTED'})
              </span>
            </div>
            {order.upiTransactionRef && (
              <div className="text-[10px] text-outline font-mono">
                UPI Ref: {order.upiTransactionRef}
              </div>
            )}
          </div>

          {/* Audit Timeline */}
          {order.statusTimeline && order.statusTimeline.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                Order Lifecycle & Audit Trail
              </h4>
              <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                {order.statusTimeline.map((tl: any, i: number) => (
                  <div key={i} className="relative pl-3">
                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface"></div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface text-[11px] uppercase">
                        {tl.status?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-outline">
                        {new Date(tl.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {tl.note && <p className="text-[11px] text-on-surface-variant mt-0.5">{tl.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-surface-container bg-surface-container-low/50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-outline">
            Depot: Koramangala Hub • Ovovita Farm-Direct OS
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
