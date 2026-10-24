import React, { useState, useEffect } from 'react';
import { api } from './api';
import { Header } from './components/Header';
import { HubBanner } from './components/HubBanner';
import { LowStockBanner } from './components/LowStockBanner';
import { KpiCards } from './components/KpiCards';
import { OrderPackingQueue } from './components/OrderPackingQueue';
import { PriceMaster } from './components/PriceMaster';
import { ShiftReconciliationModal } from './components/ShiftReconciliationModal';
import { AddBatchModal } from './components/AddBatchModal';
import { LoginModal } from './components/LoginModal';
import { OrderHistory } from './components/OrderHistory';
import { CancelOrderModal } from './components/CancelOrderModal';

export const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(api.getAuthToken());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');

  // Data states
  const [dashboard, setDashboard] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [depots, setDepots] = useState<any[]>([]);
  const [selectedDepotId, setSelectedDepotId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [batchModalProduct, setBatchModalProduct] = useState<any>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  // Auto-login or verify existing token
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (token) {
          const profile = await api.getProfile();
          setUser(profile.data);
          if (profile.data?.depotId) {
            setSelectedDepotId(profile.data.depotId);
          }
        } else {
          // Pre-authenticate as default demo Shopkeeper
          const loginRes = await api.loginStaff('9876500001', '1234', 'SHOPKEEPER');
          api.setAuthToken(loginRes.data.token);
          setToken(loginRes.data.token);
          setUser(loginRes.data.user);
          if (loginRes.data.user?.depotId) {
            setSelectedDepotId(loginRes.data.user.depotId);
          }
        }
      } catch (err) {
        console.warn('Auth init note:', err);
        api.clearAuthToken();
        setToken(null);
        setUser(null);
      }
    };

    initAuth();
  }, []);

  const loadData = async (depotIdParam?: string) => {
    setIsRefreshing(true);
    const activeDepot = depotIdParam !== undefined ? depotIdParam : selectedDepotId;
    try {
      const [dashRes, prodRes, depotsRes] = await Promise.all([
        api.getDepotDashboard(activeDepot || undefined),
        api.getProducts(),
        api.getDepots().catch(() => ({ data: [] })),
      ]);

      setDashboard(dashRes.data);
      setProducts(prodRes.data);
      if (depotsRes.data && depotsRes.data.length > 0) {
        setDepots(depotsRes.data);
        if (!selectedDepotId && !activeDepot) {
          setSelectedDepotId(depotsRes.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSelectDepot = (id: string) => {
    setSelectedDepotId(id);
    loadData(id);
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const handleLoginSuccess = (loggedInUser: any, userToken: string) => {
    api.setAuthToken(userToken);
    setToken(userToken);
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    api.clearAuthToken();
    setToken(null);
    setUser(null);
  };

  const handleAssignRider = async (orderId: string, driverId: string) => {
    try {
      await api.assignRider(orderId, driverId, 'KA-01-EQ-9872');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch order');
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    try {
      await api.confirmOrder(orderId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm order');
    }
  };

  const handleStartPacking = async (orderId: string) => {
    try {
      await api.startPacking(orderId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to start packing');
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      await api.markReadyForDelivery(orderId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark ready for delivery');
    }
  };

  const handleCancelOrder = (orderId: string) => {
    setCancelOrderId(orderId);
  };

  const confirmCancelOrder = async (orderId: string, reason: string) => {
    try {
      const res = await api.cancelOrder(orderId, reason || undefined);
      await loadData();
      return res?.data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to cancel order');
    }
  };

  const handleUpdatePrice = async (productId: string, unitPricing: any[]) => {
    try {
      await api.updateProductPrice(productId, unitPricing);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update live rates');
    }
  };

  const handleInwardBatch = async (productId: string, qty: number, note?: string) => {
    await api.inwardBatch(productId, qty, note);
    await loadData();
  };

  const handleShiftReconcile = async (data: any) => {
    const res = await api.closeShift(data);
    await loadData();
    return res;
  };

  if (!token && !user) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  const defaultMetrics = {
    totalOrdersCount: 28,
    packingQueueCount: 3,
    activeRunsCount: 1,
    deliveredCount: 24,
    totalCodCash: 3120,
    totalUpiDigital: 1850,
    totalRevenue: 4970,
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased">
      <Header
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        packingQueueCount={dashboard?.packingQueue?.length || 0}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Hub Context */}
        <HubBanner
          depotName="Depot Hub • Koramangala"
          leadName={`${user?.name || 'Amit Patel'} (Depot Lead)`}
          depots={depots}
          selectedDepotId={selectedDepotId}
          onSelectDepot={handleSelectDepot}
          onRefresh={() => loadData()}
          isRefreshing={isRefreshing}
        />

        {activeTab === 'dashboard' ? (
          <>
            {/* Real-Time Low-Stock Callout */}
            <LowStockBanner
              criticalProducts={dashboard?.criticalStockAlerts || []}
              onOpenAddBatch={(prod) => setBatchModalProduct(prod)}
            />

            {/* Key Metrics Bento Grid */}
            <KpiCards metrics={dashboard?.metrics || defaultMetrics} />

            {/* 2-Column Layout for Packing Queue and Price Master */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <OrderPackingQueue
                orders={dashboard?.packingQueue || []}
                drivers={dashboard?.availableDrivers || []}
                onAssignRider={handleAssignRider}
                onConfirmOrder={handleConfirmOrder}
                onStartPacking={handleStartPacking}
                onMarkReady={handleMarkReady}
                onCancelOrder={handleCancelOrder}
              />

              <PriceMaster
                products={products}
                onUpdatePrice={handleUpdatePrice}
                onOpenAddBatch={(prod) => setBatchModalProduct(prod)}
              />
            </div>
          </>
        ) : (
          <OrderHistory
            depotId={selectedDepotId}
            onRefreshStats={() => loadData()}
          />
        )}
      </main>

      {/* Modals */}
      <ShiftReconciliationModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        drivers={dashboard?.availableDrivers || []}
        onConfirmReconciliation={handleShiftReconcile}
      />

      <AddBatchModal
        isOpen={!!batchModalProduct}
        onClose={() => setBatchModalProduct(null)}
        product={batchModalProduct}
        onInwardBatch={handleInwardBatch}
      />

      <CancelOrderModal
        isOpen={!!cancelOrderId}
        orderId={cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        onConfirmCancel={confirmCancelOrder}
      />
    </div>
  );
};
