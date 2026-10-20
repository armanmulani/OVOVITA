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
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  cart,
  user,
  onUpdateUser,
  onPlaceOrder,
  onBack,
  onClearCart,
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
      const match = user.savedAddresses.find((a: any) => a.id === selectedAddress?.id) ||
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
    <div className="flex-1 flex flex-col pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-4 py-3 border-b border-surface-container shadow-sm flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-variant transition"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Cart & Checkout</span>
          <h2 className="text-base font-bold text-on-surface">Pay-on-Delivery Order</h2>
        </div>
      </header>

      {/* Reserved Batches Banner */}
      <div className="px-4 py-2.5 bg-secondary-container text-on-secondary-container flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span>Fresh Crates Reserved from Hatchery</span>
        </div>
        <span className="text-[11px] bg-surface-container-lowest/80 px-2 py-0.5 rounded-full font-bold">
          Zero-Crack Guarantee
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Delivery Address Card with Change / Edit Trigger */}
        <div className="bg-surface-container-low rounded-2xl p-3.5 border border-surface-container shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary mt-0.5 shrink-0">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
              </div>
              <div>
                <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span>{selectedAddress?.recipientName}</span>
                  <span className="text-on-surface-variant font-normal">
                    • {selectedAddress?.phoneNumber}
                  </span>
                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold uppercase">
                    {selectedAddress?.tag || 'HOME'}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                  {selectedAddress?.flatPlotNumber}
                  {selectedAddress?.apartmentName ? `, ${selectedAddress.apartmentName}` : ''}
                  , {selectedAddress?.streetName}
                  {selectedAddress?.landmark ? `, Near ${selectedAddress.landmark}` : ''}
                  , {selectedAddress?.city || 'Bengaluru'} - {selectedAddress?.pincode}
                </p>
                {selectedAddress?.gateSecurityInstructions && (
                  <p className="text-[10px] text-outline mt-1 italic">
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
              className="text-xs font-bold text-primary bg-surface hover:bg-surface-variant px-2.5 py-1 rounded-lg border border-surface-container transition"
            >
              Change
            </button>
          </div>
        </div>

        {/* Servicing Depot Hub & Dynamic ETA Badge */}
        <div className="bg-surface-container-low rounded-xl p-2.5 border border-surface-container flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-secondary/15 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[15px]">electric_moped</span>
            </div>
            <div>
              <span className="font-bold text-on-surface">
                Serviced by {coverageData?.depot?.name || 'Depot Hub • Koramangala'}
              </span>
              <span className="text-[10px] text-on-surface-variant block">
                {coverageData?.distanceKm !== undefined
                  ? `${coverageData.distanceKm} km away • Cold-room dispatch`
                  : 'Direct from hyper-local cold storage'}
              </span>
            </div>
          </div>
          <span className="bg-secondary/15 text-secondary font-extrabold text-[11px] px-2 py-0.5 rounded-full">
            ⚡ {coverageData?.estimatedEtaText || '15-25m ETA'}
          </span>
        </div>

        {/* Slot Selector */}
        <div>
          <label className="text-xs font-bold text-on-surface block mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
            <span>Delivery Slot (Tomorrow Morning)</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
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
        <div>
          <label className="text-xs font-bold text-on-surface block mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-primary">payments</span>
            <span>Pay on Delivery Guarantee</span>
          </label>
          <div className="space-y-2">
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
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
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
                className="material-symbols-outlined text-[18px] text-secondary"
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
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white">
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
                className="material-symbols-outlined text-[18px] text-primary"
                style={paymentMethod === 'CASH_ON_DELIVERY' ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {paymentMethod === 'CASH_ON_DELIVERY' ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </button>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Order Bill Summary
          </h4>

          <div className="flex justify-between text-xs text-on-surface">
            <span>Fresh Eggs Subtotal ({cart.length} item{cart.length > 1 ? 's' : ''})</span>
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

          <div className="pt-2 border-t border-surface-container flex justify-between items-baseline">
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
            {isPlacing ? 'Locking Fresh Batches...' : `Place Pay-on-Delivery Order • ₹${totalAmount}`}
          </span>
        </button>
      </div>

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
                    <p className="text-xs text-on-surface-variant leading-snug">
                      {addr.flatPlotNumber}, {addr.apartmentName ? `${addr.apartmentName}, ` : ''}
                      {addr.streetName}, {addr.city} - {addr.pincode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddressToEdit(addr);
                      setIsAddressModalOpen(true);
                      setIsAddressListOpen(false);
                    }}
                    className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-outline hover:text-primary transition shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setAddressToEdit(null);
                setIsAddressModalOpen(true);
                setIsAddressListOpen(false);
              }}
              className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl border border-primary/30 flex items-center justify-center gap-1.5 transition"
            >
              <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
              <span>+ Add New Address</span>
            </button>
          </div>
        </div>
      )}

      {/* Address Edit / Add Modal */}
      <AddressEditModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        initialAddress={addressToEdit}
        onSave={handleSaveAddress}
        defaultName={user?.name || ''}
        defaultPhone={user?.phoneNumber || ''}
      />
    </div>
  );
};
