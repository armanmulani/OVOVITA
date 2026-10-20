import React, { useState, useEffect } from 'react';
import { mobileApi } from './api';
import { BottomNav } from './components/BottomNav';
import { CatalogScreen } from './screens/CatalogScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { TrackerScreen } from './screens/TrackerScreen';
import { DriverModeScreen } from './screens/DriverModeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AuthScreen } from './screens/AuthScreen';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'cart' | 'tracker' | 'profile' | 'driver'>('catalog');
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(mobileApi.getToken());

  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<
    Array<{ product: any; unit: 'SINGLE' | 'DOZEN' | 'TRAY_30'; quantity: number }>
  >([]);
  const [placedOrderId, setPlacedOrderId] = useState<string | undefined>(undefined);

  // Initialize customer authentication if token already saved
  useEffect(() => {
    const initCustomer = async () => {
      try {
        if (token) {
          const profileRes = await mobileApi.getProfile();
          setUser(profileRes.data);
        }
      } catch (err) {
        console.warn('Mobile auth session expired or invalid:', err);
        mobileApi.clearToken();
        setToken(null);
        setUser(null);
      }
    };

    initCustomer();
  }, []);

  // Load catalog
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await mobileApi.getCatalog();
        setProducts(res.data);
      } catch (err) {
        console.error('Catalog load error:', err);
      }
    };
    loadCatalog();
  }, []);

  const handleAddToCart = (product: any, unit: 'SINGLE' | 'DOZEN' | 'TRAY_30', qty: number) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product._id === product._id && item.unit === unit
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        return updated;
      }
      return [...prev, { product, unit, quantity: qty }];
    });
  };

  const handlePlaceOrder = async (payload: any) => {
    const res = await mobileApi.createOrder(payload);
    setPlacedOrderId(res.data._id);
    setActiveTab('tracker');
    return res;
  };

  const handleAuthSuccess = (loggedInUser: any, userToken: string) => {
    mobileApi.setToken(userToken);
    setToken(userToken);
    setUser(loggedInUser);
    if (loggedInUser.role === 'DELIVERY_EXECUTIVE') {
      setActiveTab('driver');
    } else {
      setActiveTab('catalog');
    }
  };

  const handleUpdateUser = (updatedUser: any) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    mobileApi.clearToken();
    setToken(null);
    setUser(null);
    setActiveTab('catalog');
  };

  if (!token || !user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const cartTotalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleReorder = (items: any[]) => {
    const reordered: any[] = [];
    for (const it of items) {
      const matched = products.find((p) => p._id === it.productId);
      if (matched) {
        reordered.push({
          product: matched,
          unit: it.unit,
          quantity: it.quantity,
        });
      }
    }
    if (reordered.length > 0) {
      setCart(reordered);
      setActiveTab('cart');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto">
      <div className="flex-1 flex flex-col">
        {activeTab === 'catalog' && (
          <CatalogScreen
            products={products}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setActiveTab('cart')}
            cartCount={cartTotalCount}
          />
        )}

        {activeTab === 'cart' && (
          <CheckoutScreen
            cart={cart}
            user={user}
            onUpdateUser={handleUpdateUser}
            onPlaceOrder={handlePlaceOrder}
            onBack={() => setActiveTab('catalog')}
            onClearCart={() => setCart([])}
          />
        )}

        {activeTab === 'tracker' && (
          <TrackerScreen
            orderId={placedOrderId}
            onExploreMore={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'driver' && <DriverModeScreen />}

        {activeTab === 'profile' && (
          <ProfileScreen
            user={user}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            onReorder={handleReorder}
          />
        )}
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        cartCount={cartTotalCount}
        userRole={user?.role}
      />
    </div>
  );
};
