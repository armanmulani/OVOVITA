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

export const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(api.getAuthToken());

  // Data states
  const [dashboard, setDashboard] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [batchModalProduct, setBatchModalProduct] = useState<any>(null);

  // Auto-login or verify existing token
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (token) {
          const profile = await api.getProfile();
          setUser(profile.data);
        } else {
          // Pre-authenticate as default demo Shopkeeper
          const loginRes = await api.loginStaff('9876500001', '1234', 'SHOPKEEPER');
          api.setAuthToken(loginRes.data.token);
          setToken(loginRes.data.token);
          setUser(loginRes.data.user);
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

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [dashRes, prodRes] = await Promise.all([
        api.getDepotDashboard(),
        api.getProducts(),
      ]);

      setDashboard(dashRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
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
        onLogout={handleLogout}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Hub Context */}
        <HubBanner
          depotName="Depot Hub • Koramangala"
          leadName={`${user?.name || 'Amit Patel'} (Depot Lead)`}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
        />

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
          />

          <PriceMaster
            products={products}
            onUpdatePrice={handleUpdatePrice}
            onOpenAddBatch={(prod) => setBatchModalProduct(prod)}
          />
        </div>
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
    </div>
  );
};
