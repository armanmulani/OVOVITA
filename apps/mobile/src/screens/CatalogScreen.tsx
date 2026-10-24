import React, { useState } from 'react';

interface CatalogScreenProps {
  products: any[];
  onAddToCart: (product: any, unit: 'SINGLE' | 'DOZEN' | 'TRAY_30', qty: number) => void;
  onOpenCart: () => void;
  cartCount: number;
  cart?: Array<{ product: any; unit: string; quantity: number }>;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({
  products,
  onAddToCart,
  onOpenCart,
  cartCount,
  cart = [],
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedUnits, setSelectedUnits] = useState<Record<string, 'SINGLE' | 'DOZEN' | 'TRAY_30'>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const categories = [
    { id: 'ALL', label: 'All Eggs', icon: 'egg' },
    { id: 'WHITE', label: 'Classic White' },
    { id: 'BROWN', label: 'Farm Brown' },
    { id: 'DESI', label: 'Free Range Desi' },
    { id: 'ORGANIC', label: 'Organic Omega-3' },
  ];

  const filteredProducts =
    selectedCategory === 'ALL'
      ? products
      : products.filter((p) => p.type === selectedCategory);

  const getSelectedUnit = (productId: string, defaultUnit: 'SINGLE' | 'DOZEN' | 'TRAY_30' = 'TRAY_30') => {
    return selectedUnits[productId] || defaultUnit;
  };

  const getQty = (productId: string) => quantities[productId] || 1;

  const handleUnitSelect = (productId: string, unit: 'SINGLE' | 'DOZEN' | 'TRAY_30') => {
    setSelectedUnits((prev) => ({ ...prev, [productId]: unit }));
  };

  const handleQtyChange = (productId: string, delta: number) => {
    const cur = getQty(productId);
    const next = Math.max(1, cur + delta);
    setQuantities((prev) => ({ ...prev, [productId]: next }));
  };

  const getInCartCount = (productId: string, unit: string) => {
    const item = cart.find(
      (c) => c.product?._id === productId && c.unit === unit
    );
    return item ? item.quantity : 0;
  };

  return (
    <div className="flex-1 flex flex-col pb-8 w-full">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-4 py-3 border-b border-surface-container shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[20px]">egg</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs uppercase font-extrabold text-primary tracking-wider">Ovovita</span>
                <span className="material-symbols-outlined text-primary text-[14px]">verified</span>
              </div>
              <div className="text-sm font-bold text-on-surface flex items-center gap-0.5">
                <span>Morning Farm Harvest</span>
                <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenCart}
            className="relative px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-container shadow-sm flex items-center gap-2 transition"
            title="Open Harvest Basket"
          >
            <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
            <span className="text-xs font-extrabold hidden sm:inline">Basket</span>
            {cartCount > 0 && (
              <span className="w-5 h-5 bg-white text-primary text-[11px] font-black rounded-full flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Delivery Notification Ribbon */}
      <div className="bg-surface-container-high py-2 px-4 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-on-surface">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="material-symbols-outlined text-primary text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            <span className="truncate">
              <strong>Morning Delivery:</strong> Direct from farm cold room to Koramangala
            </span>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 rounded-full font-bold text-secondary text-[11px] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span>15-30m Slot</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full">
        {/* Morning Harvest Announcement Banner */}
        <div className="p-4 pb-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-fixed to-surface-container-highest p-4 shadow-sm text-on-primary-fixed">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow">
                <span className="material-symbols-outlined text-[24px]">nest_eco_leaf</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5 flex-wrap">
                  <span className="text-xs uppercase tracking-wide text-primary font-extrabold flex items-center gap-1">
                    Morning Harvest Freshness Guarantee
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                  </span>
                  <span className="text-[10px] bg-surface-container-lowest/90 text-secondary font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">payments</span> Pay After Unboxing
                  </span>
                </div>
                <p className="text-xs text-on-primary-fixed-variant leading-tight mt-1">
                  Candling-tested fresh eggs delivered in shock-absorbing molded pulp trays. Inspect before paying!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Chips Scroll */}
        <div className="py-2 px-4 overflow-x-auto flex items-center gap-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container hover:bg-surface-variant text-on-surface'
              }`}
            >
              {cat.icon && <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Product Cards Grid: 1 col on mobile, 2 cols on tablet, 3 cols on desktop */}
        <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {filteredProducts.map((product) => {
            const selectedUnit = getSelectedUnit(product._id);
            const currentUnitConfig =
              product.unitPricing?.find((u: any) => u.unit === selectedUnit) ||
              product.unitPricing?.[product.unitPricing?.length - 1];
            const qty = getQty(product._id);
            const price = (currentUnitConfig?.price || 0) * qty;
            const inCartQty = getInCartCount(product._id, selectedUnit);

            return (
              <div
                key={product._id}
                className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm p-4 flex flex-col justify-between gap-3 hover:border-outline-variant/60 transition group"
              >
                {/* Product Info */}
                <div>
                  <div className="flex gap-3">
                    <img
                      src={product.heroImageUrl}
                      alt={product.name}
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-surface-container group-hover:scale-102 transition"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.2 rounded-full font-bold">
                          Candling Passed
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-medium truncate">
                          {product.farmOriginName}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-on-surface leading-tight mt-1 truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
                        {product.description}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-primary font-semibold">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        <span>{product.laidTimestampText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tactile Unit Selector */}
                  <div className="grid grid-cols-3 gap-1.5 mt-3">
                    {(product.unitPricing || []).map((tier: any) => {
                      const isSelected = selectedUnit === tier.unit;
                      return (
                        <button
                          key={tier.unit}
                          type="button"
                          onClick={() => handleUnitSelect(product._id, tier.unit)}
                          className={`p-2 rounded-xl text-center border transition ${
                            isSelected
                              ? 'bg-primary-fixed/50 border-primary shadow-sm text-primary font-bold'
                              : 'bg-surface-container-low border-surface-container text-on-surface hover:border-outline-variant/50'
                          }`}
                        >
                          <div className="text-[10px] font-bold leading-tight">{tier.label}</div>
                          <div className="text-xs font-extrabold mt-0.5">₹{tier.price}</div>
                          {tier.savingsPercent ? (
                            <div className="text-[9px] text-secondary font-bold">
                              Save {tier.savingsPercent}%
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Bar: Stepper & Add to Basket */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                  {/* Stepper */}
                  <div className="flex items-center bg-surface-container rounded-full p-0.5 border border-surface-container-high">
                    <button
                      onClick={() => handleQtyChange(product._id, -1)}
                      className="w-7 h-7 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center font-bold hover:bg-surface transition"
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-7 text-center text-xs font-extrabold text-on-surface">{qty}</span>
                    <button
                      onClick={() => handleQtyChange(product._id, 1)}
                      className="w-7 h-7 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center font-bold hover:bg-surface transition"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Add CTA */}
                  <button
                    onClick={() => onAddToCart(product, selectedUnit, qty)}
                    className="px-3.5 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                    <span>Add ₹{price}</span>
                    {inCartQty > 0 && (
                      <span className="ml-1 bg-white/25 text-[10px] px-1.5 py-0.2 rounded-full">
                        ({inCartQty})
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
