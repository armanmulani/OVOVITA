import React, { useState, useEffect } from 'react';
import { mobileApi } from '../api';
import { AddressEditModal, AddressData } from '../components/AddressEditModal';

interface CheckoutScreenProps {
  cart: Array<{
    product: any;
    unit: 'SINGLE' | 'DOZEN' | 'TRAY_30';
    quantity: number;
  }>;
  user?: any;
  onUpdateUser?: (updatedUser: any) => void;
  onPlaceOrder: (orderPayload: any) => Promise<any>;
  onBack: () => void;
  onClearCart: () => void;
  onUpdateQuantity?: (productId: string, unit: string, delta: number) => void;
  onRemoveItem?: (productId: string, unit: string) => void;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  cart,
  user,
  onUpdateUser,
  onPlaceOrder,
  onBack,
  onClearCart,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const [slot, setSlot] = useState<'MORNING_RUSH' | 'EVENING_DROP'>('MORNING_RUSH');
  const [paymentMethod, setPaymentMethod] = useState<'UPI_ON_DELIVERY' | 'CASH_ON_DELIVERY'>('UPI_ON_DELIVERY');
  const [isPlacing, setIsPlacing] = useState(false);

  // Fallback initial address if user has none saved yet
  const defaultFallback: AddressData = {
    tag: 'HOME',
    recipientName: user?.name || 'Rahul Sharma',
    phoneNumber: user?.phoneNumber || '9876543210',
    flatPlotNumber: 'Flat 402',
    apartmentName: 'Silver Oak Heights',
    streetName: '5th Main, 4th Block, Koramangala',
    landmark: 'Near Wipro Park',
    pincode: '560034',
    city: 'Bengaluru',
    gateSecurityInstructions: 'Leave with security guard if bell not answered',
    isDefault: true,
  };

  const [selectedAddress, setSelectedAddress] = useState<any>(
    user?.savedAddresses?.find((a: any) => a.isDefault) ||
      user?.savedAddresses?.[0] ||
      defaultFallback
  );

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAddressListOpen, setIsAddressListOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<AddressData | null>(null);
  const [coverageData, setCoverageData] = useState<any>(null);

  // Sync selectedAddress if user.savedAddresses changes
  useEffect(() => {
    if (user?.savedAddresses?.length > 0) {
      const match =
        user.savedAddresses.find((a: any) => a.id === selectedAddress?.id) ||
        user.savedAddresses.find((a: any) => a.isDefault) ||
        user.savedAddresses[0];
      setSelectedAddress(match);
    }
  }, [user]);

  // Check dynamic depot coverage and ETA for selected address
  useEffect(() => {
    if (selectedAddress?.pincode) {
      mobileApi
        .checkCoverage(
          selectedAddress.pincode,
          selectedAddress.longitude,
          selectedAddress.latitude
        )
        .then((res) => {
          if (res.data) setCoverageData(res.data);
        })
        .catch((err) => console.warn('Coverage check note:', err));
    }
  }, [selectedAddress]);

  // Bill calculation
  const subtotal = cart.reduce((sum, item) => {
    const config = item.product.unitPricing?.find((u: any) => u.unit === item.unit);
    return sum + (config?.price || 0) * item.quantity;
  }, 0);

