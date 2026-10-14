import React, { useState } from 'react';

interface CheckoutScreenProps {
  cart: Array<{
    product: any;
    unit: 'SINGLE' | 'DOZEN' | 'TRAY_30';
    quantity: number;
  }>;
  onPlaceOrder: (orderPayload: any) => Promise<any>;
  onBack: () => void;
  onClearCart: () => void;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  cart,
  onPlaceOrder,
  onBack,
  onClearCart,
}) => {
  const [slot, setSlot] = useState<'MORNING_RUSH' | 'EVENING_DROP'>('MORNING_RUSH');
  const [paymentMethod, setPaymentMethod] = useState<'UPI_ON_DELIVERY' | 'CASH_ON_DELIVERY'>('UPI_ON_DELIVERY');
  const [isPlacing, setIsPlacing] = useState(false);

  // Bill calculation
  const subtotal = cart.reduce((sum, item) => {
    const config = item.product.unitPricing?.find((u: any) => u.unit === item.unit);
    return sum + (config?.price || 0) * item.quantity;
  }, 0);

  const deliveryCharge = subtotal >= 250 ? 0 : 30;
  const packagingCharge = 0; // Free shock-proof pulp tray
  const totalAmount = subtotal + deliveryCharge + packagingCharge;

  const handleConfirm = async () => {
    if (cart.length === 0) return;
    setIsPlacing(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        deliveryAddress: {
          tag: 'HOME',
          recipientName: 'Rahul Sharma',
          phoneNumber: '9876543210',
          flatPlotNumber: 'Flat 402',
          apartmentName: 'Silver Oak Heights',
          streetName: '5th Main, 4th Block, Koramangala',
          pincode: '560034',
          city: 'Bengaluru',
          isDefault: true,
        },
        deliverySlot: slot,
        scheduledDeliveryDate: today,
        paymentMethod,
        items: cart.map((i) => ({
          productId: i.product._id,
          unit: i.unit,
          quantity: i.quantity,
        })),
        morningHarvestNotes: 'Please ring bell and leave with security if unreachable',
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
        {/* Delivery Address Card */}
        <div className="bg-surface-container-low rounded-2xl p-3.5 border border-surface-container shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary mt-0.5 shrink-0">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
              </div>
              <div>
                <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span>Rahul Sharma</span>
                  <span className="text-on-surface-variant font-normal">• 98765 43210</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                  Flat 402, Silver Oak Heights, 5th Main, Koramangala, Bengaluru - 560034
                </p>
              </div>
            </div>
            <button className="text-xs font-bold text-primary bg-surface px-2 py-1 rounded-lg">
              Change
            </button>
          </div>
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
            <span>Pay on Delivery (Doorstep Verification)</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('UPI_ON_DELIVERY')}
              className={`p-3 rounded-xl text-left border transition ${
                paymentMethod === 'UPI_ON_DELIVERY'
                  ? 'bg-secondary-container/40 border-secondary shadow-sm text-on-surface'
                  : 'bg-surface-container-low border-surface-container text-on-surface-variant'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-secondary">Doorstep UPI QR</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">qr_code_scanner</span>
              </div>
              <div className="text-xs font-bold text-on-surface">Scan & Pay</div>
              <div className="text-[10px] text-on-surface-variant mt-0.5">GPay, PhonePe, Paytm</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
              className={`p-3 rounded-xl text-left border transition ${
                paymentMethod === 'CASH_ON_DELIVERY'
                  ? 'bg-primary-fixed/40 border-primary shadow-sm text-on-surface'
                  : 'bg-surface-container-low border-surface-container text-on-surface-variant'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-primary">Cash on Delivery</span>
                <span className="material-symbols-outlined text-[16px] text-primary">local_atm</span>
              </div>
              <div className="text-xs font-bold text-on-surface">Exact Currency</div>
              <div className="text-[10px] text-on-surface-variant mt-0.5">Hand physical cash</div>
            </button>
          </div>
        </div>

        {/* Zero-Crack Doorstep Inspection Contract */}
        <div className="p-3 bg-primary-fixed/20 rounded-xl border border-primary/20 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
            verified_user
          </span>
          <div className="text-xs">
            <strong className="text-primary font-bold">Zero-Crack Inspection Contract:</strong>
            <p className="text-on-surface-variant mt-0.5">
              Open and inspect your shock-proof molded tray with the delivery executive. If any egg is cracked, the driver will replace it on the spot or markdown the bill instantly!
            </p>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-surface-container-low rounded-2xl p-3.5 border border-surface-container space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Item Subtotal:</span>
            <span className="font-bold text-on-surface">₹{subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Shock-Proof Molded Pulp Tray:</span>
            <span className="font-bold text-secondary">FREE (₹0)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Delivery Fee:</span>
            <span className="font-bold text-on-surface">
              {deliveryCharge === 0 ? <strong className="text-secondary">FREE</strong> : `₹${deliveryCharge}`}
            </span>
          </div>
          <div className="pt-2 border-t border-surface-container-high flex justify-between text-sm font-extrabold">
            <span className="text-on-surface">Payable on Delivery:</span>
            <span className="text-primary">₹{totalAmount}</span>
          </div>
        </div>

        {/* Submit CTA */}
        <button
          onClick={handleConfirm}
          disabled={isPlacing || cart.length === 0}
          className="w-full py-3 bg-primary hover:bg-primary-container text-white text-sm font-extrabold rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">task_alt</span>
          <span>{isPlacing ? 'Locking Stock & Placing...' : `Confirm Order • ₹${totalAmount}`}</span>
        </button>
      </div>
    </div>
  );
};
