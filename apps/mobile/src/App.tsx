import React, { useState, useEffect } from 'react';
import { mobileApi } from './api';
import { BottomNav } from './components/BottomNav';
import { CatalogScreen } from './screens/CatalogScreen';
import { CartScreen } from './screens/CartScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { TrackerScreen } from './screens/TrackerScreen';
import { DriverModeScreen } from './screens/DriverModeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AuthScreen } from './screens/AuthScreen';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'catalog' | 'cart' | 'checkout' | 'tracker' | 'profile' | 'driver'
  >('catalog');
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

  const handleUpdateQuantity = (productId: string, unit: string, delta: number) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product._id === productId && item.unit === unit
      );
      if (existingIdx === -1) return prev;
      const current = prev[existingIdx];
      const newQty = current.quantity + delta;
      if (newQty <= 0) {
        // Remove item from cart if reduced to 0
        return prev.filter((_, idx) => idx !== existingIdx);
      }
      const updated = [...prev];
      updated[existingIdx] = { ...current, quantity: newQty };
      return updated;
    });
  };

  const handleRemoveItem = (productId: string, unit: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product._id === productId && item.unit === unit)
      )
    );
  };

  const handleClearCart = () => {
    setCart([]);
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
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-surface-container-lowest/30 flex flex-col justify-between text-on-surface">
      {/* Desktop Responsive Header Bar (hidden on mobile, visible on md and up) */}
      <header className="hidden md:block sticky top-0 z-40 bg-surface/95 backdrop-blur-xl border-b border-surface-container shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('catalog')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition">
                <span className="material-symbols-outlined text-[24px]">egg</span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-base font-black text-primary tracking-tight">Ovovita</span>
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded-md">
                    Direct Farm
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant font-medium">
                  Morning Harvest Fresh Eggs
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Nav Links */}
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'catalog'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">egg</span>
              <span>Explore Eggs</span>
            </button>

            <button
              onClick={() => setActiveTab('cart')}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'cart' || activeTab === 'checkout'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              <span>Basket</span>
              {cartTotalCount > 0 && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    activeTab === 'cart' || activeTab === 'checkout'
                      ? 'bg-white text-primary'
                      : 'bg-primary text-white'
                  }`}
                >
                  {cartTotalCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tracker')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'tracker'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">near_me</span>
              <span>Live Tracker</span>
            </button>

            <button
              onClick={() => setActiveTab('driver')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'driver'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-secondary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">moped</span>
              <span>Driver POS</span>
            </button>
          </nav>

          {/* User Account Capsule */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition ${
                activeTab === 'profile'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-surface-container hover:bg-surface-container text-on-surface'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                {user.name?.[0] || 'U'}
              </div>
              <span className="text-xs font-bold truncate max-w-[100px]">{user.name}</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/40 transition"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center w-full">
        {activeTab === 'catalog' && (
          <CatalogScreen
            products={products}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setActiveTab('cart')}
            cartCount={cartTotalCount}
            cart={cart}
          />
        )}

        {activeTab === 'cart' && (
          <CartScreen
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onContinueShopping={() => setActiveTab('catalog')}
            onProceedToCheckout={() => setActiveTab('checkout')}
            products={products}
            onAddToCart={handleAddToCart}
          />
        )}

        {activeTab === 'checkout' && (
          <CheckoutScreen
            cart={cart}
            user={user}
            onUpdateUser={handleUpdateUser}
            onPlaceOrder={handlePlaceOrder}
            onBack={() => setActiveTab('cart')}
            onClearCart={handleClearCart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
          />
        )}

        {activeTab === 'tracker' && (
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
            <TrackerScreen
              orderId={placedOrderId}
              onExploreMore={() => setActiveTab('catalog')}
            />
          </div>
        )}

        {activeTab === 'driver' && (
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
            <DriverModeScreen user={user} onLogout={handleLogout} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
            <ProfileScreen
              user={user}
              onUpdateUser={handleUpdateUser}
              onLogout={handleLogout}
              onReorder={handleReorder}
            />
          </div>
        )}
      </div>

      {/* Bottom Navigation for Mobile Devices */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        cartCount={cartTotalCount}
        userRole={user?.role}
      />
    </div>
  );
};