  const deliveryCharge = subtotal >= 250 ? 0 : 30;
  const packagingCharge = 0; // Free shock-proof pulp tray
  const totalAmount = subtotal + deliveryCharge + packagingCharge;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'SINGLE': return 'Single Egg';
      case 'DOZEN': return 'Dozen (12 Eggs)';
      case 'TRAY_30': return 'Tray (30 Eggs)';
      default: return unit;
    }
  };

  const getItemPrice = (item: any) => {
    const config = item.product.unitPricing?.find((u: any) => u.unit === item.unit);
    return config?.price || 0;
  };

  const handleSaveAddress = async (addrData: AddressData) => {
    try {
      let updatedAddresses: any[];
      if (addrData.id) {
        const res = await mobileApi.updateAddress(addrData.id, addrData);
        updatedAddresses = res.data;
      } else {
        const res = await mobileApi.addAddress(addrData);
        updatedAddresses = res.data;
      }
      if (onUpdateUser) {
        onUpdateUser({ ...user, savedAddresses: updatedAddresses });
      }
      const chosen = addrData.id
        ? updatedAddresses.find((a: any) => a.id === addrData.id)
        : updatedAddresses[updatedAddresses.length - 1];
      setSelectedAddress(chosen || addrData);
      setIsAddressModalOpen(false);
      setIsAddressListOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save address to database');
      throw err;
    }
  };

  const handleConfirm = async () => {
    if (cart.length === 0) return;
    setIsPlacing(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        deliveryAddress: selectedAddress,
        deliverySlot: slot,
        scheduledDeliveryDate: today,
        paymentMethod,
        items: cart.map((i) => ({
          productId: i.product._id,
          unit: i.unit,
          quantity: i.quantity,
        })),
        morningHarvestNotes:
          selectedAddress?.gateSecurityInstructions ||
          'Please ring bell and leave with security if unreachable',
      };

      const res = await onPlaceOrder(payload);
      onClearCart();
      return res;
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setIsPlacing(false);
    }
  };

  const savedList = user?.savedAddresses || [];

  return (
    <div className="flex-1 flex flex-col pb-12 w-full">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-4 py-3 border-b border-surface-container shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-variant transition"
              title="Return to Catalog"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Cart & Checkout</span>
              <h2 className="text-base font-bold text-on-surface">Pay-on-Delivery Order</h2>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs font-bold text-error bg-error-container/60 hover:bg-error-container px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span className="hidden sm:inline">Empty Cart</span>
            </button>
          )}
        </div>
      </header>

      {/* Reserved Batches Banner */}
      <div className="bg-secondary-container text-on-secondary-container py-2.5 px-4 shadow-inner">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span>Fresh Crates Reserved from Morning Harvest</span>
          </div>
          <span className="text-[11px] bg-surface-container-lowest/80 px-2 py-0.5 rounded-full font-bold">
            Zero-Crack Guarantee
          </span>
        </div>
      </div>

      {/* Main Content Area - Responsive 2-Column Grid on Desktop */}
      <main className="max-w-5xl mx-auto w-full px-4 py-5 flex-1">
        {cart.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl border border-surface-container p-8 text-center max-w-md mx-auto my-8 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
              <span className="material-symbols-outlined text-[42px]">shopping_cart</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-1">Your cart is empty</h3>
            <p className="text-xs text-on-surface-variant mb-6">
              You removed all items from your cart. Browse our fresh farm harvest to add eggs!
            </p>
            <button
              onClick={onBack}
              className="w-full py-3 bg-primary hover:bg-primary-container text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">storefront</span>
              <span>Browse Fresh Eggs</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Cart Items & Delivery Details (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Cart Items List with Quantity Controls */}
              <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm p-4">
                <div className="flex items-center justify-between pb-3 border-b border-surface-container mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">shopping_basket</span>
                    <h3 className="text-sm font-extrabold text-on-surface">
                      Items in Cart ({totalItemsCount})
                    </h3>
                  </div>
                  <button
                    onClick={onBack}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                  >
                    <span>+ Add More</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {cart.map((item, idx) => {
                    const price = getItemPrice(item);
                    const itemTotal = price * item.quantity;

                    return (
                      <div
                        key={`${item.product._id}-${item.unit}-${idx}`}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-surface border border-surface-container hover:border-outline-variant/40 transition"
                      >
                        <img
                          src={item.product.heroImageUrl}
                          alt={item.product.name}
                          className="w-14 h-14 rounded-lg object-cover shrink-0 border border-surface-container"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-on-surface truncate">
                            {item.product.name}
                          </h4>
                          <p className="text-[11px] text-on-surface-variant font-medium">
                            {getUnitLabel(item.unit)} • ₹{price} each
                          </p>
                          <div className="text-xs font-extrabold text-primary mt-0.5">
                            ₹{itemTotal.toFixed(0)}
                          </div>
                        </div>

                        {/* Interactive Quantity Stepper */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-surface-container-high rounded-lg p-0.5 border border-surface-container">
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateQuantity) {
                                  onUpdateQuantity(item.product._id, item.unit, -1);
                                }
                              }}
                              className="w-6 h-6 rounded-md bg-surface text-on-surface flex items-center justify-center hover:bg-surface-container transition"
                              title="Decrease Quantity"
                            >
                              <span className="material-symbols-outlined text-[13px]">remove</span>
                            </button>
                            <span className="w-7 text-center text-xs font-extrabold text-on-surface">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateQuantity) {
                                  onUpdateQuantity(item.product._id, item.unit, 1);
                                }
                              }}
                              className="w-6 h-6 rounded-md bg-surface text-on-surface flex items-center justify-center hover:bg-surface-container transition"
                              title="Increase Quantity"
                            >
                              <span className="material-symbols-outlined text-[13px]">add</span>
                            </button>
                          </div>

                          {onRemoveItem && (
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.product._id, item.unit)}
                              className="w-7 h-7 rounded-lg bg-error-container/50 text-error flex items-center justify-center hover:bg-error-container transition"
                              title="Remove item from cart"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Address Card with Change / Edit Trigger */}
              <div className="bg-surface-container-low rounded-2xl p-4 border border-surface-container shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary mt-0.5 shrink-0">
                      <span className="material-symbols-outlined text-[18px]">location_on</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface flex items-center gap-1.5 flex-wrap">
                        <span>{selectedAddress?.recipientName}</span>
                        <span className="text-on-surface-variant font-normal">
                          • {selectedAddress?.phoneNumber}
                        </span>
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold uppercase">
                          {selectedAddress?.tag || 'HOME'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                        {selectedAddress?.flatPlotNumber}
                        {selectedAddress?.apartmentName ? `, ${selectedAddress.apartmentName}` : ''}
                        , {selectedAddress?.streetName}
                        {selectedAddress?.landmark ? `, Near ${selectedAddress.landmark}` : ''}
                        , {selectedAddress?.city || 'Bengaluru'} - {selectedAddress?.pincode}
                      </p>
                      {selectedAddress?.gateSecurityInstructions && (
                        <p className="text-[10px] text-outline mt-1.5 italic">
                          Note: {selectedAddress.gateSecurityInstructions}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (savedList.length > 1) {
                        setIsAddressListOpen(true);
                      } else {
                        setAddressToEdit(selectedAddress);
                        setIsAddressModalOpen(true);
                      }
                    }}
                    className="text-xs font-bold text-primary bg-surface hover:bg-surface-variant px-3 py-1.5 rounded-lg border border-surface-container transition shrink-0"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Slot Selector */}
              <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4 shadow-sm">
                <label className="text-xs font-bold text-on-surface block mb-2.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                  <span>Delivery Slot (Tomorrow Morning)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSlot('MORNING_RUSH')}
                    className={`p-3 rounded-xl text-left border transition ${
                      slot === 'MORNING_RUSH'
                        ? 'bg-primary-fixed/40 border-primary shadow-sm text-on-surface'
                        : 'bg-surface-container-low border-surface-container text-on-surface-variant'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-primary">Morning Rush</span>
                      <span
                        className="material-symbols-outlined text-[16px] text-primary"
                        style={slot === 'MORNING_RUSH' ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        {slot === 'MORNING_RUSH' ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-on-surface">6:30 - 8:00 AM</div>
                    <div className="text-[10px] text-on-surface-variant mt-0.5">Laid at sunrise today</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSlot('EVENING_DROP')}
                    className={`p-3 rounded-xl text-left border transition ${
                      slot === 'EVENING_DROP'
                        ? 'bg-primary-fixed/40 border-primary shadow-sm text-on-surface'
                        : 'bg-surface-container-low border-surface-container text-on-surface-variant'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Evening Drop</span>
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={slot === 'EVENING_DROP' ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        {slot === 'EVENING_DROP' ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-on-surface">5:00 - 7:00 PM</div>
                    <div className="text-[10px] text-on-surface-variant mt-0.5">Farm chilled crates</div>
                  </button>
                </div>
              </div>

              {/* Pay-on-Delivery Payment Method Selection */}
              <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4 shadow-sm">
                <label className="text-xs font-bold text-on-surface block mb-2.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
                  <span>Pay on Delivery Guarantee</span>
                </label>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI_ON_DELIVERY')}
                    className={`w-full p-3 rounded-xl text-left border flex items-center justify-between transition ${
                      paymentMethod === 'UPI_ON_DELIVERY'
                        ? 'bg-secondary-container/40 border-secondary shadow-sm'
                        : 'bg-surface-container-low border-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-white shrink-0">
                        <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface flex items-center gap-1.5 flex-wrap">
                          <span>Doorstep Dynamic UPI QR</span>
                          <span className="text-[9px] bg-secondary text-white px-1.5 py-0.2 rounded font-extrabold">
                            RECOMMENDED
                          </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant">
                          Scan via GPay / PhonePe / Paytm after unboxing & inspection
                        </div>
                      </div>
                    </div>
                    <span
                      className="material-symbols-outlined text-[18px] text-secondary shrink-0"
                      style={paymentMethod === 'UPI_ON_DELIVERY' ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {paymentMethod === 'UPI_ON_DELIVERY' ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                    className={`w-full p-3 rounded-xl text-left border flex items-center justify-between transition ${
                      paymentMethod === 'CASH_ON_DELIVERY'
                        ? 'bg-primary-fixed/40 border-primary shadow-sm'
                        : 'bg-surface-container-low border-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
                        <span className="material-symbols-outlined text-[20px]">local_atm</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface">Cash on Delivery (Exact Change)</div>
                        <div className="text-[11px] text-on-surface-variant">
                          Pay physical cash to courier after checking eggs
                        </div>
                      </div>
                    </div>
                    <span
                      className="material-symbols-outlined text-[18px] text-primary shrink-0"
                      style={paymentMethod === 'CASH_ON_DELIVERY' ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {paymentMethod === 'CASH_ON_DELIVERY' ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Order Bill Summary & Place Order CTA (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
              {/* Servicing Depot Hub & Dynamic ETA Badge */}
              <div className="bg-surface-container-low rounded-xl p-3 border border-surface-container flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
                    <span className="material-symbols-outlined text-[16px]">electric_moped</span>
                  </div>
                  <div>
                    <span className="font-bold text-on-surface block">
                      Serviced by {coverageData?.depot?.name || 'Depot Hub • Koramangala'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant block">
                      {coverageData?.distanceKm !== undefined
                        ? `${coverageData.distanceKm} km away • Cold-room dispatch`
                        : 'Direct from hyper-local cold storage'}
                    </span>
                  </div>
                </div>
                <span className="bg-secondary/15 text-secondary font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shrink-0">
                  ⚡ {coverageData?.estimatedEtaText || '15-25m ETA'}
                </span>
              </div>

              {/* Bill Summary */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Order Bill Summary
                </h4>

                <div className="flex justify-between text-xs text-on-surface">
                  <span>Fresh Eggs Subtotal ({totalItemsCount} item{totalItemsCount !== 1 ? 's' : ''})</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xs text-on-surface">
                  <span>Shock-Proof Pulp Packaging</span>
                  <span className="text-secondary font-bold">FREE</span>
                </div>

                <div className="flex justify-between text-xs text-on-surface">
                  <span>Morning Farm Logistics</span>
                  {deliveryCharge === 0 ? (
                    <span className="text-secondary font-bold">FREE (Orders &gt; ₹250)</span>
                  ) : (
                    <span className="font-semibold">₹{deliveryCharge.toFixed(2)}</span>
                  )}
                </div>

                {subtotal < 250 && (
                  <div className="p-2 bg-secondary-container/40 rounded-lg text-[11px] text-secondary font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">info</span>
                    <span>Add ₹{(250 - subtotal).toFixed(0)} more for FREE morning delivery!</span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-surface-container flex justify-between items-baseline">
                  <div>
                    <div className="text-xs font-extrabold text-on-surface">Total Payable at Doorstep</div>
                    <div className="text-[10px] text-on-surface-variant">Inclusive of all farm gate taxes</div>
                  </div>
                  <div className="text-xl font-extrabold text-primary">₹{totalAmount.toFixed(2)}</div>
                </div>
              </div>

              {/* Confirm Order Button */}
              <button
                onClick={handleConfirm}
                disabled={isPlacing || cart.length === 0}
                className="w-full py-3.5 bg-primary hover:bg-primary-container text-white text-sm font-extrabold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">verified</span>
                <span>
                  {isPlacing ? 'Locking Fresh Batches...' : `Place Pay-on-Delivery Order • ₹${totalAmount.toFixed(0)}`}
                </span>
              </button>

              <div className="text-center text-[10px] text-on-surface-variant flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-secondary">verified_user</span>
                <span>Inspect eggs before payment. Free instant replacements for any cracks.</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Address Selection List Sheet */}
      {isAddressListOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl border border-surface-container-high max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-extrabold text-base text-on-surface">Select Delivery Address</h3>
              <button
                onClick={() => setIsAddressListOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {savedList.map((addr: any) => (
                <div
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddress(addr);
                    setIsAddressListOpen(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                    selectedAddress?.id === addr.id
                      ? 'bg-primary/5 border-primary shadow-sm'
                      : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-bold text-on-surface">{addr.recipientName}</span>
                      <span className="text-[9px] bg-primary-fixed text-on-primary-fixed px-1.5 py-0.2 rounded font-bold uppercase">
                        {addr.tag}
                      </span>
                    </div>
                    <div className="text-xs text-on-surface-variant truncate">
                      {addr.flatPlotNumber}, {addr.streetName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddressToEdit(addr);
                      setIsAddressModalOpen(true);
                    }}
                    className="text-xs font-semibold text-primary p-1 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setAddressToEdit(null);
                setIsAddressModalOpen(true);
              }}
              className="mt-2 w-full py-2.5 bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
              <span>Add New Address</span>
            </button>
          </div>
        </div>
      )}

      {/* Address Edit/Add Modal */}
      {isAddressModalOpen && (
        <AddressEditModal
          initialAddress={addressToEdit || undefined}
          isOpen={isAddressModalOpen}
          onClose={() => setIsAddressModalOpen(false)}
          onSave={handleSaveAddress}
        />
      )}
    </div>
  );
};
