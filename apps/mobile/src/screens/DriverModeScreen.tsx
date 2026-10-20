import React, { useState, useEffect } from 'react';
import { mobileApi } from '../api';
import { offlineSync } from '../services/offlineSync';

export const DriverModeScreen: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(offlineSync.isOnline());
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(offlineSync.getQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active run modals
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [upiQrData, setUpiQrData] = useState<any>(null);
  const [brokenModalOpen, setBrokenModalOpen] = useState(false);
  const [brokenCount, setBrokenCount] = useState<number>(1);
  const [resolutionType, setResolutionType] = useState<'BUFFER_REPLACED' | 'PRICE_DISCOUNTED'>('BUFFER_REPLACED');

  const updateQueueCount = () => {
    setPendingQueueCount(offlineSync.getQueue().length);
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      alert('Network unavailable. You are currently in an offline zone (basement/lift). Actions are safely queued.');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await offlineSync.flushQueue();
      updateQueueCount();
      if (res.synced > 0) {
        alert(`Successfully synced ${res.synced} offline delivery action(s)!`);
        await loadRuns();
      }
    } catch (err: any) {
      console.warn('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadRuns = async () => {
    setIsLoading(true);
    if (!isOnline) {
      const cached = offlineSync.getCachedRuns();
      setRuns(cached);
      setIsLoading(false);
      return;
    }

    try {
      // Login as demo driver if not already
      const loginRes = await mobileApi.staffLogin('9876500002', '1234', 'DELIVERY_EXECUTIVE');
      mobileApi.setToken(loginRes.data.token);

      const res = await mobileApi.getDriverRunSheet();
      setRuns(res.data);
      offlineSync.cacheRuns(res.data);
    } catch (err) {
      console.warn('Driver runs load error, loading offline cache:', err);
      const cached = offlineSync.getCachedRuns();
      setRuns(cached);
    } finally {
      setIsLoading(false);
      updateQueueCount();
    }
  };

  useEffect(() => {
    loadRuns();

    const unsubscribe = offlineSync.subscribe(async (online) => {
      setIsOnline(online);
      if (online) {
        // Automatically flush queue when regaining connection
        await offlineSync.flushQueue();
        updateQueueCount();
        await loadRuns();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOpenUpiQr = async (order: any) => {
    setSelectedOrder(order);
    if (!isOnline) {
      // Generate offline UPI payload
      setUpiQrData({
        orderNumber: order.orderNumber,
        finalPayableAmount: order.finalPayableAmount,
        upiId: 'ovovita.depot@okhdfcbank',
      });
      return;
    }
    try {
      const res = await mobileApi.getUpiQr(order._id);
      setUpiQrData(res.data);
    } catch (err: any) {
      alert(err.message || 'Failed to generate UPI QR');
    }
  };

  const handleAdjustBrokenEggs = async () => {
    if (!selectedOrder) return;
    const payload = {
      orderId: selectedOrder._id,
      brokenEggsCount: brokenCount,
      resolutionType,
      note: `Doorstep inspection: ${brokenCount} damaged eggs handled via ${resolutionType}`,
    };

    if (!isOnline) {
      offlineSync.queueAction('ADJUST_BROKEN', payload);
      updateQueueCount();
      alert(`Offline Mode: ${brokenCount} egg buffer swap saved locally. Will sync once out of basement!`);
      setBrokenModalOpen(false);
      setRuns(offlineSync.getCachedRuns());
      return;
    }

    try {
      const res = await mobileApi.adjustBrokenEggs(payload);
      alert(res.message);
      setBrokenModalOpen(false);
      await loadRuns();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust broken eggs');
    }
  };

  const handleConfirmDelivery = async (orderId: string, method: 'CASH_ON_DELIVERY' | 'UPI_ON_DELIVERY', amount: number) => {
    const payload = {
      orderId,
      paymentMethod: method,
      amountCollected: amount,
      inspectionPassed: true,
      upiTransactionRef: method === 'UPI_ON_DELIVERY' ? `UPI_${Date.now()}` : undefined,
    };

    if (!isOnline) {
      offlineSync.queueAction('COLLECT_PAYMENT', payload);
      updateQueueCount();
      alert('Offline Mode: POD payment recorded locally! Order marked delivered. Will sync upon reconnection.');
      setUpiQrData(null);
      setSelectedOrder(null);
      setRuns(offlineSync.getCachedRuns());
      return;
    }

    try {
      await mobileApi.collectPayment(payload);
      alert('Order marked delivered and payment collected!');
      setUpiQrData(null);
      setSelectedOrder(null);
      await loadRuns();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm delivery');
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-4 py-3 border-b border-surface-container shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[20px]">two_wheeler</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">Rider Run-Sheet</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-secondary animate-pulse' : 'bg-tertiary'
                }`}
                title={isOnline ? 'Online' : 'Offline / Dead Zone'}
              />
            </div>
            <h2 className="text-sm font-bold text-on-surface">Ramesh Kumar (KA-01-EQ-9872)</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingQueueCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="text-[11px] bg-secondary/10 border border-secondary text-secondary px-2 py-1 rounded-lg font-bold flex items-center gap-1 active:scale-95 transition"
            >
              <span className={`material-symbols-outlined text-[13px] ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
              <span>Sync ({pendingQueueCount})</span>
            </button>
          )}

          <button
            onClick={loadRuns}
            className="text-xs bg-surface-container px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 hover:bg-surface-variant transition"
          >
            <span className="material-symbols-outlined text-[15px]">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-amber-600">wifi_off</span>
            <span>Basement / Lift Mode: Offline cache active. Actions will auto-sync.</span>
          </div>
        </div>
      )}

      {/* Driver Buffer Crate Status */}
      <div className="px-4 py-2.5 bg-primary-fixed/30 text-on-primary-fixed flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">inventory</span>
          <span>Driver Buffer Stock: <strong>6 Fresh Eggs Ready</strong></span>
        </div>
        <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">
          Zero-Crack Kit
        </span>
      </div>

      <div className="p-4 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Assigned Morning Deliveries ({runs.length})
        </h3>

        {runs.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-sm">
            <span className="material-symbols-outlined text-[40px] text-outline-variant mb-1">check_circle</span>
            <p>No pending runs assigned right now.</p>
          </div>
        ) : (
          runs.map((run) => {
            const isDelivered = run.status === 'DELIVERED';
            return (
              <div
                key={run._id}
                className={`bg-surface-container-lowest rounded-2xl p-4 border shadow-sm flex flex-col gap-3 ${
                  isDelivered ? 'border-secondary/40 opacity-75' : 'border-surface-container'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-on-surface">#{run.orderNumber}</span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                          isDelivered
                            ? 'bg-secondary text-white'
                            : 'bg-secondary-container text-on-secondary-container'
                        }`}
                      >
                        {run.status.replace(/_/g, ' ')}
                      </span>
                      {run.offlinePendingSync && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px]">schedule</span>
                          Pending Sync
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-on-surface mt-1">{run.customerName}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">
                      {run.deliveryAddress?.flatPlotNumber}, {run.deliveryAddress?.apartmentName || run.deliveryAddress?.streetName}
                    </div>
                    <div className="text-xs text-primary font-bold mt-1">
                      Payable: ₹{run.finalPayableAmount} ({run.paymentMethod === 'UPI_ON_DELIVERY' ? 'Doorstep UPI' : 'Cash'})
                    </div>
                  </div>

                  <a
                    href={`tel:${run.customerPhone}`}
                    className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary"
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                  </a>
                </div>

                {!isDelivered && (
                  <div className="pt-2 border-t border-surface-container flex flex-col gap-2">
                    {/* Broken egg inspection button */}
                    <button
                      onClick={() => {
                        setSelectedOrder(run);
                        setBrokenModalOpen(true);
                      }}
                      className="w-full py-1.5 bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px] text-tertiary">broken_image</span>
                      <span>Handle Broken Egg during Inspection</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {/* Dynamic UPI QR Trigger */}
                      <button
                        onClick={() => handleOpenUpiQr(run)}
                        className="py-2 px-3 bg-secondary hover:bg-secondaryDark text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-95 transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">qr_code</span>
                        <span>Show UPI QR</span>
                      </button>

                      {/* Direct Cash Collection */}
                      <button
                        onClick={() =>
                          handleConfirmDelivery(run._id, 'CASH_ON_DELIVERY', run.finalPayableAmount)
                        }
                        className="py-2 px-3 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-95 transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        <span>Cash Collected</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dynamic Bharat UPI QR Modal */}
      {upiQrData && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-xs w-full rounded-2xl p-5 shadow-2xl border border-surface-container-high text-center animate-scaleUp">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container mx-auto flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </div>
            <h3 className="font-extrabold text-base text-on-surface">Doorstep UPI QR</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Customer scans via GPay / PhonePe / Paytm
            </p>

            <div className="my-4 p-4 bg-white rounded-xl shadow-inner border border-surface-container flex flex-col items-center justify-center">
              <div className="w-40 h-40 bg-surface-container-low rounded-lg border-2 border-dashed border-secondary/40 flex flex-col items-center justify-center p-2">
                <span className="material-symbols-outlined text-secondary text-[48px]">qr_code_2</span>
                <span className="text-[10px] font-bold text-on-surface-variant mt-1">
                  NPCI Bharat UPI Dynamic QR
                </span>
                <span className="text-[9px] text-outline truncate max-w-[140px] mt-0.5">
                  pa=ovovita.depot@okhdfcbank
                </span>
              </div>
              <div className="mt-2 text-lg font-extrabold text-primary">
                ₹{upiQrData.finalPayableAmount.toFixed(2)}
              </div>
              <div className="text-[10px] text-on-surface-variant">Order #{upiQrData.orderNumber}</div>
            </div>

            <button
              onClick={() =>
                handleConfirmDelivery(
                  selectedOrder._id,
                  'UPI_ON_DELIVERY',
                  selectedOrder.finalPayableAmount
                )
              }
              className="w-full py-2.5 bg-secondary hover:bg-secondaryDark text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
            >
              Payment Received via UPI ✓
            </button>

            <button
              onClick={() => setUpiQrData(null)}
              className="w-full mt-2 py-1.5 text-xs text-on-surface-variant font-semibold hover:bg-surface-container rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Broken Egg Doorstep Inspection Modal */}
      {brokenModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-5 shadow-2xl border border-surface-container-high animate-scaleUp">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-3">
              <span className="material-symbols-outlined text-tertiary text-[22px]">broken_image</span>
              <h3 className="font-bold text-sm text-on-surface">Zero-Crack Doorstep Adjustment</h3>
            </div>

            <p className="text-xs text-on-surface-variant mb-3">
              Customer unboxed order #{selectedOrder.orderNumber} and noticed hairline or cracked eggs.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">
                  Number of Damaged Eggs
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBrokenCount(n)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                        brokenCount === n
                          ? 'bg-tertiary text-white border-tertiary'
                          : 'bg-surface border-outline-variant/40 text-on-surface'
                      }`}
                    >
                      {n} {n === 1 ? 'Egg' : 'Eggs'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">
                  Select Doorstep Resolution
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setResolutionType('BUFFER_REPLACED')}
                    className={`w-full p-2.5 rounded-xl text-left border text-xs transition ${
                      resolutionType === 'BUFFER_REPLACED'
                        ? 'bg-secondary-container/50 border-secondary font-bold text-on-secondary-container'
                        : 'bg-surface border-surface-container text-on-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>1. Replace Instantly from Buffer Crate</span>
                      <span className="text-[10px] bg-secondary text-white px-1.5 py-0.2 rounded font-bold">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] font-normal opacity-80 mt-0.5">
                      Customer receives whole batch; payable remains ₹{selectedOrder.finalPayableAmount}.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionType('PRICE_DISCOUNTED')}
                    className={`w-full p-2.5 rounded-xl text-left border text-xs transition ${
                      resolutionType === 'PRICE_DISCOUNTED'
                        ? 'bg-primary-fixed/50 border-primary font-bold text-primary'
                        : 'bg-surface border-surface-container text-on-surface'
                    }`}
                  >
                    <span>2. Deduct from Total Bill (Price Markdown)</span>
                    <p className="text-[11px] font-normal opacity-80 mt-0.5">
                      Recalculates bill instantly so customer pays reduced amount on doorstep.
                    </p>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBrokenModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdjustBrokenEggs}
                  className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  Confirm Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
