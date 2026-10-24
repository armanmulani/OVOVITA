import React, { useState } from 'react';

export interface CartItem {
  product: any;
  unit: 'SINGLE' | 'DOZEN' | 'TRAY_30';
  quantity: number;
}

interface CartScreenProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, unit: string, delta: number) => void;
  onRemoveItem: (productId: string, unit: string) => void;
  onClearCart: () => void;
  onContinueShopping: () => void;
  onProceedToCheckout: () => void;
  products: any[];
  onAddToCart: (product: any, unit: 'SINGLE' | 'DOZEN' | 'TRAY_30', qty: number) => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onContinueShopping,
  onProceedToCheckout,
  products,
  onAddToCart,
}) => {
  const [activeTab, setActiveTab] = useState<'cart' | 'catalog'>('cart');

  const subtotal = cart.reduce((sum, item) => {
    const config = item.product.unitPricing?.find((u: any) => u.unit === item.unit);
    return sum + (config?.price || 0) * item.quantity;
  }, 0);

  const deliveryCharge = subtotal >= 250 ? 0 : 30;
  const total = subtotal + deliveryCharge;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'SINGLE': return 'Single Egg';
      case 'DOZEN': return 'Dozen (12 Eggs)';
      case 'TRAY_30': return 'Tray (30 Eggs)';
      default: return unit;
    }
  };

  const getItemPrice = (item: CartItem) => {
    const config = item.product.unitPricing?.find((u: any) => u.unit === item.unit);
    return config?.price || 0;
  };

  const getItemTotal = (item: CartItem) => {
    return getItemPrice(item) * item.quantity;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-4 py-3 border-b border-surface-container shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onContinueShopping}
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-variant transition"
              title="Return to Catalog"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Your Harvest Basket</span>
              <h2 className="text-base font-bold text-on-surface">
                {totalItems} item{totalItems !== 1 ? 's' : ''} • ₹{subtotal.toFixed(0)}
              </h2>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs font-bold text-error bg-error-container/60 hover:bg-error-container px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span>Clear Cart</span>
            </button>
          )}
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="bg-surface-container-high border-b border-surface-container px-4 py-2">
        <div className="max-w-5xl mx-auto flex gap-2">
          <button
            onClick={() => setActiveTab('cart')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'cart'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface bg-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
            Cart Items ({cart.length})
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'catalog'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface bg-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Add More Eggs
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto w-full px-4 py-5 flex-1">
        {activeTab === 'cart' ? (
          cart.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-3xl border border-surface-container p-8 text-center max-w-md mx-auto my-8 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <span className="material-symbols-outlined text-[42px]">shopping_cart</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-1">Your cart is empty</h3>
              <p className="text-xs text-on-surface-variant mb-6">
                Add fresh morning harvest eggs to start your order!
              </p>
              <button
                onClick={onContinueShopping}
                className="w-full py-3 bg-primary hover:bg-primary-container text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">storefront</span>
                <span>Browse Egg Catalog</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Cart Items List (lg:col-span-7) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-on-surface-variant">
                    Selected Crates ({totalItems})
                  </h3>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                  >
                    <span>+ Add items</span>
                  </button>
                </div>

                {cart.map((item, idx) => (
                  <div
                    key={`${item.product._id}-${item.unit}-${idx}`}
                    className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm p-3.5 flex items-center gap-3.5 hover:border-outline-variant/40 transition"
                  >
                    <img
                      src={item.product.heroImageUrl}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-surface-container"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-on-surface truncate">
                            {item.product.name}
                          </h4>
                          <p className="text-[11px] text-on-surface-variant">
                            {getUnitLabel(item.unit)} • ₹{getItemPrice(item)} each
                          </p>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.product._id, item.unit)}
                          className="w-7 h-7 rounded-lg bg-error-container/60 hover:bg-error-container text-error flex items-center justify-center transition shrink-0"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2.5">
                        {/* Quantity Stepper */}
                        <div className="flex items-center bg-surface-container-high rounded-full p-0.5 border border-surface-container">
                          <button
                            onClick={() => onUpdateQuantity(item.product._id, item.unit, -1)}
                            className="w-7 h-7 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center font-bold hover:bg-surface transition shadow-xs"
                            title="Decrease quantity"
                          >
                            <span className="material-symbols-outlined text-[14px]">remove</span>
                          </button>
                          <span className="w-8 text-center text-xs font-extrabold text-on-surface">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product._id, item.unit, 1)}
                            className="w-7 h-7 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center font-bold hover:bg-surface transition shadow-xs"
                            title="Increase quantity"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                          </button>
                        </div>

                        <span className="text-base font-extrabold text-primary">
                          ₹{getItemTotal(item).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Order Bill Summary & Checkout CTA (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
                <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Basket Summary
                  </h4>

                  <div className="flex justify-between text-xs text-on-surface">
                    <span>Subtotal ({totalItems} items)</span>
                    <span className="font-semibold">₹{subtotal.toFixed(0)}</span>
                  </div>

                  <div className="flex justify-between text-xs text-on-surface">
                    <span>Morning Delivery</span>
                    {deliveryCharge === 0 ? (
                      <span className="text-secondary font-bold">FREE</span>
                    ) : (
                      <span className="font-semibold">₹{deliveryCharge}</span>
                    )}
                  </div>

                  {subtotal < 250 ? (
                    <div className="text-[11px] text-secondary bg-secondary-container/50 px-3 py-2 rounded-xl flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                      <span>Add ₹{(250 - subtotal).toFixed(0)} more for FREE morning delivery!</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-secondary bg-secondary-container/40 px-3 py-2 rounded-xl flex items-center gap-1.5 font-semibold">
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      <span>Eligible for Free Morning Delivery</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-surface-container flex justify-between items-baseline">
                    <span className="text-sm font-extrabold text-on-surface">Total Payable</span>
                    <span className="text-xl font-extrabold text-primary">₹{total.toFixed(0)}</span>
                  </div>

                  <button
                    onClick={onProceedToCheckout}
                    className="w-full py-3.5 bg-primary hover:bg-primary-container text-white text-sm font-extrabold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
                    <span>Proceed to Checkout • ₹{total.toFixed(0)}</span>
                  </button>

                  <p className="text-center text-[10px] text-on-surface-variant">
                    Pay on delivery via Cash or Doorstep UPI QR.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          /* Quick Add from Catalog Tab */
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-on-surface">Quick Add More Fresh Eggs</h3>
              <button
                onClick={() => setActiveTab('cart')}
                className="text-xs font-bold text-primary hover:underline"
              >
                Back to Cart ({cart.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((product) => {
                const inCart = cart.find((c) => c.product._id === product._id);
                const defaultPricing = product.unitPricing?.[product.unitPricing.length - 1];

                return (
                  <div
                    key={product._id}
                    className="bg-surface-container-lowest rounded-2xl border border-surface-container p-3.5 flex items-center gap-3 shadow-xs hover:border-primary/40 transition"
                  >
                    <img
                      src={product.heroImageUrl}
                      alt={product.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-surface-container"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-on-surface truncate">{product.name}</h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {defaultPricing?.label} • ₹{defaultPricing?.price}
                      </p>
                      {inCart && (
                        <span className="text-[10px] text-primary font-extrabold block mt-0.5">
                          ✓ {inCart.quantity} in cart
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onAddToCart(product, defaultPricing?.unit || 'TRAY_30', 1)}
                      className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white hover:bg-primary-container shadow-sm transition shrink-0"
                      title="Add one crate to cart"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};