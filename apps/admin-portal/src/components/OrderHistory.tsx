import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { OrderDetailModal } from './OrderDetailModal';

interface OrderHistoryProps {
  depotId?: string;
  onRefreshStats?: () => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ depotId }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState('ALL');
  const [selectedSlot, setSelectedSlot] = useState('ALL');
  const [inspectOrder, setInspectOrder] = useState<any | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });

  const loadOrders = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.getOrderHistory({
        depotId: depotId || undefined,
        status:
          selectedStatus !== 'ALL' && selectedStatus !== 'REFUND_OWED'
            ? selectedStatus
            : undefined,
        search: searchQuery.trim() || undefined,
        page,
        limit: 25,
      });

      setOrders(res.data || []);
      if (res.meta) {
        setMeta(res.meta);
        setCurrentPage(res.meta.page);
      }
    } catch (err) {
      console.error('Failed to load order history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(1);
  }, [depotId, selectedStatus]);

  /**
   * Refunds owed are not a status — they are a flag on a cancelled order
   * that had already been paid for, so they are filtered client-side.
   */
  const refundOwedOrders = orders.filter((o) => o.refundOwed === true);
  const refundsOwedTotal = refundOwedOrders.reduce(
    (sum, o) => sum + (o.refundAmount || 0),
    0
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders(1);
  };

  // Client-side additional filters if needed (e.g. payment method, slot)
  const filteredOrders = orders.filter((order) => {
    if (selectedPayment !== 'ALL' && order.paymentMethod !== selectedPayment) return false;
    if (selectedSlot !== 'ALL' && order.deliverySlot !== selectedSlot) return false;
    if (selectedStatus === 'REFUND_OWED' && order.refundOwed !== true) return false;
    return true;
  });

  // Calculate live summary stats
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.finalPayableAmount || 0), 0);
  const deliveredCount = filteredOrders.filter((o) => o.status === 'DELIVERED').length;
  const inFlightCount = filteredOrders.filter((o) => o.status === 'OUT_FOR_DELIVERY' || o.status === 'PACKING' || o.status === 'CONFIRMED').length;
  const totalEggsCount = filteredOrders.reduce((sum, o) => {
    const oEggs = o.items?.reduce((iSum: number, it: any) => iSum + (it.totalEggsCount || 0), 0) || 0;
    return sum + oEggs;
  }, 0);

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

  return (
    <div className="space-y-4">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-on-surface-variant">Orders in History</div>
            <div className="text-xl sm:text-2xl font-extrabold text-on-surface mt-0.5">
              {meta.total || filteredOrders.length}
            </div>
            <div className="text-[10px] text-secondary font-bold mt-0.5 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[12px]">check_circle</span>
              <span>All customer orders recorded</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-on-surface-variant">Total Gross Value</div>
            <div className="text-xl sm:text-2xl font-extrabold text-primary mt-0.5">
              ₹{totalRevenue.toFixed(0)}
            </div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">
              Page total payable
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">currency_rupee</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-on-surface-variant">Delivered & Verified</div>
            <div className="text-xl sm:text-2xl font-extrabold text-secondary mt-0.5">
              {deliveredCount}
            </div>
            <div className="text-[10px] text-secondary font-bold mt-0.5 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[12px]">verified</span>
              <span>Zero-Crack Inspected</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-secondary-container/50 text-on-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-on-surface-variant">Total Eggs Dispatched</div>
            <div className="text-xl sm:text-2xl font-extrabold text-on-surface mt-0.5">
              {totalEggsCount}
            </div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">
              {inFlightCount} active in transit/packing
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">egg</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order #, Customer Name, Mobile (+91), or Street/Apartment..."
                className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-surface-container rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    loadOrders(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 shrink-0"
            >
              Search
            </button>
          </form>

          {/* Refresh action */}
          <button
            onClick={() => loadOrders(currentPage)}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-variant text-on-surface rounded-xl text-xs font-semibold transition shrink-0"
          >
            <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-surface-container text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mr-1">
              Status:
            </span>
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'DELIVERED', label: 'Delivered' },
              { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
              { id: 'PACKING', label: 'Packing' },
              { id: 'READY_FOR_DELIVERY', label: 'Ready' },
              { id: 'CONFIRMED', label: 'Confirmed' },
              { id: 'PLACED', label: 'Placed' },
              { id: 'CANCELLED', label: 'Cancelled' },
              { id: 'REFUND_OWED', label: `Refunds Owed (${refundOwedOrders.length})` },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedStatus === st.id
                    ? 'bg-primary text-white shadow-sm'
                    : st.id === 'REFUND_OWED' && refundOwedOrders.length > 0
                    ? 'bg-error/15 text-error hover:bg-error/25'
                    : 'bg-surface-container hover:bg-surface-variant text-on-surface-variant'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Payment and Slot Selectors */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="bg-surface-container-low border border-surface-container text-xs rounded-lg px-2.5 py-1 text-on-surface font-semibold focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Payment Types</option>
              <option value="CASH_ON_DELIVERY">Cash on Delivery (POD)</option>
              <option value="UPI_ON_DELIVERY">Doorstep UPI</option>
            </select>

            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="bg-surface-container-low border border-surface-container text-xs rounded-lg px-2.5 py-1 text-on-surface font-semibold focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Slots</option>
              <option value="MORNING_RUSH">🌅 Morning Rush</option>
              <option value="EVENING_DROP">🌆 Evening Drop</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-on-surface-variant text-xs">
            <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-2">
              progress_activity
            </span>
            <p>Loading customer order history...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-on-surface-variant text-xs">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-high/60 mx-auto flex items-center justify-center mb-3 text-outline">
              <span className="material-symbols-outlined text-[32px]">inventory_2</span>
            </div>
            <h4 className="font-bold text-sm text-on-surface">No Orders Found</h4>
            <p className="text-on-surface-variant mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No orders matching "${searchQuery}". Try searching by customer phone number or order number.`
                : 'No orders have been recorded in this category yet.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('ALL');
                  setSelectedPayment('ALL');
                  setSelectedSlot('ALL');
                  loadOrders(1);
                }}
                className="mt-3 px-3 py-1.5 bg-primary text-white font-bold text-xs rounded-lg shadow-sm hover:bg-primary-container transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low/70 border-b border-surface-container text-[11px] uppercase font-bold text-on-surface-variant">
                  <th className="py-3 px-4">Order # & Timestamp</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Delivery Address & Slot</th>
                  <th className="py-3 px-4">Items & Crates</th>
                  <th className="py-3 px-4">Payment & Amount</th>
                  <th className="py-3 px-4">Rider / Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filteredOrders.map((order) => {
                  const itemsCount = order.items?.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) || 0;
                  const totalEggs = order.items?.reduce((sum: number, it: any) => sum + (it.totalEggsCount || 0), 0) || 0;
                  const isDelivered = order.status === 'DELIVERED';

                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-surface-container-low/40 transition group"
                    >
                      {/* Order Number & Date */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-sm text-on-surface font-mono">
                          #{order.orderNumber}
                        </div>
                        <div className="text-[10px] text-outline mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {' • '}
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-on-surface">{order.customerName}</div>
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <span className="material-symbols-outlined text-[13px]">call</span>
                          +91 {order.customerPhone}
                        </a>
                      </td>

                      {/* Address & Slot */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="text-[11px] text-on-surface font-medium truncate">
                          {order.deliveryAddress?.flatPlotNumber ? `${order.deliveryAddress.flatPlotNumber}, ` : ''}
                          {order.deliveryAddress?.apartmentName || order.deliveryAddress?.streetName}
                        </div>
                        <div className="text-[10px] text-outline mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-primary">schedule</span>
                          <span>{order.deliverySlot === 'MORNING_RUSH' ? 'Morning Rush' : 'Evening Drop'}</span>
                        </div>
                      </td>

                      {/* Items & Egg count */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="text-xs text-on-surface font-semibold truncate">
                          {order.items?.map((it: any) => `${it.quantity}x ${it.productName}`).join(', ')}
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                          <span className="bg-primary-fixed/50 text-on-primary-fixed font-bold px-1.5 py-0.2 rounded">
                            {totalEggs} Eggs Total
                          </span>
                          <span>({itemsCount} crate packs)</span>
                        </div>
                      </td>

                      {/* Payment & Amount */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-sm text-primary">
                          ₹{order.finalPayableAmount?.toFixed(2)}
                        </div>
                        <div className="text-[10px] font-semibold text-on-surface-variant mt-0.5">
                          {order.paymentMethod === 'UPI_ON_DELIVERY' ? 'Doorstep UPI' : 'Cash (POD)'}
                          <span className={`ml-1 font-bold ${order.paymentStatus === 'COLLECTED' ? 'text-secondary' : 'text-amber-600'}`}>
                            • {order.paymentStatus || 'COLLECTED'}
                          </span>
                        </div>
                        {order.brokenEggsAdjusted > 0 && (
                          <div className="text-[10px] text-amber-700 font-bold mt-0.5 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">broken_image</span>
                            <span>{order.brokenEggsAdjusted} egg adjustment</span>
                          </div>
                        )}
                        {order.refundOwed === true && (
                          <div className="text-[10px] text-error font-bold mt-0.5 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">currency_exchange</span>
                            <span>
                              Refund owed ₹{order.refundAmount}
                              {order.refundUpiTransactionRef
                                ? ` • UPI ${order.refundUpiTransactionRef}`
                                : ''}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Rider & Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isDelivered ? 'bg-secondary' : 'bg-primary'}`} />
                          {order.status?.replace(/_/g, ' ')}
                        </span>
                        <div className="text-[10px] text-on-surface-variant font-medium mt-1 truncate max-w-[140px]">
                          {order.assignedDeliveryPersonName || 'Ramesh Kumar (Rider)'}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setInspectOrder(order)}
                          className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-variant text-on-surface rounded-lg font-bold text-xs flex items-center gap-1 mx-auto transition active:scale-95 shadow-xs"
                          title="View complete order breakdown and audit history"
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary">visibility</span>
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-surface-container bg-surface-container-low/40 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">
              Showing page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ({meta.total} total orders)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1 || isLoading}
                onClick={() => loadOrders(currentPage - 1)}
                className="px-3 py-1 bg-surface-container hover:bg-surface-variant disabled:opacity-50 text-on-surface rounded-lg font-semibold transition"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= meta.totalPages || isLoading}
                onClick={() => loadOrders(currentPage + 1)}
                className="px-3 py-1 bg-surface-container hover:bg-surface-variant disabled:opacity-50 text-on-surface rounded-lg font-semibold transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={inspectOrder}
        isOpen={!!inspectOrder}
        onClose={() => setInspectOrder(null)}
      />
    </div>
  );
};
