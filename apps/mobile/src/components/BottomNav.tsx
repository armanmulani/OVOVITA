import React from 'react';

interface BottomNavProps {
  activeTab: 'catalog' | 'cart' | 'tracker' | 'profile' | 'driver';
  onTabChange: (tab: 'catalog' | 'cart' | 'tracker' | 'profile' | 'driver') => void;
  cartCount: number;
  userRole?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  cartCount,
  userRole,
}) => {
  return (
    <nav className="sticky bottom-0 inset-x-0 bg-surface/95 backdrop-blur-xl border-t border-surface-container-high px-4 py-2 flex items-center justify-around z-40 shadow-lg">
      <button
        onClick={() => onTabChange('catalog')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
          activeTab === 'catalog' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={activeTab === 'catalog' ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          egg
        </span>
        <span className="text-[11px]">Explore</span>
      </button>

      <button
        onClick={() => onTabChange('cart')}
        className={`relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
          activeTab === 'cart' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={activeTab === 'cart' ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          shopping_bag
        </span>
        {cartCount > 0 && (
          <span className="absolute -top-0.5 right-1.5 w-4 h-4 bg-primary text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-bounce">
            {cartCount}
          </span>
        )}
        <span className="text-[11px]">Cart</span>
      </button>

      <button
        onClick={() => onTabChange('tracker')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
          activeTab === 'tracker' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={activeTab === 'tracker' ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          near_me
        </span>
        <span className="text-[11px]">Track</span>
      </button>

      <button
        onClick={() => onTabChange('profile')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
          activeTab === 'profile' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={activeTab === 'profile' ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          person
        </span>
        <span className="text-[11px]">Profile</span>
      </button>

      {/* Driver Run-Sheet Mode shortcut */}
      <button
        onClick={() => onTabChange('driver')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
          activeTab === 'driver' ? 'text-secondary font-bold' : 'text-on-surface-variant hover:text-secondary'
        }`}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={activeTab === 'driver' ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          moped
        </span>
        <span className="text-[11px]">Driver POS</span>
      </button>
    </nav>
  );
};
